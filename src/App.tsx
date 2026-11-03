import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTour } from './tour/useTour'
import type { TourView } from './tour/tours'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import './App.css'
import {
  sampleProjects,
  type Project,
  type Meal,
  type MealItem,
  type MealCategory,
  type Attendee,
  type AgeGroup,
  type FoodCategory,
} from './data/sampleData'
import { loadProjects, persistProjects, usesSupabase } from './lib/projectService'

const ageGroupOptions: AgeGroup[] = ['toddler', 'kid', 'adult']

interface AttendeeDraft {
  firstName: string
  lastName: string
  ageGroup: AgeGroup | ''
  dietaryText: string
}

const parseDietary = (text: string) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const isDraftComplete = (draft: AttendeeDraft) =>
  Boolean(draft.firstName.trim() && draft.lastName.trim() && draft.ageGroup && parseDietary(draft.dietaryText).length)

const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'nut-free', 'dairy-free']

function DietaryField({
  value,
  onChange,
  ...rest
}: {
  value: string[]
  onChange: (value: string[]) => void
} & Omit<React.ComponentProps<typeof TextField>, 'value' | 'onChange'>) {
  // keep older free-text values visible and removable
  const extras = value.filter((v) => v !== 'none' && !dietaryOptions.includes(v))
  const options = ['none', ...dietaryOptions, ...extras]

  return (
    <TextField
      {...rest}
      select
      value={value}
      onChange={(event) => {
        const next = event.target.value as unknown as string[]
        const picked = next.find((v) => !value.includes(v))
        // "none" is exclusive
        onChange(picked === 'none' ? ['none'] : next.filter((v) => v !== 'none'))
      }}
      slotProps={{
        ...rest.slotProps,
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: (selected) =>
            (selected as string[]).length === 0 ? 'Select…' : (selected as string[]).join(', '),
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
          <Checkbox size="small" checked={value.includes(option)} sx={{ p: 0.5, mr: 1 }} />
          {option}
        </MenuItem>
      ))}
    </TextField>
  )
}

// Anyone chosen as responsible for an item is added to the meal's guest list.
const withResponsibleAttending = (meal: Meal, attendeeId?: string): Meal =>
  !attendeeId || meal.assignedAttendeeIds.includes(attendeeId)
    ? meal
    : {
        ...meal,
        assignedAttendeeIds: [...meal.assignedAttendeeIds, attendeeId],
        attendeeCount: meal.assignedAttendeeIds.length + 1,
      }

const NEW_GUEST_OPTION = '__new_guest__'
const SELECT_ALL_OPTION = '__select_all__'
const DONE_OPTION = '__done__'

const courseGroups: { label: string; categories: FoodCategory[] }[] = [
  { label: 'Starters', categories: ['drink', 'app'] },
  { label: 'Mains', categories: ['main'] },
  { label: 'Sides', categories: ['salad', 'side'] },
  { label: 'Desserts', categories: ['dessert'] },
]
const foodCategoryOptions: FoodCategory[] = ['drink', 'app', 'salad', 'main', 'side', 'dessert']

const inlineFieldProps = {
  variant: 'standard' as const,
  size: 'small' as const,
  fullWidth: true,
  slotProps: { input: { disableUnderline: true, sx: { fontSize: '0.875rem' } } },
}

const defaultProjectForm = {
  name: '',
  description: '',
  cloneFromId: '',
}

const mealCategoryOptions: MealCategory[] = ['breakfast', 'lunch', 'dinner']

const defaultMealForm = {
  title: '',
  date: '',
  startTime: '',
  location: '',
  category: '' as MealCategory | '',
  guestIds: [] as string[],
}

const defaultItemForm = {
  name: '',
  description: '',
  category: '' as FoodCategory | '',
  personResponsible: '',
}

