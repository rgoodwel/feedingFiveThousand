import { supabase } from './supabase';
import { sampleProjects, type AgeGroup, type Project } from '../data/sampleData';

const STORAGE_KEY = 'feeding-five-thousand-projects';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Deterministic UUID for legacy ids such as "att-1" so repeated loads map to the same rows.
const legacyIdToUuid = (value: string) => {
  const seeds = [0x811c9dc5, 0x1b873593, 0xcc9e2d51, 0x85ebca6b]
  const parts = seeds.map((seed) => {
    let hash = seed
    for (let index = 0; index < value.length; index += 1) {
      hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193)
      hash ^= hash >>> 15
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
  })
  const hex = parts.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

const asUuid = (value: unknown) => {
  const id = String(value ?? '')
  if (!id) return crypto.randomUUID()
  return UUID_PATTERN.test(id) ? id : legacyIdToUuid(id)
}

// Database ids are uuid columns, so convert legacy ids (and the references to them) up front.
const migrateIds = (project: Record<string, any>): Record<string, any> => {
  const attendees = Array.isArray(project.attendees) ? project.attendees : []
  const meals = Array.isArray(project.meals) ? project.meals : []
  const attendeeIds = new Map<string, string>(attendees.map((a: Record<string, any>) => [String(a.id), asUuid(a.id)]))
  const mapAttendee = (value: unknown) => attendeeIds.get(String(value)) ?? String(value ?? '')
  return {
    ...project,
    id: asUuid(project.id),
    attendees: attendees.map((a: Record<string, any>) => ({ ...a, id: attendeeIds.get(String(a.id)) ?? asUuid(a.id) })),
    meals: meals.map((meal: Record<string, any>) => ({
      ...meal,
      id: asUuid(meal.id),
      assignedAttendeeIds: Array.isArray(meal.assignedAttendeeIds ?? meal.assigned_attendee_ids)
        ? (meal.assignedAttendeeIds ?? meal.assigned_attendee_ids).map(mapAttendee)
        : [],
      items: Array.isArray(meal.items)
        ? meal.items.map((item: Record<string, any>) => ({
            ...item,
            id: asUuid(item.id),
            personResponsible: mapAttendee(item.personResponsible ?? item.person_responsible ?? ''),
          }))
        : [],
    })),
  }
}

const normalizeProjectBase = (project: Record<string, any>): Project => ({
  id: String(project.id ?? crypto.randomUUID()),
  name: String(project.name ?? 'Untitled project'),
  description: String(project.description ?? ''),
  // visibility options are disabled for now: every event is public
  visibility: 'public',
  password: undefined,
  attendees:
    Array.isArray(project.attendees)
      ? project.attendees.map((attendee: Record<string, any>) => {
        // legacy rows only have a single `name`
        const [legacyFirst = 'Guest', ...legacyRest] = String(attendee.name ?? '').trim().split(/\s+/)
        const ageGroup = attendee.ageGroup ?? attendee.age_group
        return {
          id: String(attendee.id ?? crypto.randomUUID()),
          firstName: String(attendee.firstName ?? attendee.first_name ?? legacyFirst),
          lastName: String(attendee.lastName ?? attendee.last_name ?? legacyRest.join(' ')),
          ageGroup: (['toddler', 'kid', 'adult'].includes(ageGroup) ? ageGroup : 'adult') as AgeGroup,
          dietaryRestrictions: Array.isArray(attendee.dietaryRestrictions)
            ? attendee.dietaryRestrictions.map((item) => String(item))
            : Array.isArray(attendee.dietary_restrictions)
              ? attendee.dietary_restrictions.map((item: string) => String(item))
              : ['none'],
        }
      })
      : [],
  meals:
    Array.isArray(project.meals)
      ? project.meals.map((meal: Record<string, any>) => ({
          id: String(meal.id ?? crypto.randomUUID()),
          title: String(meal.title ?? 'Meal'),
          date: String(meal.date ?? new Date().toISOString().slice(0, 10)),
          startTime: String(meal.startTime ?? meal.start_time ?? '12:00').slice(0, 5),
          location: String(meal.location ?? ''),
          category: (meal.category as Project['meals'][number]['category']) ?? 'lunch',
          attendeeCount: Number(meal.attendeeCount ?? meal.attendee_count ?? 0),
          dietarySummary: String(meal.dietarySummary ?? meal.dietary_summary ?? ''),
          assignedAttendeeIds: Array.isArray(meal.assignedAttendeeIds ?? meal.assigned_attendee_ids)
            ? (meal.assignedAttendeeIds ?? meal.assigned_attendee_ids).map((item: string | number) => String(item))
            : [],
          items: Array.isArray(meal.items)
            ? meal.items.map((item: Record<string, any>) => ({
                id: String(item.id ?? crypto.randomUUID()),
                name: String(item.name ?? 'Food item'),
                description: String(item.description ?? ''),
                category: (item.category as Project['meals'][number]['items'][number]['category']) ?? 'main',
                personResponsible: String(item.personResponsible ?? item.person_responsible ?? ''),
              }))
            : [],
        }))
      : [],
});

// Responsible person is stored as an attendee id; legacy rows held a free-text name.
const normalizeProject = (project: Record<string, any>): Project => {
  const base = normalizeProjectBase(migrateIds(project));
  const resolve = (value: string) => {
    const match =
      base.attendees.find((a) => a.id === value) ??
      base.attendees.find((a) => value && [a.firstName, `${a.firstName} ${a.lastName}`].includes(value));
    return match?.id ?? '';
  };
  return {
    ...base,
    meals: base.meals.map((meal) => ({
      ...meal,
      attendeeCount: meal.assignedAttendeeIds.length,
      items: meal.items.map((item) => ({ ...item, personResponsible: resolve(item.personResponsible) })),
    })),
  };
};

export async function loadProjects(): Promise<Project[]> {
  if (supabase) {
    try {
      const { data: projectsData, error } = await supabase.from('projects').select('*');
      if (error) {
        console.warn('Supabase project load error:', error.message)
      }

      if (projectsData && projectsData.length > 0) {
        const projects = await Promise.all(
          projectsData.map(async (project) => {
            if (!supabase) return normalizeProject(project)

            const [attendeesResult, mealsResult, itemsResult] = await Promise.all([
              supabase.from('attendees').select('*').eq('project_id', project.id),
              supabase.from('meals').select('*').eq('project_id', project.id),
              supabase.from('meal_items').select('*'),
            ])

            const attendees = attendeesResult.data ?? []
            const meals = mealsResult.data ?? []
            const items = itemsResult.data ?? []

            return normalizeProject({
              ...project,
              attendees,
              meals: meals.map((meal) => ({
                ...meal,
                items: items.filter((item) => item.meal_id === meal.id),
              })),
            })
          }),
        )

        if (projects.length) {
          syncedIds = collectIds(projects)
          return projects
        }
      }
    } catch (error) {
      console.warn('Supabase load failed, falling back to local demo data.', error)
    }
  }

  try {
    const savedProjects = localStorage.getItem(STORAGE_KEY)
    return (savedProjects ? (JSON.parse(savedProjects) as Project[]) : sampleProjects).map(normalizeProject)
  } catch {
    return sampleProjects.map(normalizeProject)
  }
}

type SyncedIds = { projects: Set<string>; attendees: Set<string>; meals: Set<string>; items: Set<string> }

// Ids known to exist in Supabase; anything that later disappears from app state gets deleted there too.
let syncedIds: SyncedIds = { projects: new Set(), attendees: new Set(), meals: new Set(), items: new Set() }

const collectIds = (projects: Project[]): SyncedIds => ({
  projects: new Set(projects.map((project) => project.id)),
  attendees: new Set(projects.flatMap((project) => project.attendees.map((attendee) => attendee.id))),
  meals: new Set(projects.flatMap((project) => project.meals.map((meal) => meal.id))),
  items: new Set(projects.flatMap((project) => project.meals.flatMap((meal) => meal.items.map((item) => item.id)))),
})

const removedIds = (previous: Set<string>, current: Set<string>) => [...previous].filter((id) => !current.has(id))

let persistQueue: Promise<void> = Promise.resolve()

const report = (table: string, result: { error: { message: string } | null }) => {
  if (result.error) console.error(`Supabase save failed for ${table}:`, result.error.message)
}

export function persistProjects(projects: Project[]) {
  persistQueue = persistQueue.then(() => syncProjects(projects))
  return persistQueue
}

async function syncProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // no-op, browser storage may be unavailable
  }

  if (!supabase) return

  try {
    const currentIds = collectIds(projects)
    let deleteFailed = false

    // children first so removed guests/items are cleaned up even when their parent stays
    for (const [table, key] of [
      ['meal_items', 'items'],
      ['meals', 'meals'],
      ['attendees', 'attendees'],
      ['projects', 'projects'],
    ] as const) {
      const ids = removedIds(syncedIds[key], currentIds[key])
      if (!ids.length) continue
      const result = await supabase.from(table).delete().in('id', ids)
      if (result.error) deleteFailed = true
      report(table, result)
    }

    for (const project of projects) {
      const row = {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
        password_hash: project.password ? await hashPassword(project.password) : null,
        updated_at: new Date().toISOString(),
      }

      report('projects', await supabase.from('projects').upsert(row))

      const attendeeRows = project.attendees.map((attendee) => ({
        id: attendee.id,
        project_id: project.id,
        name: `${attendee.firstName} ${attendee.lastName}`.trim(),
        first_name: attendee.firstName,
        last_name: attendee.lastName,
        age_group: attendee.ageGroup,
        dietary_restrictions: attendee.dietaryRestrictions,
      }))
      report('attendees', await supabase.from('attendees').upsert(attendeeRows))

      for (const meal of project.meals) {
        const mealRow = {
          id: meal.id,
          project_id: project.id,
          title: meal.title,
          date: meal.date,
          start_time: meal.startTime,
          category: meal.category,
          attendee_count: meal.attendeeCount,
          dietary_summary: meal.dietarySummary,
          assigned_attendee_ids: meal.assignedAttendeeIds,
        }
        let mealResult = await supabase.from('meals').upsert({ ...mealRow, location: meal.location })
        if (mealResult.error && /location/i.test(mealResult.error.message)) {
          // The location column hasn't been added to the remote table yet.
          mealResult = await supabase.from('meals').upsert(mealRow)
        }
        report('meals', mealResult)

        for (const item of meal.items) {
          report('meal_items', await supabase.from('meal_items').upsert({
            id: item.id,
            meal_id: meal.id,
            name: item.name,
            description: item.description,
            category: item.category,
            person_responsible: item.personResponsible,
          }))
        }
      }
    }

    // keep old ids when a delete failed so it is retried on the next save
    syncedIds = deleteFailed
      ? {
          projects: new Set([...syncedIds.projects, ...currentIds.projects]),
          attendees: new Set([...syncedIds.attendees, ...currentIds.attendees]),
          meals: new Set([...syncedIds.meals, ...currentIds.meals]),
          items: new Set([...syncedIds.items, ...currentIds.items]),
        }
      : currentIds
  } catch (error) {
    console.warn('Supabase persist failed, local storage remains the source of truth.', error)
  }
}

export async function hashPassword(value: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
