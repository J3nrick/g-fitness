import { useState } from 'react'
import { Camera, Check, Loader2, Minus, Plus, X } from 'lucide-react'
import { useFoodScanner, type ScannedFood, type ScannedResult } from '../hooks/useFoodScanner'

interface Props {
  onClose: () => void
  onLogMeal: (items: ScannedFood[]) => void
}

const COACH_LINES = [
  'Ayan, na-detect agad. Pindutin mo na para ma-record.',
  'Solid! Kung tama na, i-save mo na.',
  'Mukhang masarap yan ah. Log mo na!',
  'Ayos ang protein dyan. Save na!',
]

function adjustGrams(item: ScannedFood, delta: number): ScannedFood {
  const oldG = item.estimated_grams
  const newG = Math.max(10, oldG + delta)
  const ratio = newG / oldG
  return {
    ...item,
    estimated_grams: newG,
    calories: Math.round(item.calories * ratio),
    protein: Math.round(item.protein * ratio),
    carbs: Math.round(item.carbs * ratio),
    fat: Math.round(item.fat * ratio),
  }
}

export function FoodScannerModal({ onClose, onLogMeal }: Props) {
  const { scanFoodImage, loading, error } = useFoodScanner()
  const [result, setResult] = useState<ScannedResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const coachLine = COACH_LINES[Math.floor(Math.random() * COACH_LINES.length)]

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      setPreview(base64)
      const data = await scanFoodImage(base64)
      if (data) setResult(data)
    }
    reader.readAsDataURL(file)
  }

  function updateItem(index: number, delta: number) {
    if (!result) return
    const updated = result.items.map((item, i) => (i === index ? adjustGrams(item, delta) : item))
    setResult({
      items: updated,
      total_calories: updated.reduce((s, i) => s + i.calories, 0),
      total_protein: updated.reduce((s, i) => s + i.protein, 0),
      total_carbs: updated.reduce((s, i) => s + i.carbs, 0),
      total_fat: updated.reduce((s, i) => s + i.fat, 0),
    })
  }

  function removeItem(index: number) {
    if (!result) return
    const updated = result.items.filter((_, i) => i !== index)
    setResult({
      items: updated,
      total_calories: updated.reduce((s, i) => s + i.calories, 0),
      total_protein: updated.reduce((s, i) => s + i.protein, 0),
      total_carbs: updated.reduce((s, i) => s + i.carbs, 0),
      total_fat: updated.reduce((s, i) => s + i.fat, 0),
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-jet/90 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="bg-dirty border-3 border-jet shadow-hardLg w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 g-btn-ghost !p-1.5"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="border-b-3 border-jet bg-jeepney text-dirty p-4">
          <h3 className="font-display text-lg">LAMON SCAN</h3>
          <p className="text-xs mt-1 opacity-80">Picture lang. Kami na bahala.</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Upload area */}
          {!result && !loading && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-jet p-4 cursor-pointer bg-concrete hover:bg-mango/20 transition-colors">
              {preview ? (
                <img src={preview} alt="Food" className="w-full max-h-40 object-cover border-3 border-jet" />
              ) : (
                <>
                  <Camera size={36} className="text-jeepney mb-2" />
                  <span className="font-display text-sm">KUMUHA NG LITRATO</span>
                  <span className="text-xs text-asphalt mt-1">o pumili mula sa Gallery</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
                className="hidden"
              />
            </label>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              {preview && (
                <img src={preview} alt="Scanning" className="w-full max-h-32 object-cover border-3 border-jet mb-2" />
              )}
              <Loader2 size={32} className="animate-spin text-jeepney" />
              <p className="font-display text-sm">TINATANTYA ANG MACROS...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="g-card-white !bg-jeepney/10 border-jeepney">
              <p className="text-sm text-jeepney font-bold">{error}</p>
              <button
                type="button"
                className="g-btn-ghost mt-2 text-xs"
                onClick={() => {
                  setResult(null)
                  setPreview(null)
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {result && result.items.length > 0 && (
            <div className="space-y-3">
              <p className="g-label">Detected Food</p>

              {result.items.map((item, idx) => (
                <div key={idx} className="g-card !p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-bold capitalize">{item.food_name}</p>
                      <p className="text-xs text-asphalt">
                        ~{item.estimated_grams}g
                        {item.confidence < 80 && (
                          <span className="ml-2 text-traffic">({item.confidence}% sure)</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="g-btn-ghost !p-1"
                      onClick={() => removeItem(idx)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Portion adjuster */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="g-btn-ghost !p-1"
                      onClick={() => updateItem(idx, -25)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono text-sm font-bold flex-1 text-center">
                      {item.estimated_grams}g
                    </span>
                    <button
                      type="button"
                      className="g-btn-ghost !p-1"
                      onClick={() => updateItem(idx, 25)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div className="bg-dirty border-3 border-jet p-1.5">
                      <span className="g-label !text-[10px]">Kcal</span>
                      <span className="block font-mono font-bold">{item.calories}</span>
                    </div>
                    <div className="bg-dirty border-3 border-jet p-1.5">
                      <span className="g-label !text-[10px]">P</span>
                      <span className="block font-mono font-bold text-malunggay">{item.protein}g</span>
                    </div>
                    <div className="bg-dirty border-3 border-jet p-1.5">
                      <span className="g-label !text-[10px]">C</span>
                      <span className="block font-mono font-bold text-mango">{item.carbs}g</span>
                    </div>
                    <div className="bg-dirty border-3 border-jet p-1.5">
                      <span className="g-label !text-[10px]">F</span>
                      <span className="block font-mono font-bold text-traffic">{item.fat}g</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="g-card-white">
                <p className="g-label mb-2">Total Estimated</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="font-mono text-lg font-bold">{result.total_calories}</span>
                    <span className="block text-xs text-asphalt">kcal</span>
                  </div>
                  <div>
                    <span className="font-mono text-lg font-bold text-malunggay">{result.total_protein}g</span>
                    <span className="block text-xs text-asphalt">protein</span>
                  </div>
                  <div>
                    <span className="font-mono text-lg font-bold text-mango">{result.total_carbs}g</span>
                    <span className="block text-xs text-asphalt">carbs</span>
                  </div>
                  <div>
                    <span className="font-mono text-lg font-bold text-traffic">{result.total_fat}g</span>
                    <span className="block text-xs text-asphalt">fat</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-asphalt italic text-center">"{coachLine}"</p>

              <button
                type="button"
                className="g-btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => {
                  onLogMeal(result.items)
                  onClose()
                }}
              >
                <Check size={18} />
                LOG MEAL NOW
              </button>
              <button
                type="button"
                className="g-btn-ghost w-full text-xs"
                onClick={() => {
                  setResult(null)
                  setPreview(null)
                }}
              >
                Scan Again
              </button>
            </div>
          )}

          {result && result.items.length === 0 && (
            <div className="text-center py-8">
              <p className="font-display text-lg">WALANG NA-DETECT</p>
              <p className="text-xs text-asphalt mt-1">Subukan mo ulit na mas malinaw ang picture.</p>
              <button
                type="button"
                className="g-btn-ghost mt-3"
                onClick={() => {
                  setResult(null)
                  setPreview(null)
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
