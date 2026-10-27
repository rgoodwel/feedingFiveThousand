import { supabase } from './supabase';
import { sampleProjects, type Project } from '../data/sampleData';

const STORAGE_KEY = 'feeding-five-thousand-projects';

const normalizeProject = (project: Record<string, any>): Project => ({
  id: String(project.id ?? crypto.randomUUID()),
  name: String(project.name ?? 'Untitled project'),
  description: String(project.description ?? ''),
  visibility: (project.visibility as Project['visibility']) ?? 'public',
  password: project.password ?? project.password_hash ?? undefined,
  attendees:
    Array.isArray(project.attendees)
      ? project.attendees.map((attendee: Record<string, any>) => ({
          id: String(attendee.id ?? crypto.randomUUID()),
          name: String(attendee.name ?? 'Guest'),
          dietaryRestrictions: Array.isArray(attendee.dietaryRestrictions)
            ? attendee.dietaryRestrictions.map((item) => String(item))
            : Array.isArray(attendee.dietary_restrictions)
              ? attendee.dietary_restrictions.map((item: string) => String(item))
              : ['none'],
        }))
      : [],
  meals:
    Array.isArray(project.meals)
      ? project.meals.map((meal: Record<string, any>) => ({
          id: String(meal.id ?? crypto.randomUUID()),
          title: String(meal.title ?? 'Meal'),
          date: String(meal.date ?? new Date().toISOString().slice(0, 10)),
          startTime: String(meal.startTime ?? '12:00'),
          category: (meal.category as Project['meals'][number]['category']) ?? 'lunch',
          attendeeCount: Number(meal.attendeeCount ?? 0),
          dietarySummary: String(meal.dietarySummary ?? ''),
          status: (meal.status as Project['meals'][number]['status']) ?? 'planned',
          assignedAttendeeIds: Array.isArray(meal.assignedAttendeeIds)
            ? meal.assignedAttendeeIds.map((item: string | number) => String(item))
            : [],
          items: Array.isArray(meal.items)
            ? meal.items.map((item: Record<string, any>) => ({
                id: String(item.id ?? crypto.randomUUID()),
                name: String(item.name ?? 'Food item'),
                description: String(item.description ?? ''),
                category: (item.category as Project['meals'][number]['items'][number]['category']) ?? 'main',
                personResponsible: String(item.personResponsible ?? 'TBD'),
              }))
            : [],
        }))
      : [],
});

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
          return projects
        }
      }
    } catch (error) {
      console.warn('Supabase load failed, falling back to local demo data.', error)
    }
  }

  try {
    const savedProjects = localStorage.getItem(STORAGE_KEY)
    return savedProjects ? (JSON.parse(savedProjects) as Project[]) : sampleProjects
  } catch {
    return sampleProjects
  }
}

export async function persistProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // no-op, browser storage may be unavailable
  }

  if (!supabase) return

  try {
    for (const project of projects) {
      const row = {
        id: project.id,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
        password_hash: project.password ? await hashPassword(project.password) : null,
        updated_at: new Date().toISOString(),
      }

      await supabase.from('projects').upsert(row)

      const attendeeRows = project.attendees.map((attendee) => ({
        id: attendee.id,
        project_id: project.id,
        name: attendee.name,
        dietary_restrictions: attendee.dietaryRestrictions,
      }))
      await supabase.from('attendees').upsert(attendeeRows)

      for (const meal of project.meals) {
        await supabase.from('meals').upsert({
          id: meal.id,
          project_id: project.id,
          title: meal.title,
          date: meal.date,
          start_time: meal.startTime,
          category: meal.category,
          attendee_count: meal.attendeeCount,
          dietary_summary: meal.dietarySummary,
          status: meal.status,
          assigned_attendee_ids: meal.assignedAttendeeIds,
        })

        for (const item of meal.items) {
          await supabase.from('meal_items').upsert({
            id: item.id,
            meal_id: meal.id,
            name: item.name,
            description: item.description,
            category: item.category,
            person_responsible: item.personResponsible,
          })
        }
      }
    }
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
