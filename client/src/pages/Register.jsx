import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(username, password)
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
        <h2 className="text-xl font-bold mb-4 text-center">Регистрация</h2>

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
        <p className="text-xs text-base-content/50 mt-1">Минимум 4 символа</p>

        {error && <p className="text-error text-sm mt-2">{error}</p>}

        <button type="submit" className="btn btn-primary w-full mt-5" disabled={loading}>
          {loading ? 'Создаём...' : 'Создать аккаунт'}
        </button>

        <p className="text-sm text-center mt-4 text-base-content/60">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="link link-primary">
            Войти
          </Link>
        </p>
      </form>
    </div>
  )
}
