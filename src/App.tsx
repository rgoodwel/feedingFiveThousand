import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTour } from './tour/useTour'
import type { TourView } from './tour/tours'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
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
import CloseIcon from '@mui/icons-material/Close'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
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
  type VisibilityMode,
  type FoodCategory,
} from './data/sampleData'
import { loadProjects, persistProjects } from './lib/projectService'

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

// Keeps raw text locally so typing commas/spaces isn't mangled by re-parsing on every keystroke.
function DietaryField({
  value,
  onChange,
  ...rest
}: {
  value: string[]
  onChange: (value: string[]) => void
} & Omit<React.ComponentProps<typeof TextField>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value.join(', '))
  return (
    <TextField
      {...rest}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onChange(parseDietary(event.target.value))
      }}
    />
  )
}

const courseGroups: { label: string; categories: FoodCategory[] }[] = [
  { label: 'Starters', categories: ['drink', 'app'] },
  { label: 'Mains', categories: ['main'] },
  { label: 'Sides', categories: ['salad', 'side'] },
  { label: 'Desserts', categories: ['dessert'] },
]
const foodCategoryOptions: FoodCategory[] = ['drink', 'app', 'salad', 'main', 'side', 'dessert']
const visibilityOptions: { value: VisibilityMode; label: string }[] = [
  { value: 'public', label: 'Fully public' },
  { value: 'public-password', label: 'Public with password' },
  { value: 'private-password', label: 'Private with password' },
]

const inlineFieldProps = {
  variant: 'standard' as const,
  size: 'small' as const,
  fullWidth: true,
  slotProps: { input: { disableUnderline: true, sx: { fontSize: '0.875rem' } } },
}

const defaultProjectForm = {
  name: '',
  description: '',
  visibility: 'public' as VisibilityMode,
  password: '',
}

const mealCategoryOptions: MealCategory[] = ['breakfast', 'lunch', 'dinner']

const defaultMealForm = {
  title: '',
  date: '',
  startTime: '12:00',
  category: 'dinner' as MealCategory,
  guestIds: [] as string[],
}

const defaultItemForm = {
  name: '',
  description: '',
  category: 'main' as FoodCategory,
  personResponsible: '',
}

