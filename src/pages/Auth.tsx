import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { BrandLogo } from '../components/BrandLogo'

export function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await (mode === 'login' ? signIn : signUp)(email.trim(), password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen bg-dirty flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <BrandLogo className="w-full" />
        <div className="g-card space-y-4">
          <div className="grid grid-cols-2 border-3 border-jet">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 font-display ${mode === 'login' ? 'bg-mango' : 'bg-dirty'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 font-display border-l-3 border-jet ${
                mode === 'register' ? 'bg-mango' : 'bg-dirty'
              }`}
            >
              Register
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="g-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              className="g-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            {error && <p className="text-sm font-bold text-traffic">{error}</p>}
            <button type="submit" disabled={busy} className="g-btn-primary w-full">
              {busy ? '...' : mode === 'login' ? 'PASOK' : 'GUMAGAWA'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
