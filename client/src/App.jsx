import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 border-b border-base-300 px-4">
        <div className="flex-1">
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Elite-ChatAI
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {user && (
            <>
              <Link
                to="/"
                className={`btn btn-sm ${location.pathname === '/' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Чат
              </Link>
              <Link
                to="/settings"
                className={`btn btn-sm ${location.pathname === '/settings' ? 'btn-primary' : 'btn-ghost'}`}
              >
                Настройки
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`btn btn-sm ${location.pathname === '/admin' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Админка
                </Link>
              )}
              <span className="text-sm text-base-content/60 ml-2 hidden sm:inline">{user}</span>
              <button className="btn btn-sm btn-ghost" onClick={handleLogout}>
                Выйти
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