function App() {
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(sampleProjects[0]?.id ?? null)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState(defaultProjectForm)
  const [mealForm, setMealForm] = useState(defaultMealForm)
  const [mealItemForm, setMealItemForm] = useState(defaultItemForm)
  const [projectPasswordInput, setProjectPasswordInput] = useState('')
  const [projectAccess, setProjectAccess] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<'dashboard' | 'project' | 'meal'>('dashboard')
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'meal' | 'meal-item'
    projectId: string
    mealId?: string
    itemId?: string
  } | null>(null)
  const [deleteStep, setDeleteStep] = useState(0)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [draftAttendee, setDraftAttendee] = useState<AttendeeDraft | null>(null)
  const [showMealForm, setShowMealForm] = useState(false)
  const [showMealItemForm, setShowMealItemForm] = useState(false)
  const [showAttendees, setShowAttendees] = useState(true)
  const [addingGuest, setAddingGuest] = useState(false)

  useEffect(() => {
    void persistProjects(projects)
  }, [projects])

  useEffect(() => {
    setShowCreateEventForm(false)
    setDraftAttendee(null)
    setShowMealForm(false)
    setShowMealItemForm(false)
  }, [selectedProjectId])

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      const savedProjects = await loadProjects()
      if (!mounted) return
      setProjects(savedProjects)
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

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      visibility: projectForm.visibility,
      password: projectForm.visibility === 'public' ? undefined : projectForm.password.trim(),
      attendees: [],
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
      id: `att-${Date.now()}`,
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
    if (!selectedProject || !mealForm.title.trim() || !mealForm.date || mealForm.guestIds.length === 0) return

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      title: mealForm.title.trim(),
      date: mealForm.date,
      startTime: mealForm.startTime,
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
    if (!selectedProject || !mealItemForm.name.trim()) return

    const nextItem: MealItem = {
      id: `item-${Date.now()}`,
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
                meal.id === mealId ? { ...meal, items: [...meal.items, nextItem] } : meal,
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
                  : { ...meal, items: meal.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) },
              ),
            },
      ),
    )
  }

  const requestDelete = (type: 'meal' | 'meal-item', projectId: string, mealId?: string, itemId?: string) => {
    setDeleteTarget({ type, projectId, mealId, itemId })
    setDeleteStep(1)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return

    if (deleteStep === 1) {
      setDeleteStep(2)
      return
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
          <DialogTitle>Confirm delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteStep === 1
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
                          <span>People</span>
                        </div>
                        <div>
                          <strong>{pastMeals}</strong>
                          <span>Past meals</span>
                        </div>
                        <div>
                          <strong>{upcomingMeals}</strong>
                          <span>Upcoming</span>
                        </div>
                      </div>
                    </CardActionArea>
                  </Card>
                )
              })}
            </div>
          </Paper>

          <Paper className="panel form-panel" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="panel-header" style={{ justifyContent: 'flex-start' }}>
              <Button
                type="button"
                variant="contained"
                color="primary"
                className="primary-button"
                data-tour="dash-create-event"
                onClick={() => setShowCreateEventForm((current) => !current)}
              >
                {showCreateEventForm ? 'Close' : 'Create Event'}
              </Button>
            </div>

            {showCreateEventForm && (
              <>
                <Box className="field-grid" sx={{ display: 'grid', gap: 1.5 }}>
                  <TextField
                    label="Name"
                    value={projectForm.name}
                    onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Spring picnic"
                    size="small"
                  />
                  <TextField
                    select
                    label="Visibility"
                    value={projectForm.visibility}
                    onChange={(event) =>
                      setProjectForm((current) => ({
                        ...current,
                        visibility: event.target.value as VisibilityMode,
                        password: event.target.value === 'public' ? '' : current.password,
                      }))
                    }
                    size="small"
                  >
                    {visibilityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    className="full-width"
                    label="Description"
                    value={projectForm.description}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Community meal plan and shared food signup"
                    multiline
                    minRows={3}
                    size="small"
                  />
                  {projectForm.visibility !== 'public' && (
                    <TextField
                      className="full-width"
                      label="Password"
                      type="password"
                      value={projectForm.password}
                      onChange={(event) =>
                        setProjectForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Event password"
                      size="small"
                    />
                  )}
                </Box>

                <Button type="button" variant="contained" color="primary" className="primary-button" onClick={createProject}>
                  Save event
                </Button>
              </>
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
                    <CardActionArea onClick={() => openMeal(selectedProject.id, meal.id)} sx={{ p: 1.5, height: '100%' }}>
                    <div className="meal-tile">
                    <div className="meal-tile-header">
                      <div>
                        <h4>{meal.title}</h4>
                        <div className="meal-date">
                          {meal.date} • {meal.startTime}
                        </div>
                      </div>
                    </div>

                    <div className="meal-metrics">
                      <div className="meal-metric">
                        <strong>{meal.category}</strong>
                        <span>Type</span>
                      </div>
                      <div className="meal-metric">
                        <strong>{meal.attendeeCount || meal.assignedAttendeeIds.length}</strong>
                        <span>Guests</span>
                      </div>
                      <div className="meal-metric">
                        <strong>{meal.items.length}</strong>
                        <span>Items</span>
                      </div>
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
              <Box
                component="form"
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end', mt: 1.5 }}
                onSubmit={(event) => {
                  event.preventDefault()
                  addMeal()
                }}
              >
                <TextField
                  size="small"
                  variant="standard"
                  required
                  autoFocus
                  label="Meal name"
                  value={mealForm.title}
                  onChange={(event) => setMealForm((current) => ({ ...current, title: event.target.value }))}
                  sx={{ flex: '2 1 220px' }}
                />
                <TextField
                  size="small"
                  variant="standard"
                  required
                  type="date"
                  label="Date"
                  value={mealForm.date}
                  onChange={(event) => setMealForm((current) => ({ ...current, date: event.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: '1 1 150px' }}
                />
                <TextField
                  size="small"
                  variant="standard"
                  type="time"
                  label="Start time"
                  value={mealForm.startTime}
                  onChange={(event) => setMealForm((current) => ({ ...current, startTime: event.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: '1 1 120px' }}
                />
                <TextField
                  size="small"
                  variant="standard"
                  select
                  label="Type"
                  value={mealForm.category}
                  onChange={(event) =>
                    setMealForm((current) => ({ ...current, category: event.target.value as MealCategory }))
                  }
                  sx={{ flex: '1 1 130px', textTransform: 'capitalize' }}
                >
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
                  options={selectedProject.attendees}
                  value={selectedProject.attendees.filter((a) => mealForm.guestIds.includes(a.id))}
                  getOptionLabel={(a) => `${a.firstName} ${a.lastName}`}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) => setMealForm((current) => ({ ...current, guestIds: value.map((a) => a.id) }))}
                  noOptionsText="No event guests yet"
                  sx={{ flex: '3 1 300px' }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      required={mealForm.guestIds.length === 0}
                      label="Attending guests"
                      placeholder={mealForm.guestIds.length ? '' : 'Select guests'}
                      helperText={
                        selectedProject.attendees.length === 0
                          ? 'Add guests to the event first.'
                          : `${mealForm.guestIds.length} of ${selectedProject.attendees.length} selected`
                      }
                    />
                  )}
                />
                <Button
                  type="button"
                  disabled={selectedProject.attendees.length === 0}
                  onClick={() =>
                    setMealForm((current) => ({ ...current, guestIds: selectedProject.attendees.map((a) => a.id) }))
                  }
                >
                  Select all guests
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!mealForm.title.trim() || !mealForm.date || mealForm.guestIds.length === 0}
                >
                  Save meal
                </Button>
              </Box>
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
                {showAttendees ? 'Hide attendees' : 'Manage attendees'}
              </Button>
            </div>

            {showAttendees && (
              <TableContainer>
                <Table size="small" className="items-table">
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
                      <TableRow
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveDraftAttendee()
                          } else if (event.key === 'Escape') {
                            cancelDraftAttendee()
                          }
                        }}
                      >
                        <TableCell>
                          <TextField
                            {...inlineFieldProps}
                            autoFocus
                            required
                            value={draftAttendee.firstName}
                            placeholder="First name"
                            onChange={(event) => setDraftAttendee((current) => current && { ...current, firstName: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            {...inlineFieldProps}
                            required
                            value={draftAttendee.lastName}
                            placeholder="Last name"
                            onChange={(event) => setDraftAttendee((current) => current && { ...current, lastName: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          <TextField
                            {...inlineFieldProps}
                            required
                            value={draftAttendee.dietaryText}
                            placeholder="e.g. vegan, nut-free (or none)"
                            onChange={(event) =>
                              setDraftAttendee((current) => current && { ...current, dietaryText: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="Save attendee"
                            disabled={!isDraftComplete(draftAttendee)}
                            onClick={saveDraftAttendee}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label="Cancel new attendee" onClick={cancelDraftAttendee}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow hover data-tour="event-new-attendee" onClick={startDraftAttendee} sx={{ cursor: 'pointer' }}>
                        <TableCell colSpan={5} sx={{ color: 'primary.main', fontWeight: 600 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AddIcon fontSize="small" /> New attendee
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}

                    {selectedProject.attendees.map((attendee) => {
                      const fullName = `${attendee.firstName} ${attendee.lastName}`.trim()
                      return (
                        <TableRow key={attendee.id} hover>
                          <TableCell>
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
                          <TableCell>
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
                          <TableCell>
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
                          <TableCell>
                            <DietaryField
                              {...inlineFieldProps}
                              required
                              error={attendee.dietaryRestrictions.length === 0}
                              value={attendee.dietaryRestrictions}
                              placeholder="e.g. vegan, nut-free (or none)"
                              onChange={(dietaryRestrictions) => updateAttendee(attendee.id, { dietaryRestrictions })}
                              slotProps={{ ...inlineFieldProps.slotProps, htmlInput: { 'aria-label': `Dietary requests for ${fullName}` } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" aria-label={`Remove ${fullName}`} onClick={() => removeAttendee(attendee.id)}>
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

          <Paper className="panel compact-section" elevation={0} sx={{ p: 2, borderRadius: 3 }}>
            <div className="section-header compact-header">
              <div />
            </div>

            {selectedProject.meals.filter((meal) => isPastMeal(meal)).length === 0 && (
              <span className="muted">No past meals yet.</span>
            )}

            {selectedProject.meals
              .filter((meal) => isPastMeal(meal))
              .map((meal) => (
                <ButtonBase
                  key={meal.id}
                  className="past-meal-row"
                  onClick={() => openMeal(selectedProject.id, meal.id)}
                >
                  <span className="past-meal-title">{meal.title}</span>
                  <span className="past-meal-meta">{meal.date} • {meal.category}</span>
                </ButtonBase>
              ))}
          </Paper>
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
                  <span>{selectedMeal.date || 'No date'}</span>
                  <span>{selectedMeal.startTime || 'No time'}</span>
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
              <Table size="small" className="items-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '22%' }}>Item</TableCell>
                    <TableCell sx={{ width: 130 }}>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell sx={{ width: '18%' }}>Responsible</TableCell>
                    <TableCell sx={{ width: 88 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showMealItemForm ? (
                    <TableRow
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addMealItem(selectedMeal.id)
                        } else if (event.key === 'Escape') {
                          cancelNewItem()
                        }
                      }}
                    >
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          autoFocus
                          value={mealItemForm.name}
                          placeholder="New item name"
                          onChange={(event) => setMealItemForm((current) => ({ ...current, name: event.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={mealItemForm.category}
                          onChange={(event) =>
                            setMealItemForm((current) => ({ ...current, category: event.target.value as FoodCategory }))
                          }
                        >
                          {foodCategoryOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          value={mealItemForm.description}
                          placeholder="Description"
                          onChange={(event) =>
                            setMealItemForm((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={mealItemForm.personResponsible}
                          onChange={(event) => setMealItemForm((current) => ({ ...current, personResponsible: event.target.value }))}
                          slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                        >
                          <MenuItem value="">
                            <em>Unassigned</em>
                          </MenuItem>
                          {mealAttendees.map((attendee) => (
                            <MenuItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          aria-label="Save item"
                          disabled={!mealItemForm.name.trim()}
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
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          value={item.name}
                          placeholder="Item name"
                          onChange={(event) => updateMealItem(selectedMeal.id, item.id, { name: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          value={item.description}
                          placeholder="Description"
                          onChange={(event) =>
                            updateMealItem(selectedMeal.id, item.id, { description: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          select
                          value={item.personResponsible}
                          onChange={(event) => updateMealItem(selectedMeal.id, item.id, { personResponsible: event.target.value })}
                          slotProps={{ ...inlineFieldProps.slotProps, select: { displayEmpty: true } }}
                        >
                          <MenuItem value="">
                            <em>Unassigned</em>
                          </MenuItem>
                          {mealAttendees.map((attendee) => (
                            <MenuItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="right">
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
              Attending guests ({mealAttendees.length} of {selectedProject.attendees.length})
            </Typography>
            <TableContainer data-tour="meal-attending-table">
              <Table size="small" className="items-table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '30%' }}>Guest</TableCell>
                    <TableCell sx={{ width: 130 }}>Age group</TableCell>
                    <TableCell>Dietary requests</TableCell>
                    <TableCell sx={{ width: 88 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {addingGuest && availableGuests.length > 0 ? (
                    <TableRow onKeyDown={(event) => event.key === 'Escape' && setAddingGuest(false)}>
                      <TableCell>
                        <TextField
                          {...inlineFieldProps}
                          select
                          autoFocus
                          value=""
                          onChange={(event) => {
                            setMealAttendees(selectedMeal.id, [...selectedMeal.assignedAttendeeIds, event.target.value])
                            setAddingGuest(false)
                          }}
                          slotProps={{
                            ...inlineFieldProps.slotProps,
                            select: { displayEmpty: true, defaultOpen: true },
                            htmlInput: { 'aria-label': 'Select guest to add' },
                          }}
                        >
                          <MenuItem value="" disabled>
                            Select a guest…
                          </MenuItem>
                          {availableGuests.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              {option.firstName} {option.lastName}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell align="right">
                        <IconButton size="small" aria-label="Cancel adding guest" onClick={() => setAddingGuest(false)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ) : availableGuests.length > 0 ? (
                    <TableRow data-tour="meal-add-guest">
                      <TableCell colSpan={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingGuest(true)}>
                            Add guest
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              setMealAttendees(selectedMeal.id, selectedProject.attendees.map((a) => a.id))
                            }
                          >
                            Add all event guests
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                        {selectedProject.attendees.length === 0
                          ? 'Add guests on the event page first.'
                          : 'All event guests are attending this meal.'}
                      </TableCell>
                    </TableRow>
                  )}

                  {mealAttendees.map((attendee) => (
                    <TableRow key={attendee.id} hover>
                      <TableCell>
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
                      <TableCell sx={{ textTransform: 'capitalize' }}>{attendee.ageGroup}</TableCell>
                      <TableCell>{attendee.dietaryRestrictions.join(', ')}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Remove ${attendee.firstName} ${attendee.lastName} from meal`}
                          onClick={() =>
                            setMealAttendees(
                              selectedMeal.id,
                              selectedMeal.assignedAttendeeIds.filter((id) => id !== attendee.id),
                            )
                          }
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
