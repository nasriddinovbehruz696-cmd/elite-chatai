import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleButtonRef = useRef(null)
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    let cancelled = false
    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setError('')
          setLoading(true)
          try {
            await googleLogin(credential)
            navigate('/')
          } catch (err) {
            setError(err.message || 'Не удалось войти через Google')
          } finally {
            setLoading(false)
          }
        },
      })
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: 320,
        locale: 'ru',
      })
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      let script = document.querySelector('script[data-google-identity]')
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.dataset.googleIdentity = 'true'
        script.onload = renderGoogleButton
        document.head.appendChild(script)
      } else {
        script.addEventListener('load', renderGoogleButton, { once: true })
      }
    }

    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-base-100">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm bg-base-200 shadow-xl p-6">
        <h2 className="text-xl font-bold mb-4 text-center">Вход</h2>

        <label className="label">
          <span className="label-text">Имя пользователя</span>
        </label>
        <input
          className="input input-bordered w-full"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="label mt-2">
          <span className="label-text">Пароль</span>
        </label>
        <input
          type="password"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-error text-sm mt-2">{error}</p>}

        <button type="submit" className="btn btn-primary w-full mt-5" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>

        <div className="divider text-base-content/50 text-xs my-4">ИЛИ</div>
        <div className="flex justify-center min-h-10" ref={googleButtonRef} />
        {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <p className="text-xs text-center text-base-content/50 mt-2">
            Чтобы включить Google-вход, добавь VITE_GOOGLE_CLIENT_ID в client/.env
          </p>
        )}

        <p className="text-sm text-center mt-4 text-base-content/60">
          Нет аккаунта?{' '}
          <Link to="/register" className="link link-primary">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  )
}
