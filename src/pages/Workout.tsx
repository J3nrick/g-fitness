import { useMemo, useState } from 'react'
import { Copy, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { ExerciseGuide } from '../components/workout/ExerciseGuide'
import {
  duplicatePlan,
  getExercises,
  getPlans,
  newEmptyExercise,
  newEmptyPlan,
  saveExercises,
  savePlans,
  type PlanItem,
  type UserExercise,
  type UserWorkoutPlan,
  uid,
} from '../lib/store'

type Tab = 'plans' | 'exercises' | 'library'

export function Workout() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('plans')
  const [plans, setPlans] = useState(getPlans)
  const [exercises, setExercises] = useState(getExercises)
  const [editingPlan, setEditingPlan] = useState<UserWorkoutPlan | null>(null)
  const [editingExercise, setEditingExercise] = useState<UserExercise | null>(null)
  const [query, setQuery] = useState('')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [guideName, setGuideName] = useState<string | null>(null)

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q))
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name))
  }, [exercises, query])

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISE_LIBRARY.filter(
      (e) => !q || e.name.toLowerCase().includes(q) || e.primary.toLowerCase().includes(q),
    )
  }, [query])

  function openGuide(id?: string, name?: string) {
    setGuideId(id ?? null)
    setGuideName(name ?? null)
  }

  function importLibraryExercise(id: string) {
    const lib = EXERCISE_LIBRARY.find((e) => e.id === id)
    if (!lib) return
    if (!exercises.some((e) => e.id === lib.id || e.name === lib.name)) {
      persistExercises([
        ...exercises,
        {
          id: lib.id,
          name: lib.name,
          muscle_group: lib.primary,
          notes: lib.tips.join(' '),
          is_favorite: false,
        },
      ])
      showToast('saved', `${lib.name} added`)
    }
    openGuide(lib.id, lib.name)
  }

  function persistPlans(next: UserWorkoutPlan[]) {
    setPlans(next)
    savePlans(next)
  }

  function persistExercises(next: UserExercise[]) {
    setExercises(next)
    saveExercises(next)
  }

  function savePlanEditor() {
    if (!editingPlan) return
    const cleaned = {
      ...editingPlan,
      name: editingPlan.name.trim() || 'Untitled Workout',
      items: editingPlan.items.map((item, i) => ({ ...item, sort_order: i })),
    }
    const exists = plans.some((p) => p.id === cleaned.id)
    const next = exists
      ? plans.map((p) => (p.id === cleaned.id ? cleaned : p))
      : [...plans, cleaned]
    persistPlans(next)
    setEditingPlan(null)
    showToast('saved')
  }

  function saveExerciseEditor() {
    if (!editingExercise) return
    const cleaned = {
      ...editingExercise,
      name: editingExercise.name.trim() || 'Untitled Exercise',
    }
    const exists = exercises.some((e) => e.id === cleaned.id)
    const next = exists
      ? exercises.map((e) => (e.id === cleaned.id ? cleaned : e))
      : [...exercises, cleaned]
    persistExercises(next)
    setEditingExercise(null)
    showToast('saved')
  }

  function addItemToPlan() {
    if (!editingPlan) return
    const first = exercises[0]
    const item: PlanItem = {
      id: uid(),
      exercise_id: first?.id ?? '',
      exercise_name: first?.name ?? 'Exercise',
      sets: 3,
      reps: 10,
      weight: 0,
      rest_seconds: 60,
      notes: '',
      sort_order: editingPlan.items.length,
    }
    setEditingPlan({ ...editingPlan, items: [...editingPlan.items, item] })
  }

  if (guideId || guideName) {
    return (
      <div className="g-page">
        <ExerciseGuide
          exerciseId={guideId ?? undefined}
          exerciseName={guideName ?? undefined}
          onClose={() => {
            setGuideId(null)
            setGuideName(null)
          }}
        />
      </div>
    )
  }

  if (editingPlan) {
    return (
      <div className="g-page">
        <header className="border-3 border-jet bg-jet text-dirty p-4 shadow-hard">
          <p className="g-label text-dirty/70">Edit Workout</p>
          <h1 className="font-display text-3xl mt-1">BAKAL</h1>
        </header>

        <label className="g-label">Workout Name</label>
        <input
          className="g-input"
          value={editingPlan.name}
          onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
        />

        <label className="g-label">Description</label>
        <input
          className="g-input"
          value={editingPlan.description}
          onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
        />

        <div className="space-y-3">
          {editingPlan.items.map((item, idx) => (
            <div key={item.id} className="g-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">#{idx + 1}</p>
                <button
                  type="button"
                  className="g-btn-ghost !py-1 !px-2 text-traffic"
                  onClick={() =>
                    setEditingPlan({
                      ...editingPlan,
                      items: editingPlan.items.filter((i) => i.id !== item.id),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <select
                className="g-input"
                value={item.exercise_id}
                onChange={(e) => {
                  const ex = exercises.find((x) => x.id === e.target.value)
                  setEditingPlan({
                    ...editingPlan,
                    items: editingPlan.items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            exercise_id: e.target.value,
                            exercise_name: ex?.name ?? i.exercise_name,
                          }
                        : i,
                    ),
                  })
                }}
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['sets', 'Sets'],
                    ['reps', 'Reps'],
                    ['weight', 'Kg'],
                    ['rest_seconds', 'Rest'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <p className="g-label mb-1">{label}</p>
                    <input
                      type="number"
                      className="g-input !px-2"
                      value={item[field]}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          items: editingPlan.items.map((i) =>
                            i.id === item.id
                              ? { ...i, [field]: Number(e.target.value) || 0 }
                              : i,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <input
                className="g-input"
                placeholder="Notes"
                value={item.notes}
                onChange={(e) =>
                  setEditingPlan({
                    ...editingPlan,
                    items: editingPlan.items.map((i) =>
                      i.id === item.id ? { ...i, notes: e.target.value } : i,
                    ),
                  })
                }
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="g-btn-ghost text-xs"
                  disabled={idx === 0}
                  onClick={() => {
                    const items = [...editingPlan.items]
                    ;[items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]
                    setEditingPlan({ ...editingPlan, items })
                  }}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="g-btn-ghost text-xs"
                  disabled={idx === editingPlan.items.length - 1}
                  onClick={() => {
                    const items = [...editingPlan.items]
                    ;[items[idx + 1], items[idx]] = [items[idx], items[idx + 1]]
                    setEditingPlan({ ...editingPlan, items })
                  }}
                >
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="g-btn-ghost w-full" onClick={addItemToPlan}>
          <Plus size={16} className="inline mr-2" />
          Add Exercise
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="g-btn-ghost" onClick={() => setEditingPlan(null)}>
            Cancel
          </button>
          <button type="button" className="g-btn-primary" onClick={savePlanEditor}>
            Save
          </button>
        </div>
      </div>
    )
  }

  if (editingExercise) {
    return (
      <div className="g-page">
        <header className="border-3 border-jet bg-jet text-dirty p-4 shadow-hard">
          <p className="g-label text-dirty/70">Exercise</p>
          <h1 className="font-display text-3xl mt-1">LIBRARY</h1>
        </header>
        <label className="g-label">Name</label>
        <input
          className="g-input"
          value={editingExercise.name}
          onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
          placeholder="Anime Power Up Pushups"
        />
        <label className="g-label">Muscle Group</label>
        <input
          className="g-input"
          value={editingExercise.muscle_group}
          onChange={(e) => setEditingExercise({ ...editingExercise, muscle_group: e.target.value })}
        />
        <label className="g-label">Notes</label>
        <textarea
          className="g-input min-h-[90px]"
          value={editingExercise.notes}
          onChange={(e) => setEditingExercise({ ...editingExercise, notes: e.target.value })}
        />
        <button
          type="button"
          className={`g-btn-ghost w-full ${editingExercise.is_favorite ? 'bg-mango' : ''}`}
          onClick={() =>
            setEditingExercise({ ...editingExercise, is_favorite: !editingExercise.is_favorite })
          }
        >
          <Star size={14} className="inline mr-2" />
          {editingExercise.is_favorite ? 'Favorited' : 'Favorite'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="g-btn-ghost" onClick={() => setEditingExercise(null)}>
            Cancel
          </button>
          <button type="button" className="g-btn-primary" onClick={saveExerciseEditor}>
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-jeepney text-dirty p-4 shadow-hard">
        <h1 className="font-display text-5xl">BAKAL</h1>
        <p className="mt-2 text-sm font-medium">Build. Edit. Duplicate. Delete. Yours.</p>
      </header>

      <div className="grid grid-cols-3 border-3 border-jet shadow-hard">
        {([
          ['plans', 'Workouts'],
          ['exercises', 'Mine'],
          ['library', 'Guides'],
        ] as [Tab, string][]).map(([t, label], idx) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`py-3 font-display uppercase text-xs ${
              tab === t ? 'bg-mango text-jet' : 'bg-dirty text-asphalt'
            } ${idx < 2 ? 'border-r-3 border-jet' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'plans' ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt" />
            <input
              className="g-input !pl-9"
              placeholder="Search workouts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="g-btn-accent w-full"
            onClick={() => setEditingPlan(newEmptyPlan())}
          >
            <Plus size={16} className="inline mr-2" />
            Create Workout
          </button>

          {plans.length === 0 && (
            <div className="g-card text-center py-8">
              <p className="font-display text-lg">WALANG WORKOUT PA</p>
              <p className="text-xs text-asphalt mt-1">Create your first workout or run Setup to auto-generate.</p>
            </div>
          )}

          <div className="space-y-3">
            {plans.filter((p) => {
              const q = query.trim().toLowerCase()
              return !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
            }).map((plan) => (
              <div key={plan.id} className="g-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl">{plan.name}</h2>
                    <p className="text-sm text-asphalt mt-1">
                      {plan.items.length} exercises · {plan.description || 'No notes'}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm border-t-3 border-jet pt-3">
                  {plan.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="font-medium flex justify-between gap-2">
                      <span>
                        {item.exercise_name}{' '}
                        <span className="font-mono text-asphalt">
                          {item.sets}×{item.reps}
                          {item.weight ? ` @ ${item.weight}kg` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold uppercase text-jeepney"
                        onClick={() => openGuide(item.exercise_id, item.exercise_name)}
                      >
                        How
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    className="g-btn-primary !text-xs col-span-2"
                    onClick={() => navigate(`/bakal/active?plan=${plan.id}`)}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    className="g-btn-ghost !px-2"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="g-btn-ghost !px-2"
                    onClick={() => {
                      persistPlans([...plans, duplicatePlan(plan)])
                      showToast('saved')
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-traffic uppercase"
                  onClick={() => {
                    if (window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) {
                      persistPlans(plans.filter((p) => p.id !== plan.id))
                      showToast('deleted')
                    }
                  }}
                >
                  Delete workout
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="g-btn-ghost w-full"
            onClick={() => navigate('/bakal/active')}
          >
            Start Empty Session
          </button>
        </>
      ) : tab === 'library' ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt" />
            <input
              className="g-input !pl-9"
              placeholder="Search guides..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold uppercase text-asphalt">Local library · offline · no API limits</p>
          {filteredLibrary.length === 0 && (
            <div className="g-card text-center py-6">
              <p className="font-display text-base">NO RESULTS</p>
              <p className="text-xs text-asphalt mt-1">Try a different search term.</p>
            </div>
          )}
          <div className="space-y-2">
            {filteredLibrary.map((ex) => (
              <div key={ex.id} className="g-card flex items-center justify-between gap-2 !py-3">
                <button type="button" className="text-left flex-1" onClick={() => openGuide(ex.id, ex.name)}>
                  <p className="font-bold">{ex.name}</p>
                  <p className="text-xs text-asphalt uppercase mt-0.5">
                    {ex.primary} · {ex.difficulty}
                  </p>
                </button>
                <button
                  type="button"
                  className="g-btn-primary !px-3 !py-2 text-xs"
                  onClick={() => importLibraryExercise(ex.id)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt" />
            <input
              className="g-input !pl-9"
              placeholder="Search exercises..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="g-btn-accent w-full"
            onClick={() => setEditingExercise(newEmptyExercise())}
          >
            <Plus size={16} className="inline mr-2" />
            Create Exercise
          </button>
          {filteredExercises.length === 0 && (
            <div className="g-card text-center py-6">
              <p className="font-display text-base">NO EXERCISES</p>
              <p className="text-xs text-asphalt mt-1">Create one or import from the Guides tab.</p>
            </div>
          )}
          <div className="space-y-2">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="g-card flex items-center justify-between gap-2 !py-3">
                <button
                  type="button"
                  className="text-left flex-1"
                  onClick={() => setEditingExercise(ex)}
                >
                  <p className="font-bold flex items-center gap-2">
                    {ex.is_favorite && <Star size={12} className="text-jeepney fill-jeepney" />}
                    {ex.name}
                  </p>
                  <p className="text-xs text-asphalt uppercase mt-0.5">{ex.muscle_group}</p>
                </button>
                <button
                  type="button"
                  className="g-btn-ghost !px-2"
                  onClick={() => {
                    if (window.confirm(`Delete "${ex.name}"?`)) {
                      persistExercises(exercises.filter((e) => e.id !== ex.id))
                      showToast('deleted')
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
