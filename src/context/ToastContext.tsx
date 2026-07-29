import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toastFor } from '../lib/utils'
import type { CoachingStyle } from '../types/database.types'
import { ToastViewport, type ToastItem } from '../components/ui/Toast'
import { useAuth } from './AuthContext'

interface ToastContextValue {
  showToast: (key: string, override?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (key: string, override?: string) => {
      const style = (profile?.coaching_style ?? 'tropa') as CoachingStyle
      const message = override ?? toastFor(style, key)
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, message }])
      window.setTimeout(() => dismiss(id), 3200)
    },
    [profile?.coaching_style, dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
