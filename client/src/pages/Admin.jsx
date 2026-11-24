import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [usersData, statsData, onlineData, complaintsData] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetStats(),
        api.adminGetOnline(),
        api.adminGetComplaints(),
      ])
      setUsers(usersData)
      setStats(statsData)
      setOnlineUsers(onlineData)
      setComplaints(complaintsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(async () => {
      try {
        const online = await api.adminGetOnline()
        setOnlineUsers(online)
      } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  async function handleDelete(id, username) {
    if (!confirm(`Удалить пользователя "${username}" и все его чаты?`)) return
    await api.adminDeleteUser(id)
    load()
  }

  async function handleToggleResolved(id, resolved) {
    await api.adminResolveComplaint(id, resolved)
    load()
  }

  async function handleDeleteComplaint(id) {
    await api.adminDeleteComplaint(id)
    load()
  }

  if (loading) {
    return <p className="text-center text-base-content/50 mt-10">Загрузка...</p>
  }

  if (error) {
    return <p className="text-center text-error mt-10">{error}</p>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      <h2 className="text-2xl font-bold mb-6">Админ-панель</h2>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Пользователей</div>
            <div className="stat-value text-primary">{stats.totalUsers}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Чатов</div>
            <div className="stat-value text-primary">{stats.totalChats}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Сообщений</div>
            <div className="stat-value text-primary">{stats.totalMessages}</div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Сейчас онлайн ({onlineUsers.length})</h3>
        {onlineUsers.length === 0 ? (
          <p className="text-base-content/40 text-sm">Никого нет онлайн</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <span key={u.id} className="badge badge-lg gap-2 bg-base-200 border-base-300">
                <span className="w-2 h-2 rounded-full bg-success inline-block"></span>
                {u.username}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Жалобы ({complaints.filter((c) => !c.resolved).length} новых)
        </h3>
        {complaints.length === 0 ? (
          <p className="text-base-content/40 text-sm">Жалоб пока нет</p>
        ) : (
          <div className="space-y-2">
            {complaints.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-lg border ${
                  c.resolved ? 'border-base-300 bg-base-200/50 opacity-60' : 'border-warning bg-base-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{c.username}</span>
                  <span className="text-xs text-base-content/40">
                    {new Date(c.createdAt).toLocaleString('ru-RU')}
                  </span>
                </div>
                <p className="text-sm mb-2">{c.text}</p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => handleToggleResolved(c.id, !c.resolved)}
                  >
                    {c.resolved ? 'Вернуть в новые' : 'Отметить решённой'}
                  </button>
                  <button
                    className="btn btn-xs btn-error btn-outline"
                    onClick={() => handleDeleteComplaint(c.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Тариф</th>
              <th>Чатов</th>
              <th>Дата регистрации</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.username}</td>
                <td className="capitalize">{u.plan}</td>
                <td>{u.chatsCount}</td>
                <td className="text-base-content/60">
                  {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  <button
                    className="btn btn-xs btn-error btn-outline"
                    onClick={() => handleDelete(u.id, u.username)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-base-content/40 mt-6">Пользователей пока нет</p>
        )}
      </div>
    </div>
  )
}
