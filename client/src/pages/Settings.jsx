import { useState, useRef, useEffect } from 'react'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const THEMES = ['night', 'dark', 'light', 'synthwave']

const PLANS = [
  { id: 'eco', label: 'Эко', price: 'Бесплатно', features: ['20 сообщений в день', 'Без фото'] },
  {
    id: 'pro',
    label: 'Про',
    price: '49 000 сум / мес',
    features: ['200 сообщений в день', 'Отправка фото'],
  },
  {
    id: 'exclusive',
    label: 'Эксклюзив',
    price: '99 000 сум / мес',
    features: ['Без лимита сообщений', 'Отправка фото', 'Приоритет'],
  },
]

export default function Settings() {
  const { isAdmin } = useAuth()
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'night'
  )
  const [avatar, setAvatar] = useState(localStorage.getItem('gemini_ai_avatar') || null)
  const fileInputRef = useRef(null)

  const [me, setMe] = useState(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [complaintText, setComplaintText] = useState('')
  const [complaintStatus, setComplaintStatus] = useState('')

  useEffect(() => {
    api.getMe().then(setMe).catch(() => {})
  }, [])

  async function handlePlanChange(planId) {
    setPlanSaving(true)
    try {
      await api.setPlan(planId)
      const updated = await api.getMe()
      setMe(updated)
    } finally {
      setPlanSaving(false)
    }
  }

  async function handleSubmitComplaint() {
    if (!complaintText.trim()) return
    try {
      await api.submitComplaint(complaintText.trim())
      setComplaintText('')
      setComplaintStatus('Жалоба отправлена админу ✓')
      setTimeout(() => setComplaintStatus(''), 3000)
    } catch (err) {
      setComplaintStatus('Ошибка: ' + err.message)
    }
  }

  function handleThemeChange(t) {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('gemini_theme', t)
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      localStorage.setItem('gemini_ai_avatar', dataUrl)
      setAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveAvatar() {
    localStorage.removeItem('gemini_ai_avatar')
    setAvatar(null)
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-2">Аватарка ИИ</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {avatar ? (
              <img src={avatar} alt="avatar" className="object-cover w-full h-full" />
            ) : (
              <span className="text-2xl">🤖</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button className="btn btn-sm btn-primary" onClick={() => fileInputRef.current?.click()}>
              Загрузить фото
            </button>
            {avatar && (
              <button className="btn btn-sm btn-ghost" onClick={handleRemoveAvatar}>
                Убрать
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Тема оформления</h2>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`btn btn-sm capitalize ${theme === t ? 'btn-primary' : 'btn-outline'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Тариф</h2>
        {isAdmin && (
          <p className="text-sm text-success mb-3">
            Ты администратор — Эксклюзив доступен бесплатно и без лимитов.
          </p>
        )}
        {me && !isAdmin && (
          <p className="text-sm text-base-content/60 mb-3">
            Сегодня использовано: {me.usageCount}/{me.dailyLimit == null ? '∞' : me.dailyLimit}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map((p) => {
            const isCurrent = isAdmin ? p.id === 'exclusive' : me?.plan === p.id
            return (
              <div
                key={p.id}
                className={`card p-4 border-2 ${
                  isCurrent ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200'
                }`}
              >
                <h3 className="font-bold">{p.label}</h3>
                <p className="text-xs text-base-content/50 mb-2">
                  {isAdmin && p.id === 'exclusive' ? 'Бесплатно (админ)' : p.price}
                </p>
                <ul className="text-xs text-base-content/70 space-y-1 mb-3">
                  {p.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  className={`btn btn-xs w-full ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                  disabled={isCurrent || planSaving || isAdmin}
                  onClick={() => handlePlanChange(p.id)}
                >
                  {isCurrent ? 'Текущий' : 'Выбрать'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Написать админу</h2>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Опиши проблему или предложение..."
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
        />
        <button className="btn btn-sm btn-primary mt-2" onClick={handleSubmitComplaint}>
          Отправить
        </button>
        {complaintStatus && (
          <p className="text-sm text-base-content/60 mt-2">{complaintStatus}</p>
        )}
      </div>

      <div className="text-sm text-base-content/60 leading-relaxed">
        Ключ Gemini API хранится на сервере в файле{' '}
        <code className="bg-base-300 px-1 rounded">server/.env</code>, а не в браузере.
      </div>
    </div>
  )
}