function App() {
  const [projects, setProjects] = useState<Project[]>(usesSupabase ? [] : sampleProjects)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(usesSupabase ? null : (sampleProjects[0]?.id ?? null))
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState(defaultProjectForm)
  const [mealForm, setMealForm] = useState(defaultMealForm)
  const [mealItemForm, setMealItemForm] = useState(defaultItemForm)
  const [projectPasswordInput, setProjectPasswordInput] = useState('')
  const [projectAccess, setProjectAccess] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<'dashboard' | 'project' | 'meal'>('dashboard')
  const [editForm, setEditForm] = useState<
    | { kind: 'event'; name: string; description: string }
    | { kind: 'meal'; title: string; date: string; startTime: string; location: string; category: MealCategory }
    | null
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'event' | 'meal' | 'meal-item'
    projectId: string
    mealId?: string
    itemId?: string
  } | null>(null)
  const [deleteStep, setDeleteStep] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const toggleRow = (id: string) =>
    setExpandedRows((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const [guestRemoval, setGuestRemoval] = useState<{ scope: 'event' | 'meal'; guestId: string } | null>(null)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [draftAttendee, setDraftAttendee] = useState<AttendeeDraft | null>(null)
  const [showMealForm, setShowMealForm] = useState(false)
  const [showMealItemForm, setShowMealItemForm] = useState(false)
  const [showAttendees, setShowAttendees] = useState(true)
  const [guestPickerOpen, setGuestPickerOpen] = useState(false)
  const [pendingGuestIds, setPendingGuestIds] = useState<string[]>([])
  const [mealGuestDraft, setMealGuestDraft] = useState<AttendeeDraft | null>(null)

  const [hydrated, setHydrated] = useState(false)

  // wait for the initial load so sample data never overwrites saved data
  useEffect(() => {
    if (hydrated) void persistProjects(projects)
  }, [projects, hydrated])

  useEffect(() => {
    setShowCreateEventForm(false)
    setDraftAttendee(null)
    setShowMealForm(false)
    setShowMealItemForm(false)
  }, [selectedProjectId])

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      let savedProjects: Project[]
      try {
        savedProjects = await loadProjects()
      } catch (error) {
        // stay un-hydrated so a failed load can never overwrite remote data
        console.error(error)
        return
      }
      if (!mounted) return
      setProjects(savedProjects)
      setHydrated(true)
      if (savedProjects[0]) {
        setSelectedProjectId(savedProjects[0].id)
      }
    }

    void hydrate()

    return () => {
      mounted = false
    }
  }, [])


  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null)
      setSelectedMealId(null)
      setView('dashboard')
      return
    }

    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = useMemo(
    () => (selectedProjectId ? projects.find((project) => project.id === selectedProjectId) ?? null : null),
    [projects, selectedProjectId],
  )

  const selectedMeal = useMemo(
    () => selectedProject?.meals.find((meal) => meal.id === selectedMealId) ?? null,
    [selectedProject, selectedMealId],
  )

  const mealAttendees = useMemo(
    () =>
      selectedProject && selectedMeal
        ? selectedProject.attendees.filter((a) => selectedMeal.assignedAttendeeIds.includes(a.id))
        : [],
    [selectedProject, selectedMeal],
  )
  const ageGroupCounts = useMemo(() => {
    const counts: Record<AgeGroup, number> = { adult: 0, kid: 0, toddler: 0 }
    for (const attendee of mealAttendees) counts[attendee.ageGroup] += 1
    return counts
  }, [mealAttendees])

  const availableGuests = useMemo(
    () =>
      selectedProject && selectedMeal
        ? selectedProject.attendees.filter((a) => !selectedMeal.assignedAttendeeIds.includes(a.id))
        : [],
    [selectedProject, selectedMeal],
  )

  const currentProjectUnlocked = selectedProject ? isProjectUnlocked(selectedProject, projectAccess) : true

  const tourView: TourView = view === 'meal' ? 'meal' : view === 'project' ? 'project' : 'dashboard'
  const tourReady =
    !deleteTarget &&
    (view === 'dashboard' ||
      (view === 'project' && Boolean(selectedProject) && currentProjectUnlocked) ||
      (view === 'meal' && Boolean(selectedMeal)))
  const { startTour } = useTour(tourView, tourReady)
  const tourButton = (
    <Button type="button" size="small" variant="text" startIcon={<HelpOutlineIcon />} onClick={startTour}>
      Take the tour
    </Button>
  )

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setSelectedMealId(null)
    setView('project')
    setProjectPasswordInput('')
  }

  const openMeal = (projectId: string, mealId: string) => {
    setSelectedProjectId(projectId)
    setSelectedMealId(mealId)
    setView('meal')
  }

  const createProject = () => {
    if (!projectForm.name.trim()) return

    const sourceProject = projects.find((project) => project.id === projectForm.cloneFromId)

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      visibility: 'public',
      attendees: sourceProject
        ? sourceProject.attendees.map((a) => ({
            ...a,
            id: crypto.randomUUID(),
            dietaryRestrictions: [...a.dietaryRestrictions],
          }))
        : [],
      meals: [],
    }

    setProjects((current) => [newProject, ...current])
    setSelectedProjectId(newProject.id)
    setSelectedMealId(null)
    setProjectForm(defaultProjectForm)
    setProjectPasswordInput('')
    setView('project')
  }

  const startDraftAttendee = () => {
    setDraftAttendee({ firstName: '', lastName: '', ageGroup: '', dietaryText: '' })
  }

  const saveDraftAttendee = () => {
    if (!selectedProject || !draftAttendee || !isDraftComplete(draftAttendee)) return

    const nextAttendee: Attendee = {
      id: crypto.randomUUID(),
      firstName: draftAttendee.firstName.trim(),
      lastName: draftAttendee.lastName.trim(),
      ageGroup: draftAttendee.ageGroup as AgeGroup,
      dietaryRestrictions: parseDietary(draftAttendee.dietaryText),
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? { ...project, attendees: [...project.attendees, nextAttendee] }
          : project,
      ),
    )

    setDraftAttendee(null)
  }

  const saveMealGuestDraft = () => {
    if (!selectedProject || !selectedMeal || !mealGuestDraft || !isDraftComplete(mealGuestDraft)) return

    const nextAttendee: Attendee = {
      id: crypto.randomUUID(),
      firstName: mealGuestDraft.firstName.trim(),
      lastName: mealGuestDraft.lastName.trim(),
      ageGroup: mealGuestDraft.ageGroup as AgeGroup,
      dietaryRestrictions: parseDietary(mealGuestDraft.dietaryText),
    }

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              attendees: [...project.attendees, nextAttendee],
              meals: project.meals.map((meal) =>
                meal.id !== selectedMeal.id
                  ? meal
                  : {
                      ...meal,
                      assignedAttendeeIds: [...meal.assignedAttendeeIds, nextAttendee.id],
                      attendeeCount: meal.assignedAttendeeIds.length + 1,
                    },
              ),
            },
      ),
    )

    setMealGuestDraft(null)
  }

  const closeGuestPicker = () => {
    setPendingGuestIds([])
    setGuestPickerOpen(false)
  }

  const cancelDraftAttendee = () => {
    setDraftAttendee(null)
  }

  const updateAttendee = (attendeeId: string, updates: Partial<Omit<Attendee, 'id'>>) => {
    if (!selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              attendees: project.attendees.map((attendee) =>
                attendee.id !== attendeeId ? attendee : { ...attendee, ...updates },
              ),
            },
      ),
    )
  }

  const removeAttendee = (attendeeId: string) => {
    if (!selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              attendees: project.attendees.filter((attendee) => attendee.id !== attendeeId),
              meals: project.meals.map((meal) => {
                const assignedAttendeeIds = meal.assignedAttendeeIds.filter((id) => id !== attendeeId)
                return {
                  ...meal,
                  assignedAttendeeIds,
                  attendeeCount: assignedAttendeeIds.length,
                  items: meal.items.map((item) =>
                    item.personResponsible === attendeeId ? { ...item, personResponsible: '' } : item,
                  ),
                }
              }),
            },
      ),
    )
  }

  const replaceMealAttendee = (mealId: string, fromId: string, toId: string) => {
    const meal = selectedProject?.meals.find((m) => m.id === mealId)
    if (!meal || fromId === toId) return
    setMealAttendees(mealId, meal.assignedAttendeeIds.map((id) => (id === fromId ? toId : id)))
  }

  const setMealAttendees = (mealId: string, attendeeIds: string[]) => {
    if (!selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              meals: project.meals.map((meal) =>
                meal.id !== mealId
                  ? meal
                  : {
                      ...meal,
                      assignedAttendeeIds: attendeeIds,
                      attendeeCount: attendeeIds.length,
                      items: meal.items.map((item) =>
                        attendeeIds.includes(item.personResponsible) ? item : { ...item, personResponsible: '' },
                      ),
                    },
              ),
            },
      ),
    )
  }

  const addMeal = () => {
    if (
      !selectedProject ||
      !mealForm.title.trim() ||
      !mealForm.date ||
      !mealForm.startTime ||
      !mealForm.category ||
      mealForm.guestIds.length === 0
    )
      return

    const newMeal: Meal = {
      id: crypto.randomUUID(),
      title: mealForm.title.trim(),
      date: mealForm.date,
      startTime: mealForm.startTime,
      location: mealForm.location.trim(),
      category: mealForm.category,
      attendeeCount: mealForm.guestIds.length,
      dietarySummary: '',
      assignedAttendeeIds: mealForm.guestIds,
      items: [],
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id ? { ...project, meals: [...project.meals, newMeal] } : project,
      ),
    )

    setMealForm(defaultMealForm)
    setShowMealForm(false)
  }

  const addMealItem = (mealId: string) => {
    if (!selectedProject || !mealItemForm.name.trim() || !mealItemForm.category || !mealItemForm.personResponsible) return

    const nextItem: MealItem = {
      id: crypto.randomUUID(),
      name: mealItemForm.name.trim(),
      description: mealItemForm.description.trim(),
      category: mealItemForm.category,
      personResponsible: mealItemForm.personResponsible,
    }

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              meals: project.meals.map((meal) =>
                meal.id === mealId
                  ? { ...withResponsibleAttending(meal, nextItem.personResponsible), items: [...meal.items, nextItem] }
                  : meal,
              ),
            },
      ),
    )

    setMealItemForm(defaultItemForm)
    // keep the draft row open so several items can be entered in a row
  }

  const cancelNewItem = () => {
    setMealItemForm(defaultItemForm)
    setShowMealItemForm(false)
  }

  const openEditEvent = () => {
    if (!selectedProject) return
    setEditForm({ kind: 'event', name: selectedProject.name, description: selectedProject.description })
  }

  const openEditMeal = () => {
    if (!selectedMeal) return
    setEditForm({
      kind: 'meal',
      title: selectedMeal.title,
      date: selectedMeal.date,
      startTime: selectedMeal.startTime,
      location: selectedMeal.location,
      category: selectedMeal.category,
    })
  }

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedProject || !editForm) return

    if (editForm.kind === 'event') {
      const name = editForm.name.trim()
      if (!name) return
      setProjects((current) =>
        current.map((project) =>
          project.id === selectedProject.id ? { ...project, name, description: editForm.description.trim() } : project,
        ),
      )
    } else {
      const title = editForm.title.trim()
      if (!selectedMeal || !title || !editForm.date || !editForm.startTime) return
      const { date, startTime, category } = editForm
      const location = editForm.location.trim()
      setProjects((current) =>
        current.map((project) =>
          project.id !== selectedProject.id
            ? project
            : {
                ...project,
                meals: project.meals.map((meal) =>
                  meal.id === selectedMeal.id ? { ...meal, title, date, startTime, location, category } : meal,
                ),
              },
        ),
      )
    }
    setEditForm(null)
  }

  const updateMealItem = (mealId: string, itemId: string, patch: Partial<MealItem>) => {
    if (!selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              meals: project.meals.map((meal) =>
                meal.id !== mealId
                  ? meal
                  : {
                      ...withResponsibleAttending(meal, patch.personResponsible),
                      items: meal.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
                    },
              ),
            },
      ),
    )
  }

  const deleteMeal = deleteTarget?.type === 'meal'
    ? projects.find((project) => project.id === deleteTarget.projectId)?.meals.find((meal) => meal.id === deleteTarget.mealId)
    : undefined
  const deleteMealTitle = deleteMeal?.title ?? 'this meal'
  const deleteMealItemCount = deleteMeal?.items.length ?? 0

  const deleteEvent = deleteTarget?.type === 'event' ? projects.find((project) => project.id === deleteTarget.projectId) : undefined

  const requestDelete = (type: 'event' | 'meal' | 'meal-item', projectId: string, mealId?: string, itemId?: string) => {
    setDeleteTarget({ type, projectId, mealId, itemId })
    setDeleteStep(1)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return

    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }

    if (deleteTarget.type === 'event') {
      setProjects((current) => current.filter((project) => project.id !== deleteTarget.projectId))
      setSelectedMealId(null)
      setView('dashboard')
    }

    if (deleteTarget.type === 'meal' && deleteTarget.projectId && deleteTarget.mealId) {
      setProjects((current) =>
        current.map((project) =>
          project.id !== deleteTarget.projectId
            ? project
            : { ...project, meals: project.meals.filter((meal) => meal.id !== deleteTarget.mealId) },
        ),
      )
      if (selectedMealId === deleteTarget.mealId) {
        setSelectedMealId(null)
        setView('project')
      }
    }

    if (deleteTarget.type === 'meal-item' && deleteTarget.projectId && deleteTarget.mealId && deleteTarget.itemId) {
      setProjects((current) =>
        current.map((project) =>
          project.id !== deleteTarget.projectId
            ? project
            : {
                ...project,
                meals: project.meals.map((meal) =>
                  meal.id !== deleteTarget.mealId
                    ? meal
                    : { ...meal, items: meal.items.filter((item) => item.id !== deleteTarget.itemId) },
                ),
              },
        ),
      )
    }

    setDeleteTarget(null)
    setDeleteStep(0)
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
    setDeleteStep(0)
  }

  const guestRemovalTarget = guestRemoval
    ? selectedProject?.attendees.find((a) => a.id === guestRemoval.guestId)
    : undefined

  const confirmGuestRemoval = () => {
    if (!guestRemoval || !guestRemovalTarget) {
      setGuestRemoval(null)
      return
    }

    if (guestRemoval.scope === 'event') {
      removeAttendee(guestRemoval.guestId)
    } else if (selectedMeal) {
      setMealAttendees(
        selectedMeal.id,
        selectedMeal.assignedAttendeeIds.filter((id) => id !== guestRemoval.guestId),
      )
    }
    setGuestRemoval(null)
  }

  const unlockProject = () => {
    if (!selectedProject) return
    const expectedPassword = selectedProject.password ?? ''
    const entered = projectPasswordInput.trim()

    if (entered === expectedPassword) {
      setProjectAccess((current) => ({ ...current, [selectedProject.id]: true }))
      setProjectPasswordInput('')
      return
    }

    setProjectPasswordInput('')
  }

  return (
    <div className="app-shell">
      {view === 'dashboard' && (
        <Box component="header" className="topbar" sx={{ px: 2.5, py: 1.75, mb: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: 'clamp(2rem, 3vw, 3rem)', letterSpacing: '-0.05em', m: 0 }}>
              Feeding Five Thousand
            </Typography>
          </Box>

          <Box className="topbar-actions" sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {tourButton}
            <Chip
              label={`Events ${projects.length}`}
              color="primary"
              variant="outlined"
              sx={{ borderRadius: 999, fontWeight: 700 }}
            />
          </Box>
        </Box>
      )}

      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onClose={cancelDelete} maxWidth="xs" fullWidth>
          <DialogTitle>
            {deleteTarget.type === 'event' ? 'Delete event?' : deleteTarget.type === 'meal' ? 'Delete meal?' : 'Confirm delete'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteTarget.type === 'event'
                ? deleteStep === 1
                  ? `Delete "${deleteEvent?.name ?? 'this event'}" with its ${deleteEvent?.meals.length ?? 0} meals, their items and ${deleteEvent?.attendees.length ?? 0} guests? This can't be undone.`
                  : 'This is the final confirmation. Delete this event and everything in it permanently?'
                : deleteTarget.type === 'meal'
                ? deleteStep === 1
                  ? `Delete "${deleteMealTitle}" and all ${deleteMealItemCount} of its meal items? This can't be undone.`
                  : 'This is the final confirmation. Delete this meal and its items permanently?'
                : deleteStep === 1
                  ? 'This action is destructive. Please confirm to continue.'
                  : 'This is the final confirmation. Delete this item permanently?'}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button type="button" variant="outlined" color="primary" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="contained" color="error" onClick={confirmDelete}>
              {deleteStep === 1 ? 'Confirm delete' : 'Delete now'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {editForm && selectedProject && (
        <Dialog open onClose={() => setEditForm(null)} maxWidth="xs" fullWidth>
          <form onSubmit={saveEdit}>
            <DialogTitle>{editForm.kind === 'event' ? 'Edit event' : 'Edit meal'}</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
              {editForm.kind === 'event' ? (
                <>
                  <TextField
                    size="small"
                    required
                    autoFocus
                    label="Event name"
                    value={editForm.name}
                    onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                  />
                  <TextField
                    size="small"
                    multiline
                    minRows={2}
                    label="Description"
                    value={editForm.description}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                  />
                </>
              ) : (
                <>
                  <TextField
                    size="small"
                    required
                    autoFocus
                    label="Meal name"
                    value={editForm.title}
                    onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                  />
                  <TextField
                    size="small"
                    required
                    type="date"
                    label="Date"
                    value={editForm.date}
                    onChange={(event) => setEditForm({ ...editForm, date: event.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    required
                    type="time"
                    label="Start time"
                    value={editForm.startTime}
                    onChange={(event) => setEditForm({ ...editForm, startTime: event.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    label="Location"
                    placeholder="Main lodge"
                    value={editForm.location}
                    onChange={(event) => setEditForm({ ...editForm, location: event.target.value })}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                  <TextField
                    size="small"
                    select
                    required
                    label="Type"
                    value={editForm.category}
                    onChange={(event) => setEditForm({ ...editForm, category: event.target.value as MealCategory })}
                  >
                    {mealCategoryOptions.map((option) => (
                      <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              {editForm.kind === 'event' && (
                <Button
                  type="button"
                  color="error"
                  className="delete-meal-button"
                  startIcon={<DeleteOutlinedIcon fontSize="small" />}
                  sx={{ mr: 'auto' }}
                  onClick={() => {
                    setEditForm(null)
                    requestDelete('event', selectedProject.id)
                  }}
                >
                  Delete event
                </Button>
              )}
              {editForm.kind === 'meal' && selectedMeal && (
                <Button
                  type="button"
                  color="error"
                  className="delete-meal-button"
                  startIcon={<DeleteOutlinedIcon fontSize="small" />}
                  sx={{ mr: 'auto' }}
                  onClick={() => {
                    setEditForm(null)
                    requestDelete('meal', selectedProject.id, selectedMeal.id)
                  }}
                >
                  Delete meal
                </Button>
              )}
              <Button type="button" variant="outlined" onClick={() => setEditForm(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {guestRemoval && guestRemovalTarget && (
        <Dialog open onClose={() => setGuestRemoval(null)} maxWidth="xs" fullWidth>
          <DialogTitle>
            {guestRemoval.scope === 'event' ? 'Remove guest from event?' : 'Remove guest from meal?'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {guestRemoval.scope === 'event'
                ? `${guestRemovalTarget.firstName} ${guestRemovalTarget.lastName} will be removed from this event and from every meal. Items they are responsible for will become unassigned.`
                : `${guestRemovalTarget.firstName} ${guestRemovalTarget.lastName} will be removed from this meal only. Items they are responsible for will become unassigned.`}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button type="button" variant="outlined" color="primary" onClick={() => setGuestRemoval(null)}>
              Cancel
            </Button>
            <Button type="button" variant="contained" color="error" onClick={confirmGuestRemoval} autoFocus>
              Remove guest
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {selectedProject && !currentProjectUnlocked && (view === 'project' || view === 'meal') && (
        <main className="detail-stack">
          <Paper className="lock-card" elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h2" sx={{ m: 0, fontSize: '1.7rem' }}>
              {selectedProject.name}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', m: 0 }}>
              This event is protected. Enter the password to access the planning details.
            </Typography>
            <Box className="password-row" sx={{ display: 'flex', gap: 1.25 }}>
              <TextField
                type="password"
                value={projectPasswordInput}
                onChange={(event) => setProjectPasswordInput(event.target.value)}
                placeholder="Enter event password"
                fullWidth
                size="small"
              />
              <Button type="button" variant="contained" color="primary" className="primary-button" onClick={unlockProject}>
                Unlock
              </Button>
            </Box>
          </Paper>
        </main>
      )}

      {view === 'dashboard' && (
        <main className="dashboard-grid">
          <Paper className="panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="panel-header">
              <div />
            </div>

            <div className="project-grid">
              {projects.map((project) => {
                const pastMeals = project.meals.filter((meal) => isPastMeal(meal)).length
                const upcomingMeals = project.meals.filter(
                  (meal) => !isPastMeal(meal),
                ).length

                return (
                  <Card key={project.id} className="project-card" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardActionArea onClick={() => openProject(project.id)} sx={{ p: 1.5, height: '100%' }}>
                      <Typography variant="h3" sx={{ fontSize: '1.15rem', mb: 1, mt: 0 }}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, minHeight: 40 }}>
                        {project.description || 'No event description added yet.'}
                      </Typography>
                      <div className="event-card-footer">
                        <div>
                          <strong>{project.attendees.length}</strong>
                          <span>Guests</span>
                        </div>
                        <div>
                          <strong>{pastMeals}</strong>
                          <span>Past meals</span>
                        </div>
                        <div>
                          <strong>{upcomingMeals}</strong>
                          <span>Upcoming meals</span>
                        </div>
                      </div>
                    </CardActionArea>
                  </Card>
                )
              })}
            </div>
          </Paper>

          <Paper className="panel form-panel create-event-panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            {!showCreateEventForm ? (
              <div className="panel-header" style={{ justifyContent: 'flex-start' }}>
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  className="primary-button"
                  data-tour="dash-create-event"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateEventForm(true)}
                >
                  Create Event
                </Button>
              </div>
            ) : (
              <form
                className="create-event-form"
                data-tour="dash-create-event"
                onSubmit={(event) => {
                  event.preventDefault()
                  createProject()
                }}
              >
                <div className="create-event-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    New event
                  </Typography>
                  <IconButton size="small" aria-label="Close create event form" onClick={() => setShowCreateEventForm(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>

                <div className="create-event-fields">
                  <TextField
                    autoFocus
                    required
                    label="Event name"
                    value={projectForm.name}
                    onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Spring picnic"
                    size="small"
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                  />
                  <TextField
                    select
                    label="Copy guests from a previous event (optional)"
                    value={projectForm.cloneFromId}
                    onChange={(event) => setProjectForm((current) => ({ ...current, cloneFromId: event.target.value }))}
                    size="small"
                    disabled={projects.length === 0}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">
                      <em>Start with no guests</em>
                    </MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name} ({project.attendees.length} {project.attendees.length === 1 ? 'guest' : 'guests'})
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    className="create-event-description"
                    label="Description (optional)"
                    value={projectForm.description}
                    onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short summary of the event"
                    multiline
                    minRows={2}
                    maxRows={2}
                    size="small"
                    helperText={`${projectForm.description.length}/120`}
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                  />
                </div>

                <div className="create-event-actions">
                  <Button type="button" onClick={() => setShowCreateEventForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    className="primary-button"
                    disabled={!projectForm.name.trim()}
                  >
                    Save event
                  </Button>
                </div>
              </form>
            )}
          </Paper>
        </main>
      )}

      {view === 'project' && selectedProject && currentProjectUnlocked && (
        <main className="detail-stack">
          <Paper className="panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="project-header-row" data-tour="event-header">
              <div>
                <Typography variant="h2" sx={{ m: 0, fontSize: '1.7rem' }}>
                  {selectedProject.name}
                </Typography>
              </div>
              <div className="project-actions">
                {tourButton}
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  className="secondary-button"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={openEditEvent}
                >
                  Edit event
                </Button>
                <Button type="button" variant="outlined" color="primary" className="secondary-button" data-tour="nav-back" onClick={() => setView('dashboard')}>
                  ← Dashboard
                </Button>
              </div>
            </div>
            <div className="meal-header-metadata">
              <span>{selectedProject.meals.filter((m) => !isPastMeal(m)).length} upcoming meals</span>
              <span>{selectedProject.meals.filter((m) => isPastMeal(m)).length} past meals</span>
              <span>
                {selectedProject.attendees.length} {selectedProject.attendees.length === 1 ? 'guest' : 'guests'} (
                {selectedProject.attendees.filter((a) => a.ageGroup === 'adult').length} adults,{' '}
                {selectedProject.attendees.filter((a) => a.ageGroup === 'kid').length} kids,{' '}
                {selectedProject.attendees.filter((a) => a.ageGroup === 'toddler').length} toddlers)
              </span>
            </div>
          </Paper>

          <Paper className="panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="meal-grid">
              {selectedProject.meals.filter((meal) => !isPastMeal(meal)).length === 0 && (
                <p className="muted">No upcoming meals in planning.</p>
              )}
              {selectedProject.meals
                .filter((meal) => !isPastMeal(meal))
                .map((meal) => (
                  <Card key={meal.id} className="project-card" data-tour="event-meal-tile" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardActionArea onClick={() => openMeal(selectedProject.id, meal.id)} sx={{ p: 0, height: '100%', alignItems: 'stretch' }}>
                    <div className="meal-tile">
                    <div className="meal-tile-header">
                      <h4>{meal.title}</h4>
                      <Chip size="small" label={meal.category} className="meal-tile-chip" />
                    </div>
                    <div className="meal-date">
                      {formatDate(meal.date)} • {formatTime(meal.startTime)}
                      {meal.location && <span className="meal-location"> • 📍 {meal.location}</span>}
                    </div>
                    <div className="meal-tile-stats">
                      <span>
                        <strong>{meal.attendeeCount || meal.assignedAttendeeIds.length}</strong> guests
                      </span>
                      <span>
                        <strong>{meal.items.length}</strong> items
                      </span>
                    </div>
                    <p className="meal-summary">{meal.dietarySummary || 'No dietary guidance recorded yet.'}</p>
                    </div>
                    </CardActionArea>
                  </Card>
                ))}
            </div>

            <div className="section-header" style={{ marginTop: 12 }}>
              <Button
                type="button"
                variant="contained"
                color="primary"
                className="primary-button"
                data-tour="event-add-meal"
                onClick={() => setShowMealForm((current) => !current)}
              >
                {showMealForm ? 'Close meal form' : 'Add meal'}
              </Button>
            </div>

            {showMealForm && (
              <form
                className="create-event-form meal-create-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  addMeal()
                }}
              >
                <div className="create-event-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    New meal
                  </Typography>
                  <IconButton size="small" aria-label="Close meal form" onClick={() => setShowMealForm(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>

                <div className="create-event-fields meal-create-fields">
                  <TextField
                    className="create-event-wide"
                    size="small"
                    required
                    autoFocus
                    label="Meal name"
                    placeholder="Saturday dinner"
                    value={mealForm.title}
                    onChange={(event) => setMealForm((current) => ({ ...current, title: event.target.value }))}
                    slotProps={{ htmlInput: { maxLength: 60 } }}
                  />
                  <TextField
                    size="small"
                    required
                    type="date"
                    label="Date"
                    value={mealForm.date}
                    onChange={(event) => setMealForm((current) => ({ ...current, date: event.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    required
                    type="time"
                    label="Start time"
                    value={mealForm.startTime}
                    onChange={(event) => setMealForm((current) => ({ ...current, startTime: event.target.value }))}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    label="Location"
                    placeholder="Main lodge"
                    value={mealForm.location}
                    onChange={(event) => setMealForm((current) => ({ ...current, location: event.target.value }))}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                  <TextField
                    size="small"
                    select
                    required
                    label="Type"
                    value={mealForm.category}
                    onChange={(event) =>
                      setMealForm((current) => ({ ...current, category: event.target.value as MealCategory }))
                    }
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="" disabled>
                      Select type…
                    </MenuItem>
                    {mealCategoryOptions.map((option) => (
                      <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                <Autocomplete
                  multiple
                  size="small"
                  disableCloseOnSelect
                  options={
                    selectedProject.attendees.length > 0
                      ? [
                          { id: SELECT_ALL_OPTION, firstName: 'Select all', lastName: 'guests', ageGroup: 'adult', dietaryRestrictions: [] } as Attendee,
                          ...selectedProject.attendees,
                        ]
                      : []
                  }
                  value={selectedProject.attendees.filter((a) => mealForm.guestIds.includes(a.id))}
                  getOptionLabel={(a) => `${a.firstName} ${a.lastName}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(optionProps, option, { selected }) => {
                    const { key, ...rest } = optionProps as typeof optionProps & { key: string }
                    const isAll = option.id === SELECT_ALL_OPTION
                    const allSelected = mealForm.guestIds.length === selectedProject.attendees.length
                    return (
                      <li key={key} {...rest} style={isAll ? { fontWeight: 600, color: '#1a56c4' } : undefined}>
                        <Checkbox
                          size="small"
                          sx={{ p: 0.5, mr: 1 }}
                          checked={isAll ? allSelected : selected}
                          indeterminate={isAll && !allSelected && mealForm.guestIds.length > 0}
                        />
                        {option.firstName} {option.lastName}
                      </li>
                    )
                  }}
                  onChange={(_, value) =>
                    setMealForm((current) => {
                      const allIds = selectedProject.attendees.map((a) => a.id)
                      if (value.some((a) => a.id === SELECT_ALL_OPTION)) {
                        return { ...current, guestIds: current.guestIds.length === allIds.length ? [] : allIds }
                      }
                      return { ...current, guestIds: value.map((a) => a.id) }
                    })
                  }
                  noOptionsText="No event guests yet"
                  className="create-event-wide"
                  slotProps={{ popper: { sx: { width: '280px !important' }, placement: 'bottom-start' } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required={mealForm.guestIds.length === 0}
                      label="Attending guests"
                      size="small"
                      placeholder={mealForm.guestIds.length ? '' : 'Select guests'}
                      helperText={
                        selectedProject.attendees.length === 0
                          ? 'Add guests to the event first.'
                          : `${mealForm.guestIds.length} of ${selectedProject.attendees.length} selected`
                      }
                    />
                  )}
                />
                </div>

                <div className="create-event-actions">
                  <Button type="button" onClick={() => setShowMealForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    className="primary-button"
                    disabled={
                      !mealForm.title.trim() ||
                      !mealForm.date ||
                      !mealForm.startTime ||
                      !mealForm.category ||
                      mealForm.guestIds.length === 0
                    }
                  >
                    Save meal
                  </Button>
                </div>
              </form>
            )}
          </Paper>

          <Paper className="panel compact-section" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="section-header compact-header">
              <Button
                type="button"
                variant="text"
                color="primary"
                data-tour="event-attendees-toggle"
                onClick={() => setShowAttendees((current) => !current)}
                sx={{ minWidth: 0, px: 0.5, py: 0.25, fontWeight: 700, color: 'text.primary' }}
              >
                {showAttendees ? 'Hide guests' : 'Manage guests'}
              </Button>
            </div>

            {showAttendees && (
              <TableContainer>
                <Table size="small" className="items-table event-guests-table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '18%' }}>First name</TableCell>
                      <TableCell sx={{ width: '18%' }}>Last name</TableCell>
                      <TableCell sx={{ width: 130 }}>Age group</TableCell>
                      <TableCell>Dietary requests</TableCell>
                      <TableCell sx={{ width: 88 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {draftAttendee ? (
                      <TableRow className="draft-row"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveDraftAttendee()
                          } else if (event.key === 'Escape') {
                            cancelDraftAttendee()
                          }
                        }}
                      >
                        <TableCell data-label="First name">
                          <TextField
                            {...inlineFieldProps}
                            autoFocus
                            required
                            value={draftAttendee.firstName}
                            placeholder="First name"
                            onChange={(event) => setDraftAttendee((current) => current && { ...current, firstName: event.target.value })}
                          />
                        </TableCell>
                        <TableCell data-label="Last name">
                          <TextField
                            {...inlineFieldProps}
                            required
                            value={draftAttendee.lastName}
                            placeholder="Last name"
                            onChange={(event) => setDraftAttendee((current) => current && { ...current, lastName: event.target.value })}
                          />
                        </TableCell>
                        <TableCell data-label="Age group">
                          <TextField
                            {...inlineFieldProps}
                            select
                            required
                            value={draftAttendee.ageGroup}
                            onChange={(event) =>
                              setDraftAttendee((current) => current && { ...current, ageGroup: event.target.value as AgeGroup })
                            }
                            slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                          >
                            <MenuItem value="" disabled>
                              Select…
                            </MenuItem>
                            {ageGroupOptions.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell data-label="Dietary requests">
                          <DietaryField
                            {...inlineFieldProps}
                            required
                            value={parseDietary(draftAttendee.dietaryText)}
                            onChange={(next) =>
                              setDraftAttendee((current) => current && { ...current, dietaryText: next.join(', ') })
                            }
                          />
                        </TableCell>
                        <TableCell data-actions="true" align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Save guest"
                            disabled={!isDraftComplete(draftAttendee)}
                            onClick={saveDraftAttendee}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="Cancel new guest" onClick={cancelDraftAttendee}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow hover data-tour="event-new-attendee" onClick={startDraftAttendee} sx={{ cursor: 'pointer' }}>
                        <TableCell colSpan={5} sx={{ color: 'primary.main', fontWeight: 600 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AddIcon fontSize="small" /> New guest
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}

                    {selectedProject.attendees.map((attendee) => {
                      const fullName = `${attendee.firstName} ${attendee.lastName}`.trim()
                      return (
                        <TableRow key={attendee.id} hover className={expandedRows.has(attendee.id) ? 'row-expanded' : undefined}>
                          <TableCell data-label="First name">
                            <TextField
                              {...inlineFieldProps}
                              required
                              error={!attendee.firstName.trim()}
                              value={attendee.firstName}
                              placeholder="First name"
                              onChange={(event) => updateAttendee(attendee.id, { firstName: event.target.value })}
                              slotProps={{ ...inlineFieldProps.slotProps, htmlInput: { 'aria-label': `First name for ${fullName}` } }}
                            />
                          </TableCell>
                          <TableCell data-label="Last name">
                            <TextField
                              {...inlineFieldProps}
                              required
                              error={!attendee.lastName.trim()}
                              value={attendee.lastName}
                              placeholder="Last name"
                              onChange={(event) => updateAttendee(attendee.id, { lastName: event.target.value })}
                              slotProps={{ ...inlineFieldProps.slotProps, htmlInput: { 'aria-label': `Last name for ${fullName}` } }}
                            />
                          </TableCell>
                          <TableCell data-label="Age group">
                            <TextField
                              {...inlineFieldProps}
                              select
                              required
                              value={attendee.ageGroup}
                              onChange={(event) => updateAttendee(attendee.id, { ageGroup: event.target.value as AgeGroup })}
                            >
                              {ageGroupOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                          </TableCell>
                          <TableCell data-label="Dietary requests">
                            <DietaryField
                              {...inlineFieldProps}
                              required
                              error={attendee.dietaryRestrictions.length === 0}
                              value={attendee.dietaryRestrictions}
                              onChange={(dietaryRestrictions) => updateAttendee(attendee.id, { dietaryRestrictions })}
                              slotProps={{ ...inlineFieldProps.slotProps, htmlInput: { 'aria-label': `Dietary requests for ${fullName}` } }}
                            />
                          </TableCell>
                          <TableCell data-actions="true" align="right">
                            <IconButton
                              className="row-info-button"
                              size="small"
                              aria-label={`Show details for ${fullName}`}
                              aria-expanded={expandedRows.has(attendee.id)}
                              onClick={() => toggleRow(attendee.id)}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" aria-label={`Remove ${fullName}`} onClick={() => setGuestRemoval({ scope: 'event', guestId: attendee.id })}>
                              <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {(() => {
            const pastMealList = selectedProject.meals
              .filter((meal) => isPastMeal(meal))
              .sort((x, y) => `${y.date} ${y.startTime}`.localeCompare(`${x.date} ${x.startTime}`))
            return (
              <Paper className="panel compact-section" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Past meals ({pastMealList.length})
                </Typography>
                {pastMealList.length === 0 ? (
                  <Typography variant="body2" className="muted" sx={{ py: 1 }}>
                    No past meals yet. Meals move here automatically once their date and time have passed.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small" className="items-table past-meals-table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Meal</TableCell>
                          <TableCell sx={{ width: 190 }}>When</TableCell>
                          <TableCell sx={{ width: 100 }}>Guests</TableCell>
                          <TableCell sx={{ width: 100 }}>Items</TableCell>
                          <TableCell sx={{ width: 40 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pastMealList.map((meal) => (
                          <TableRow
                            key={meal.id}
                            hover
                            tabIndex={0}
                            className="past-meal-table-row"
                            onClick={() => openMeal(selectedProject.id, meal.id)}
                            onKeyDown={(event) => event.key === 'Enter' && openMeal(selectedProject.id, meal.id)}
                          >
                            <TableCell data-label="Meal">
                              <span className="past-meal-title">{meal.title}</span>
                              <Chip size="small" label={meal.category} className="past-meal-chip" />
                              {meal.location && <div className="meal-location">📍 {meal.location}</div>}
                            </TableCell>
                            <TableCell data-label="When">
                              {formatDate(meal.date)}
                              {meal.startTime ? ` · ${formatTime(meal.startTime)}` : ''}
                            </TableCell>
                            <TableCell data-label="Guests">{meal.assignedAttendeeIds.length}</TableCell>
                            <TableCell data-label="Items">{meal.items.length}</TableCell>
                            <TableCell data-actions="true" align="right">
                              <ChevronRightIcon fontSize="small" className="past-meal-chevron" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )
          })()}
        </main>
      )}

      {view === 'meal' && selectedProject && selectedMeal && (
        <main className="detail-stack">
          <Paper className="panel compact-meal-header-panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="meal-header-row" data-tour="meal-header">
              <div className="meal-header-copy">
                <div className="meal-header-title-row">
                  <h2>{selectedMeal.title}</h2>
                </div>
                <div className="meal-header-metadata">
                  <span>{formatDate(selectedMeal.date) || 'No date'}</span>
                  <span>{formatTime(selectedMeal.startTime) || 'No time'}</span>
                  {selectedMeal.location && <span>📍 {selectedMeal.location}</span>}
                  <span>{selectedMeal.category}</span>
                  <span>
                    {mealAttendees.length} {mealAttendees.length === 1 ? 'guest' : 'guests'} ({ageGroupCounts.adult} adults,{' '}
                    {ageGroupCounts.kid} kids, {ageGroupCounts.toddler} toddlers)
                  </span>
                </div>
                {selectedMeal.dietarySummary && <div className="meal-header-notes">{selectedMeal.dietarySummary}</div>}
              </div>
              <div className="project-actions meal-header-actions">
                {tourButton}
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  className="secondary-button"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={openEditMeal}
                >
                  Edit meal
                </Button>
                <Button type="button" variant="outlined" color="primary" className="secondary-button" data-tour="nav-back" onClick={() => setView('project')}>
                  ← Event
                </Button>
              </div>
            </div>
          </Paper>

          <Paper className="panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="section-header">
              <div />
            </div>

            <TableContainer data-tour="meal-items-table">
              <Table size="small" className="items-table meal-items-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '22%' }}>Item</TableCell>
                    <TableCell sx={{ width: 130 }}>Category</TableCell>
                    <TableCell>Item Description</TableCell>
                    <TableCell sx={{ width: '18%' }}>Responsible</TableCell>
                    <TableCell sx={{ width: 88 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showMealItemForm ? (
                    <TableRow className="draft-row"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addMealItem(selectedMeal.id)
                        } else if (event.key === 'Escape') {
                          cancelNewItem()
                        }
                      }}
                    >
                      <TableCell data-label="Item">
                        <TextField
                          {...inlineFieldProps}
                          autoFocus
                          value={mealItemForm.name}
                          placeholder="New item name"
                          onChange={(event) => setMealItemForm((current) => ({ ...current, name: event.target.value }))}
                        />
                      </TableCell>
                      <TableCell data-label="Category">
                        <TextField
                          {...inlineFieldProps}
                          select
                          required
                          value={mealItemForm.category}
                          onChange={(event) =>
                            setMealItemForm((current) => ({ ...current, category: event.target.value as FoodCategory }))
                          }
                          slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                        >
                          <MenuItem value="" disabled>
                            Select category…
                          </MenuItem>
                          {foodCategoryOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-label="Item Description">
                        <TextField
                          {...inlineFieldProps}
                          value={mealItemForm.description}
                          placeholder="Item description (optional)"
                          onChange={(event) =>
                            setMealItemForm((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell data-label="Responsible">
                        <TextField
                          {...inlineFieldProps}
                          select
                          required
                          value={mealItemForm.personResponsible}
                          onChange={(event) => setMealItemForm((current) => ({ ...current, personResponsible: event.target.value }))}
                          slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                        >
                          <MenuItem value="" disabled>
                            Select guest…
                          </MenuItem>
                          {selectedProject.attendees.map((attendee) => (
                            <MenuItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName}
                              {selectedMeal.assignedAttendeeIds.includes(attendee.id) ? '' : ' (add to meal)'}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-actions="true" align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Save item"
                          disabled={!mealItemForm.name.trim() || !mealItemForm.category || !mealItemForm.personResponsible}
                          onClick={() => addMealItem(selectedMeal.id)}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Cancel new item" onClick={cancelNewItem}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow hover data-tour="meal-new-item" onClick={() => setShowMealItemForm(true)} sx={{ cursor: 'pointer' }}>
                      <TableCell colSpan={5} sx={{ color: 'primary.main', fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AddIcon fontSize="small" /> New item
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}

                  {courseGroups.map((group) => {
                    const groupItems = selectedMeal.items.filter((item) => group.categories.includes(item.category))
                    if (groupItems.length === 0) return null
                    return (
                      <Fragment key={group.label}>
                        <TableRow className="course-row">
                          <TableCell colSpan={5}>{group.label}</TableCell>
                        </TableRow>
                        {groupItems.map((item) => (
                    <TableRow key={item.id} hover className={expandedRows.has(item.id) ? 'row-expanded' : undefined}>
                      <TableCell data-label="Item">
                        <TextField
                          {...inlineFieldProps}
                          value={item.name}
                          placeholder="Item name"
                          onChange={(event) => updateMealItem(selectedMeal.id, item.id, { name: event.target.value })}
                        />
                      </TableCell>
                      <TableCell data-label="Category">
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={item.category}
                          onChange={(event) =>
                            updateMealItem(selectedMeal.id, item.id, { category: event.target.value as FoodCategory })
                          }
                        >
                          {foodCategoryOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-label="Item Description">
                        <TextField
                          {...inlineFieldProps}
                          value={item.description}
                          placeholder="Item description (optional)"
                          onChange={(event) =>
                            updateMealItem(selectedMeal.id, item.id, { description: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell data-label="Responsible">
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={item.personResponsible}
                          onChange={(event) => updateMealItem(selectedMeal.id, item.id, { personResponsible: event.target.value })}
                          slotProps={{
                            ...inlineFieldProps.slotProps,
                            select: {
                              displayEmpty: true,
                              renderValue: (value) => {
                                const guest = selectedProject.attendees.find((attendee) => attendee.id === value)
                                if (!guest) return <em>Unassigned</em>
                                const initial = guest.lastName.trim().charAt(0)
                                return (
                                  <>
                                    <span className="name-full">{guest.firstName} {guest.lastName}</span>
                                    <span className="name-short">{guest.firstName}{initial ? ` ${initial}.` : ''}</span>
                                  </>
                                )
                              },
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Unassigned</em>
                          </MenuItem>
                          {selectedProject.attendees.map((attendee) => (
                            <MenuItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName}
                              {selectedMeal.assignedAttendeeIds.includes(attendee.id) ? '' : ' (add to meal)'}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-actions="true" align="right">
                        <IconButton
                              className="row-info-button"
                              size="small"
                              aria-label={`Show details for ${item.name || 'item'}`}
                              aria-expanded={expandedRows.has(item.id)}
                              onClick={() => toggleRow(item.id)}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                            
                        <IconButton
                          size="small"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => requestDelete('meal-item', selectedProject.id, selectedMeal.id, item.id)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                        ))}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper className="panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Attending guests ({mealAttendees.length} of {selectedProject.attendees.length} Event Guests)
            </Typography>
            <TableContainer data-tour="meal-attending-table">
              <Table size="small" className="items-table meal-guests-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '30%' }}>Guest</TableCell>
                    <TableCell sx={{ width: 130 }}>Age group</TableCell>
                    <TableCell>Dietary requests</TableCell>
                    <TableCell sx={{ width: 88 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mealGuestDraft ? (
                    <TableRow className="draft-row"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          saveMealGuestDraft()
                        } else if (event.key === 'Escape') {
                          setMealGuestDraft(null)
                        }
                      }}
                    >
                      <TableCell data-label="Guest">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            {...inlineFieldProps}
                            autoFocus
                            required
                            value={mealGuestDraft.firstName}
                            placeholder="First name"
                            onChange={(event) => setMealGuestDraft((c) => c && { ...c, firstName: event.target.value })}
                          />
                          <TextField
                            {...inlineFieldProps}
                            required
                            value={mealGuestDraft.lastName}
                            placeholder="Last name"
                            onChange={(event) => setMealGuestDraft((c) => c && { ...c, lastName: event.target.value })}
                          />
                        </Box>
                      </TableCell>
                      <TableCell data-label="Age group">
                        <TextField
                          {...inlineFieldProps}
                          select
                          required
                          value={mealGuestDraft.ageGroup}
                          onChange={(event) =>
                            setMealGuestDraft((c) => c && { ...c, ageGroup: event.target.value as AgeGroup })
                          }
                          slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                        >
                          <MenuItem value="" disabled>
                            Select…
                          </MenuItem>
                          {ageGroupOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-label="Dietary requests">
                        <DietaryField
                          {...inlineFieldProps}
                          required
                          value={parseDietary(mealGuestDraft.dietaryText)}
                          onChange={(next) => setMealGuestDraft((c) => c && { ...c, dietaryText: next.join(', ') })}
                        />
                      </TableCell>
                      <TableCell data-actions="true" align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Save new guest"
                          disabled={!isDraftComplete(mealGuestDraft)}
                          onClick={saveMealGuestDraft}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Cancel new guest" onClick={() => setMealGuestDraft(null)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      className="guest-picker-row"
                      data-tour="meal-add-guest"
                      onKeyDown={(event) => event.key === 'Escape' && closeGuestPicker()}
                    >
                      <TableCell data-label="Guest">
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={pendingGuestIds}
                          onChange={(event) => {
                            const value = event.target.value as unknown as string[]
                            if (value.includes(NEW_GUEST_OPTION)) {
                              setMealGuestDraft({ firstName: '', lastName: '', ageGroup: '', dietaryText: '' })
                              closeGuestPicker()
                            } else if (value.includes(DONE_OPTION)) {
                              if (pendingGuestIds.length > 0) {
                                setMealAttendees(selectedMeal.id, [...selectedMeal.assignedAttendeeIds, ...pendingGuestIds])
                              }
                              closeGuestPicker()
                            } else if (value.includes(SELECT_ALL_OPTION)) {
                              const allIds = availableGuests.map((g) => g.id)
                              setPendingGuestIds(pendingGuestIds.length === allIds.length ? [] : allIds)
                            } else {
                              setPendingGuestIds(value)
                            }
                          }}
                          slotProps={{
                            ...inlineFieldProps.slotProps,
                            select: {
                              multiple: true,
                              open: guestPickerOpen,
                              onOpen: () => setGuestPickerOpen(true),
                              onClose: () => setGuestPickerOpen(false),
                              displayEmpty: true,
                              renderValue: (selected) =>
                                (selected as string[]).length === 0
                                  ? 'Select guests…'
                                  : `${(selected as string[]).length} selected`,
                            },
                            htmlInput: { 'aria-label': 'Select guests to add' },
                          }}
                        >
                          {availableGuests.length > 0 ? (
                            <MenuItem value={SELECT_ALL_OPTION} sx={{ fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                              <Checkbox
                                size="small"
                                checked={pendingGuestIds.length === availableGuests.length}
                                indeterminate={pendingGuestIds.length > 0 && pendingGuestIds.length < availableGuests.length}
                                sx={{ p: 0.5, mr: 1 }}
                              />
                              Select all guests
                            </MenuItem>
                          ) : null}
                          {availableGuests.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              <Checkbox size="small" checked={pendingGuestIds.includes(option.id)} sx={{ p: 0.5, mr: 1 }} />
                              {option.firstName} {option.lastName}
                            </MenuItem>
                          ))}
                          <MenuItem value={NEW_GUEST_OPTION} sx={{ color: 'primary.main', fontWeight: 600 }}>
                            + Add new guest…
                          </MenuItem>
                          <MenuItem
                            value={DONE_OPTION}
                            disabled={pendingGuestIds.length === 0}
                            className="guest-picker-done"
                          >
                            {pendingGuestIds.length === 0
                              ? 'Select guests to add'
                              : `Add ${pendingGuestIds.length} ${pendingGuestIds.length === 1 ? 'guest' : 'guests'} to meal`}
                          </MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell data-actions="true" align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Add selected guests"
                          disabled={pendingGuestIds.length === 0}
                          onClick={() => {
                            setMealAttendees(selectedMeal.id, [...selectedMeal.assignedAttendeeIds, ...pendingGuestIds])
                            closeGuestPicker()
                          }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Clear guest selection" disabled={pendingGuestIds.length === 0} onClick={closeGuestPicker}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}

                  {mealAttendees.map((attendee) => (
                    <TableRow key={attendee.id} hover className={expandedRows.has(`meal-${attendee.id}`) ? 'row-expanded' : undefined}>
                      <TableCell data-label="Guest">
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={attendee.id}
                          onChange={(event) => replaceMealAttendee(selectedMeal.id, attendee.id, event.target.value)}
                          slotProps={{ ...inlineFieldProps.slotProps, htmlInput: { 'aria-label': 'Attending guest' } }}
                        >
                          {[attendee, ...availableGuests].map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              {option.firstName} {option.lastName}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell data-label="Age group" sx={{ textTransform: 'capitalize' }}>{attendee.ageGroup}</TableCell>
                      <TableCell data-label="Dietary requests">{attendee.dietaryRestrictions.join(', ')}</TableCell>
                      <TableCell data-actions="true" align="right">
                        <IconButton
                              className="row-info-button"
                              size="small"
                              aria-label={`Show details for ${attendee.firstName} ${attendee.lastName}`}
                              aria-expanded={expandedRows.has(`meal-${attendee.id}`)}
                              onClick={() => toggleRow(`meal-${attendee.id}`)}
                            >
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                          size="small"
                          aria-label={`Remove ${attendee.firstName} ${attendee.lastName} from meal`}
                          onClick={() => setGuestRemoval({ scope: 'meal', guestId: attendee.id })}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </main>
      )}

    </div>
  )
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[2]}/${match[3]}/${match[1].slice(2)}` : value
}

function formatTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value
  const hours = Number(match[1])
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`
}

function isPastMeal(meal: Meal) {
  if (!meal.date) return false
  // a meal is past once its start date and time have passed
  const mealStart = new Date(`${meal.date}T${meal.startTime || '00:00'}:00`)
  return mealStart < new Date()
}

function isProjectUnlocked(project: Project, projectAccess: Record<string, boolean>) {
  if (project.visibility === 'public') return true
  if (project.visibility === 'public-password' || project.visibility === 'private-password') {
    return projectAccess[project.id] === true
  }
  return true
}

export default App
