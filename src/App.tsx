import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { sampleProjects, type Project, type Meal, type MealItem, type VisibilityMode, type FoodCategory, type MealCategory } from './data/sampleData'
import { loadProjects, persistProjects } from './lib/projectService'
import { hasSupabaseConfig } from './lib/supabase'

const ADMIN_KEY = 'feeding-five-thousand-admin'

const mealCategoryOptions: MealCategory[] = ['breakfast', 'lunch', 'dinner']
const foodCategoryOptions: FoodCategory[] = ['drink', 'app', 'salad', 'main', 'side', 'dessert']
const visibilityOptions: { value: VisibilityMode; label: string }[] = [
  { value: 'public', label: 'Fully public' },
  { value: 'public-password', label: 'Public with password' },
  { value: 'private-password', label: 'Private with password' },
]

const defaultProjectForm = {
  name: '',
  description: '',
  visibility: 'public' as VisibilityMode,
  password: '',
}

const defaultMealForm = {
  title: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '12:00',
  category: 'lunch' as MealCategory,
  attendeeCount: 0,
  dietarySummary: '',
  status: 'planned' as Meal['status'],
}

const defaultItemForm = {
  name: '',
  description: '',
  category: 'main' as FoodCategory,
  personResponsible: '',
}

function App() {
  const [projects, setProjects] = useState<Project[]>(sampleProjects)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(sampleProjects[0]?.id ?? '')
  const [projectForm, setProjectForm] = useState(defaultProjectForm)
  const [mealForm, setMealForm] = useState(defaultMealForm)
  const [mealItemForm, setMealItemForm] = useState(defaultItemForm)
  const [projectPasswordInput, setProjectPasswordInput] = useState('')
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [projectAccess, setProjectAccess] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'project' | 'meal' | 'meal-item'
    projectId: string
    mealId?: string
    itemId?: string
  } | null>(null)
  const [deleteStep, setDeleteStep] = useState(0)

  useEffect(() => {
    void persistProjects(projects)
  }, [projects])

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      const savedProjects = await loadProjects()
      if (!mounted) return
      setProjects(savedProjects)
      setSelectedProjectId(savedProjects[0]?.id ?? '')
    }

    void hydrate()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ADMIN_KEY, String(adminMode))
  }, [adminMode])

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId('')
      return
    }

    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const isProjectUnlocked = (project: Project | null) => {
    if (!project) return false
    if (project.visibility === 'public') return true
    if (project.visibility === 'public-password' || project.visibility === 'private-password') {
      return projectAccess[project.id] === true
    }
    return true
  }

  const currentProjectUnlocked = selectedProject ? isProjectUnlocked(selectedProject) : true

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
    setProjectForm(defaultProjectForm)
    setProjectPasswordInput('')
  }

  const updateProject = (updated: Partial<Project>) => {
    if (!selectedProject) return
    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id ? { ...project, ...updated } : project,
      ),
    )
  }

  const addAttendee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get('name') ?? '').trim()
    const restrictionsRaw = String(formData.get('dietaryRestrictions') ?? '').trim()

    if (!name || !selectedProject) return

    const restrictions = restrictionsRaw
      ? restrictionsRaw.split(',').map((item) => item.trim()).filter(Boolean)
      : ['none']

    const nextAttendee = {
      id: `att-${Date.now()}`,
      name,
      dietaryRestrictions: restrictions,
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? { ...project, attendees: [...project.attendees, nextAttendee] }
          : project,
      ),
    )

    form.reset()
  }

  const addMeal = () => {
    if (!selectedProject || !mealForm.title.trim()) return

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      title: mealForm.title.trim(),
      date: mealForm.date,
      startTime: mealForm.startTime,
      category: mealForm.category,
      attendeeCount: mealForm.attendeeCount,
      dietarySummary: mealForm.dietarySummary.trim(),
      status: mealForm.status,
      assignedAttendeeIds: [],
      items: [],
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? { ...project, meals: [...project.meals, newMeal] }
          : project,
      ),
    )

    setMealForm(defaultMealForm)
  }

  const updateMeal = (mealId: string, updates: Partial<Meal>) => {
    if (!selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id !== selectedProject.id
          ? project
          : {
              ...project,
              meals: project.meals.map((meal) =>
                meal.id === mealId ? { ...meal, ...updates } : meal,
              ),
            },
      ),
    )
  }

  const addMealItem = (mealId: string) => {
    if (!selectedProject || !mealItemForm.name.trim()) return

    const nextItem: MealItem = {
      id: `item-${Date.now()}`,
      name: mealItemForm.name.trim(),
      description: mealItemForm.description.trim(),
      category: mealItemForm.category,
      personResponsible: mealItemForm.personResponsible.trim() || 'TBD',
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
  }

  const updateMealItem = (mealId: string, itemId: string, nextItem: Partial<MealItem>) => {
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
                      items: meal.items.map((item) =>
                        item.id === itemId ? { ...item, ...nextItem } : item,
                      ),
                    },
              ),
            },
      ),
    )
  }

  const requestDelete = (type: 'project' | 'meal' | 'meal-item', projectId: string, mealId?: string, itemId?: string) => {
    setDeleteTarget({ type, projectId, mealId, itemId })
    setDeleteStep(1)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return

    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }

    if (deleteTarget.type === 'project') {
      setProjects((current) => current.filter((project) => project.id !== deleteTarget.projectId))
    }

    if (deleteTarget.type === 'meal' && deleteTarget.projectId && deleteTarget.mealId) {
      setProjects((current) =>
        current.map((project) =>
          project.id !== deleteTarget.projectId
            ? project
            : { ...project, meals: project.meals.filter((meal) => meal.id !== deleteTarget.mealId) },
        ),
      )
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
      <header className="topbar">
        <div>
          <p className="eyebrow">Group meal planning</p>
          <h1>Feeding Five Thousand</h1>
        </div>

        <div className="topbar-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={adminMode}
              onChange={(event) => setAdminMode(event.target.checked)}
            />
            <span>Admin mode</span>
          </label>
          <span className={`status-pill ${hasSupabaseConfig ? 'connected' : 'demo'}`}>
            {hasSupabaseConfig ? 'Supabase ready' : 'Local demo mode'}
          </span>
        </div>
      </header>

      {deleteTarget && (
        <div className="delete-modal">
          <div className="delete-card">
            <h3>Confirm delete</h3>
            <p>
              {deleteStep === 1
                ? 'This action is destructive. Please confirm to continue.'
                : 'This is the final confirmation. Delete this item permanently?'}
            </p>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={cancelDelete}>Cancel</button>
              <button type="button" className="danger-button" onClick={confirmDelete}>
                {deleteStep === 1 ? 'Confirm delete' : 'Delete now'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <section className="card">
            <h2>Projects</h2>
            <div className="project-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-item ${selectedProjectId === project.id ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <small>{project.visibility}</small>
                  </div>
                  <span>{project.meals.length} meals</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card form-card">
            <h3>New project</h3>
            <div className="field-grid">
              <label>
                <span>Name</span>
                <input
                  value={projectForm.name}
                  onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Spring picnic"
                />
              </label>
              <label>
                <span>Visibility</span>
                <select
                  value={projectForm.visibility}
                  onChange={(event) =>
                    setProjectForm((current) => ({
                      ...current,
                      visibility: event.target.value as VisibilityMode,
                      password: event.target.value === 'public' ? '' : current.password,
                    }))
                  }
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Community potluck and meal plan"
                />
              </label>
              {projectForm.visibility !== 'public' && (
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={projectForm.password}
                    onChange={(event) => setProjectForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Project password"
                  />
                </label>
              )}
            </div>
            <button type="button" className="primary-button" onClick={createProject}>Create project</button>
          </section>
        </aside>

        <section className="main-panel">
          {!selectedProject && <div className="empty-card">Create a project to start planning meals.</div>}

          {selectedProject && !currentProjectUnlocked && (
            <div className="card lock-card">
              <h2>{selectedProject.name}</h2>
              <p>This project is protected. Enter the project password to access the planning details.</p>
              <div className="password-row">
                <input
                  type="password"
                  value={projectPasswordInput}
                  onChange={(event) => setProjectPasswordInput(event.target.value)}
                  placeholder="Enter project password"
                />
                <button type="button" className="primary-button" onClick={unlockProject}>Unlock</button>
              </div>
            </div>
          )}

          {selectedProject && currentProjectUnlocked && (
            <>
              <section className="card project-header-card">
                <div className="project-header-row">
                  <div>
                    <p className="eyebrow">Project</p>
                    <h2>{selectedProject.name}</h2>
                  </div>
                  <div className="project-actions">
                    {adminMode && (
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => requestDelete('project', selectedProject.id)}
                      >
                        Delete project
                      </button>
                    )}
                  </div>
                </div>

                <label className="field-block">
                  <span>Project name</span>
                  <input
                    value={selectedProject.name}
                    onChange={(event) => updateProject({ name: event.target.value })}
                  />
                </label>

                <label className="field-block">
                  <span>Description</span>
                  <textarea
                    value={selectedProject.description}
                    onChange={(event) => updateProject({ description: event.target.value })}
                  />
                </label>

                <div className="project-meta-row">
                  <label>
                    <span>Visibility</span>
                    <select
                      value={selectedProject.visibility}
                      onChange={(event) =>
                        updateProject({
                          visibility: event.target.value as VisibilityMode,
                          password:
                            event.target.value === 'public'
                              ? undefined
                              : selectedProject.password || 'project-password',
                        })
                      }
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedProject.visibility !== 'public' && (
                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        value={selectedProject.password ?? ''}
                        onChange={(event) => updateProject({ password: event.target.value })}
                      />
                    </label>
                  )}
                </div>
              </section>

              <section className="card stacked-card">
                <div className="section-header">
                  <h3>Attendees</h3>
                </div>

                <form className="attendee-form" onSubmit={addAttendee}>
                  <input type="text" name="name" placeholder="Name" />
                  <input type="text" name="dietaryRestrictions" placeholder="Dietary restrictions (comma separated)" />
                  <button type="submit" className="primary-button">Add attendee</button>
                </form>

                <div className="chip-list">
                  {selectedProject.attendees.length === 0 && <span className="muted">No attendees yet.</span>}
                  {selectedProject.attendees.map((attendee) => (
                    <div key={attendee.id} className="chip-card">
                      <strong>{attendee.name}</strong>
                      <span>{attendee.dietaryRestrictions.join(', ') || 'No restrictions'}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card stacked-card">
                <div className="section-header">
                  <h3>Meals</h3>
                </div>

                <div className="meal-form-grid">
                  <label>
                    <span>Meal title</span>
                    <input
                      value={mealForm.title}
                      onChange={(event) => setMealForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Saturday breakfast"
                    />
                  </label>
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={mealForm.date}
                      onChange={(event) => setMealForm((current) => ({ ...current, date: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Start time</span>
                    <input
                      type="time"
                      value={mealForm.startTime}
                      onChange={(event) => setMealForm((current) => ({ ...current, startTime: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <select
                      value={mealForm.category}
                      onChange={(event) => setMealForm((current) => ({ ...current, category: event.target.value as MealCategory }))}
                    >
                      {mealCategoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Attendee count</span>
                    <input
                      type="number"
                      min="0"
                      value={mealForm.attendeeCount}
                      onChange={(event) =>
                        setMealForm((current) => ({ ...current, attendeeCount: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={mealForm.status}
                      onChange={(event) =>
                        setMealForm((current) => ({ ...current, status: event.target.value as Meal['status'] }))
                      }
                    >
                      <option value="planned">Planned</option>
                      <option value="needs-volunteers">Needs volunteers</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="complete">Complete</option>
                    </select>
                  </label>
                  <label className="full-width">
                    <span>Dietary summary</span>
                    <input
                      value={mealForm.dietarySummary}
                      onChange={(event) => setMealForm((current) => ({ ...current, dietarySummary: event.target.value }))}
                      placeholder="Vegetarian and nut-free options required"
                    />
                  </label>
                </div>
                <button type="button" className="primary-button" onClick={addMeal}>Add meal</button>

                <div className="meal-list">
                  {selectedProject.meals.length === 0 && <p className="muted">No meals added yet.</p>}
                  {selectedProject.meals.map((meal) => (
                    <div key={meal.id} className="meal-card">
                      <div className="meal-card-header">
                        <div>
                          <h4>{meal.title}</h4>
                          <p>
                            {meal.date} • {meal.startTime} • {meal.category}
                          </p>
                        </div>
                        <div className="meal-card-actions">
                          <span className="badge">{meal.status}</span>
                          {adminMode && (
                            <button
                              type="button"
                              className="link-button danger"
                              onClick={() => requestDelete('meal', selectedProject.id, meal.id)}
                            >
                              Delete meal
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="meal-editor-grid">
                        <label>
                          <span>Meal title</span>
                          <input
                            value={meal.title}
                            onChange={(event) => updateMeal(meal.id, { title: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Date</span>
                          <input
                            type="date"
                            value={meal.date}
                            onChange={(event) => updateMeal(meal.id, { date: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Time</span>
                          <input
                            type="time"
                            value={meal.startTime}
                            onChange={(event) => updateMeal(meal.id, { startTime: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>Category</span>
                          <select
                            value={meal.category}
                            onChange={(event) => updateMeal(meal.id, { category: event.target.value as MealCategory })}
                          >
                            {mealCategoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Attendee count</span>
                          <input
                            type="number"
                            min="0"
                            value={meal.attendeeCount}
                            onChange={(event) => updateMeal(meal.id, { attendeeCount: Number(event.target.value) })}
                          />
                        </label>
                        <label>
                          <span>Status</span>
                          <select
                            value={meal.status}
                            onChange={(event) => updateMeal(meal.id, { status: event.target.value as Meal['status'] })}
                          >
                            <option value="planned">Planned</option>
                            <option value="needs-volunteers">Needs volunteers</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="complete">Complete</option>
                          </select>
                        </label>
                        <label className="full-width">
                          <span>Assigned attendees</span>
                          <select
                            multiple
                            value={meal.assignedAttendeeIds}
                            onChange={(event) => {
                              const selected = Array.from(event.target.selectedOptions, (option) => option.value)
                              updateMeal(meal.id, { assignedAttendeeIds: selected })
                            }}
                          >
                            {selectedProject.attendees.map((attendee) => (
                              <option key={attendee.id} value={attendee.id}>
                                {attendee.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="full-width">
                          <span>Dietary summary</span>
                          <input
                            value={meal.dietarySummary}
                            onChange={(event) => updateMeal(meal.id, { dietarySummary: event.target.value })}
                          />
                        </label>
                      </div>

                      <div className="meal-item-block">
                        <div className="section-header compact">
                          <h5>Meal items</h5>
                        </div>

                        <div className="meal-item-form">
                          <input
                            value={mealItemForm.name}
                            onChange={(event) => setMealItemForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Food item name"
                          />
                          <input
                            value={mealItemForm.description}
                            onChange={(event) => setMealItemForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Description"
                          />
                          <select
                            value={mealItemForm.category}
                            onChange={(event) =>
                              setMealItemForm((current) => ({ ...current, category: event.target.value as FoodCategory }))
                            }
                          >
                            {foodCategoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <input
                            value={mealItemForm.personResponsible}
                            onChange={(event) =>
                              setMealItemForm((current) => ({ ...current, personResponsible: event.target.value }))
                            }
                            placeholder="Responsible person"
                          />
                          <button type="button" className="primary-button" onClick={() => addMealItem(meal.id)}>
                            Add item
                          </button>
                        </div>

                        <div className="item-list">
                          {meal.items.length === 0 && <p className="muted">No food items added yet.</p>}
                          {meal.items.map((item) => (
                            <div key={item.id} className="item-card">
                              <div className="item-row">
                                <input
                                  value={item.name}
                                  onChange={(event) =>
                                    updateMealItem(meal.id, item.id, { name: event.target.value })
                                  }
                                />
                                <input
                                  value={item.personResponsible}
                                  onChange={(event) =>
                                    updateMealItem(meal.id, item.id, { personResponsible: event.target.value })
                                  }
                                />
                              </div>
                              <div className="item-row">
                                <input
                                  value={item.description}
                                  onChange={(event) =>
                                    updateMealItem(meal.id, item.id, { description: event.target.value })
                                  }
                                />
                                <select
                                  value={item.category}
                                  onChange={(event) =>
                                    updateMealItem(meal.id, item.id, { category: event.target.value as FoodCategory })
                                  }
                                >
                                  {foodCategoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="item-actions">
                                <button
                                  type="button"
                                  className="link-button"
                                  onClick={() => requestDelete('meal-item', selectedProject.id, meal.id, item.id)}
                                >
                                  Delete item
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
