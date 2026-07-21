import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'

function getFriendlyAuthError(message: string) {
  const normalisedMessage = message.toLowerCase()

  if (normalisedMessage.includes('invalid login credentials')) {
    return 'The email or password does not look right. Please check the details and try again.'
  }

  if (normalisedMessage.includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }

  if (normalisedMessage.includes('supabase env variables')) {
    return 'Supabase is not configured locally yet. Add your project URL and anon key to .env.'
  }

  return message || 'Sign in failed. Please try again.'
}

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const { error } = await signIn(email.trim(), password)

    if (error) {
      setErrorMessage(getFriendlyAuthError(error.message))
    }

    setIsSubmitting(false)
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="AlliDesk sign in">
        <div className="login-brand">
          <img src="/assets/Allidesk_Main_Logo%20copy.png" alt="AlliDesk" />
        </div>

        <div className="login-copy">
          <p>Welcome back</p>
          <h1>Sign in to AlliDesk</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage && (
            <div className="login-error" role="alert">
              {errorMessage}
            </div>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" className="login-forgot-link">
          Forgot Password
        </button>
      </section>
    </main>
  )
}
