import { useMemo, useState } from 'react'
import { Camera, Copy, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { demoGet, demoSet, todayISO } from '../lib/demoMode'
import { getExtProfile, getFoods, newEmptyFood, saveFoods, type UserFood, uid } from '../lib/store'
import { FoodScannerModal } from '../components/FoodScannerModal'
import type { ScannedFood } from '../hooks/useFoodScanner'

interface MealEntry {
  id: string
  food_id: string
  food?: UserFood
  consumed_at: string
}

export function Meals() {
  const { showToast } = useToast()
  const profile = getExtProfile()
  const [foods, setFoods] = useState(getFoods)
  const [logs, setLogs] = useState<MealEntry[]>(() =>
    demoGet<MealEntry[]>(`meals_${todayISO()}`, []),
  )
  const [editing, setEditing] = useState<UserFood | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [query, setQuery] = useState('')

  const totals = useMemo(
    () =>
      logs.reduce(
        (acc, log) => {
          const food = log.food ?? foods.find((f) => f.id === log.food_id)
          acc.calories += food?.calories ?? 0
          acc.protein += food?.protein ?? 0
          acc.carbs += food?.carbs ?? 0
          acc.fat += food?.fat ?? 0
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [logs, foods],
  )

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...foods]
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name))
  }, [foods, query])

  function persist(next: UserFood[]) {
    setFoods(next)
    saveFoods(next)
  }

  function handleScanMeal(items: ScannedFood[]) {
    const newLogs = [...logs]
    const newFoods = [...foods]
    for (const item of items) {
      const food: UserFood = {
        id: uid(),
        name: item.food_name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        is_favorite: false,
      }
      if (!newFoods.some((f) => f.name.toLowerCase() === food.name.toLowerCase())) {
        newFoods.push(food)
      }
      newLogs.unshift({
        id: uid(),
        food_id: food.id,
        food,
        consumed_at: new Date().toISOString(),
      })
    }
    saveFoods(newFoods)
    setFoods(newFoods)
    setLogs(newLogs)
    demoSet(`meals_${todayISO()}`, newLogs)
    showToast('meal', `AI Scan: +${items.length} food items logged`)
  }

  function logFood(food: UserFood) {
    const entry: MealEntry = {
      id: uid(),
      food_id: food.id,
      food,
      consumed_at: new Date().toISOString(),
    }
    const next = [entry, ...logs]
    setLogs(next)
    demoSet(`meals_${todayISO()}`, next)
    showToast('meal')
  }

  function removeMealLog(id: string) {
    const next = logs.filter((l) => l.id !== id)
    setLogs(next)
    demoSet(`meals_${todayISO()}`, next)
    showToast('deleted')
  }

  function duplicateFood(food: UserFood) {
    const dup: UserFood = { ...food, id: uid(), name: `${food.name} (Copy)` }
    persist([...foods, dup])
    showToast('saved', `${dup.name} duplicated`)
  }

  function saveEditor() {
    if (!editing) return
    const cleaned = { ...editing, name: editing.name.trim() || 'Untitled Food' }
    const exists = foods.some((f) => f.id === cleaned.id)
    persist(exists ? foods.map((f) => (f.id === cleaned.id ? cleaned : f)) : [...foods, cleaned])
    setEditing(null)
    showToast('saved')
  }

  if (editing) {
    return (
      <div className="g-page">
        <header className="border-3 border-jet bg-jet text-dirty p-3 shadow-hard">
          <h1 className="font-display text-lg">FOOD</h1>
          <p className="text-sm mt-1">Create what you actually eat.</p>
        </header>
        <label className="g-label">Name</label>
        <input
          className="g-input"
          value={editing.name}
          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['calories', 'Calories'],
              ['protein', 'Protein'],
              ['carbs', 'Carbs'],
              ['fat', 'Fat'],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label className="g-label">{label}</label>
              <input
                type="number"
                className="g-input mt-1"
                value={editing[field]}
                onChange={(e) =>
                  setEditing({ ...editing, [field]: Number(e.target.value) || 0 })
                }
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`g-btn-ghost w-full ${editing.is_favorite ? 'bg-mango' : ''}`}
          onClick={() => setEditing({ ...editing, is_favorite: !editing.is_favorite })}
        >
          <Star size={14} className="inline mr-2" />
          {editing.is_favorite ? 'Favorited' : 'Favorite'}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="g-btn-ghost" onClick={() => setEditing(null)}>
            Cancel
          </button>
          <button type="button" className="g-btn-primary" onClick={saveEditor}>
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="g-page">
      {showScanner && (
        <FoodScannerModal
          onClose={() => setShowScanner(false)}
          onLogMeal={handleScanMeal}
        />
      )}

      <header className="border-3 border-jet bg-mango text-jet p-3 shadow-hard">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-lg">LAMON</h1>
            <p className="mt-2 text-sm font-medium">Your foods. Your macros. Tap. Done.</p>
          </div>
          <button
            type="button"
            className="g-btn bg-jeepney text-dirty shadow-hardSm px-3 py-2 flex items-center gap-1.5 text-xs"
            onClick={() => setShowScanner(true)}
          >
            <Camera size={16} />
            AI SNAP
          </button>
        </div>
      </header>

      <div className="g-card grid grid-cols-4 gap-2">
        <div>
          <p className="g-label">Calories</p>
          <p className="font-mono text-lg font-bold">
            {Math.round(totals.calories)}
            <span className="text-[10px] text-asphalt font-sans block">/{profile.daily_calories}</span>
          </p>
          <div className="mt-1 h-2 border-2 border-jet bg-dirty">
            <div
              className="h-full bg-jeepney"
              style={{ width: `${Math.min(100, (totals.calories / profile.daily_calories) * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <p className="g-label">Protein</p>
          <p className="font-mono text-lg font-bold text-malunggay">
            {Math.round(totals.protein)}g
          </p>
          <div className="mt-1 h-2 border-2 border-jet bg-dirty">
            <div
              className="h-full bg-malunggay"
              style={{ width: `${Math.min(100, (totals.protein / profile.daily_protein) * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <p className="g-label">Carbs</p>
          <p className="font-mono text-lg font-bold text-mango">{Math.round(totals.carbs)}g</p>
        </div>
        <div>
          <p className="g-label">Fat</p>
          <p className="font-mono text-lg font-bold text-traffic">{Math.round(totals.fat)}g</p>
        </div>
      </div>

      {/* Today's logged meals */}
      {logs.length > 0 && (
        <div className="g-card !p-0 overflow-hidden">
          <div className="bg-jet text-dirty px-4 py-2 font-display text-lg">TODAY&apos;S MEALS</div>
          <ul>
            {logs.map((log) => {
              const food = log.food ?? foods.find((f) => f.id === log.food_id)
              return (
                <li key={log.id} className="border-t-3 border-jet px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{food?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-asphalt">
                      {food?.calories ?? 0} kcal · P{food?.protein ?? 0} C{food?.carbs ?? 0} F{food?.fat ?? 0}
                    </p>
                  </div>
                  <button type="button" className="g-btn-ghost !p-1" onClick={() => removeMealLog(log.id)}>
                    <X size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-asphalt" />
        <input
          className="g-input !pl-9"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <button type="button" className="g-btn-accent w-full" onClick={() => setEditing(newEmptyFood())}>
        <Plus size={16} className="inline mr-2" />
        Add Food
      </button>

      {filteredFoods.length === 0 && (
        <div className="g-card text-center py-8">
          <p className="font-display text-lg">WALANG FOOD PA</p>
          <p className="text-xs text-asphalt mt-1">Create your first food or use AI Snap.</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredFoods.map((food) => (
          <div key={food.id} className="g-card flex items-center gap-2 !py-3">
            <button type="button" className="flex-1 text-left" onClick={() => logFood(food)}>
              <p className="font-bold flex items-center gap-2">
                {food.is_favorite && <Star size={12} className="text-jeepney fill-jeepney" />}
                {food.name}
              </p>
              <p className="text-xs text-asphalt mt-0.5">
                {food.calories} kcal · P{food.protein} C{food.carbs} F{food.fat}
              </p>
            </button>
            <button type="button" className="g-btn-primary !px-3 !py-2 text-xs" onClick={() => logFood(food)}>
              + Kain
            </button>
            <button type="button" className="g-btn-ghost !px-2" onClick={() => setEditing(food)}>
              <Pencil size={14} />
            </button>
            <button type="button" className="g-btn-ghost !px-2" onClick={() => duplicateFood(food)}>
              <Copy size={14} />
            </button>
            <button
              type="button"
              className="g-btn-ghost !px-2"
              onClick={() => {
                if (window.confirm(`Delete "${food.name}"?`)) {
                  persist(foods.filter((f) => f.id !== food.id))
                  showToast('deleted')
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
