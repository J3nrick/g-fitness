export interface ToastItem {
  id: string
  message: string
}

interface ToastViewportProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-0 right-0 z-[100]">
      <div className="mx-auto max-w-md px-4 space-y-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="w-full text-left border-3 border-jet bg-mango shadow-hard px-4 py-3"
          >
            <p className="text-sm font-bold text-jet leading-snug">{toast.message}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
