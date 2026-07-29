import { Flame, Trophy } from 'lucide-react'
import type { CoachingStyle } from '../../types/database.types'

export interface VictoryStats {
  volumeKg: number
  setsCompleted: number
  durationSec: number
  hitPR: boolean
  isMinimumDose?: boolean
}

interface VictoryOverlayProps {
  open: boolean
  style: CoachingStyle
  stats: VictoryStats
  onDone: () => void
}

const QUOTES: Record<CoachingStyle, { normal: string; pr: string; dose: string }> = {
  chill: {
    normal: 'Magaling. Natapos mo ang target mo ngayon.',
    pr: 'New personal record. Quiet strength, big consistency.',
    dose: 'Ten minutes still counts. Discipline protected.',
  },
  tropa: {
    normal: 'Solid bro! Heto ang sinasabing disiplina.',
    pr: 'PR! Sino nagturo sa\'yo niyan? Ang galing mo today.',
    dose: 'Katamad mode closed. Pakita ka — panalo ka na.',
  },
  real_talk: {
    normal: 'Tangina, tinapos mo! Isa na namang panalo ngayon.',
    pr: 'Gago... panibagong PR. Sino nagturo sa\'yo niyan?',
    dose: '10 minutes lang pero hindi zero day. Ganyan dapat.',
  },
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function VictoryOverlay({ open, style, stats, onDone }: VictoryOverlayProps) {
  if (!open) return null

  const quotePack = QUOTES[style] ?? QUOTES.tropa
  const quote = stats.isMinimumDose
    ? quotePack.dose
    : stats.hitPR
      ? quotePack.pr
      : quotePack.normal

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-2xl flex flex-col justify-center items-center p-6 animate-fade-up">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-energy/30 bg-energy/10 animate-energy">
          {stats.hitPR ? (
            <Trophy className="text-energy" size={36} />
          ) : (
            <Flame className="text-energy" size={36} />
          )}
        </div>

        <div>
          <p className="g-label text-energy">
            {stats.isMinimumDose ? 'Katamad Cleared' : stats.hitPR ? 'Personal Record' : 'Session Complete'}
          </p>
          <h2 className="g-display mt-2">G! Panalo</h2>
          <p className="mt-4 text-lg leading-snug text-white/90 px-2">{quote}</p>
        </div>

        <div className="g-card grid grid-cols-3 gap-3 !p-4 border-white/10 bg-gradient-to-br from-card to-card/50">
          <div>
            <p className="g-label">Volume</p>
            <p className="g-value text-lg mt-1">{Math.round(stats.volumeKg)}</p>
            <p className="text-[10px] text-muted">kg</p>
          </div>
          <div>
            <p className="g-label">Sets</p>
            <p className="g-value text-lg mt-1">{stats.setsCompleted}</p>
            <p className="text-[10px] text-muted">done</p>
          </div>
          <div>
            <p className="g-label">Time</p>
            <p className="g-value text-lg mt-1">{formatDuration(stats.durationSec)}</p>
            <p className="text-[10px] text-muted">elapsed</p>
          </div>
        </div>

        <div className="g-card !p-4 border-dashed border-white/10 text-left">
          <p className="g-label mb-2">Share Preview</p>
          <p className="text-sm text-secondaryText">
            {stats.setsCompleted} sets · {Math.round(stats.volumeKg)}kg volume · {formatDuration(stats.durationSec)}
          </p>
          <p className="mt-2 text-xs text-muted">G! — Tara. Simulan natin.</p>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="g-btn w-full rounded-xl bg-white text-background py-4 text-base font-bold"
        >
          Tapos Na / Done
        </button>
      </div>
    </div>
  )
}
