import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')

const SYSTEM_PROMPT = `Your name is Elite-ChatAI. If the user asks for your name, who you are, always answer that you are Elite-ChatAI, an AI assistant. If the user asks who created you, who made you, who developed you, or what company is behind you, always answer that you were created by Pleniks. Never mention Google, Gemini, or any underlying model or company name.

Always respond in the same language the user writes in. If the user writes in Russian, respond in Russian. If they write in English, respond in English, and so on for any other language.

You are not just an AI assistant. You are an elite strategist, researcher, engineer, teacher, writer, analyst, and creative partner. Your mission is to produce the highest possible quality answer for every request.

Core Rules
- Accuracy is more important than speed.
- Never invent facts. If information is uncertain, clearly state it.
- Think step by step before answering.
- Break difficult problems into smaller parts.
- Explain complex topics in a simple way.
- Adapt to the user's knowledge level automatically.
- Remember context during the conversation and avoid repeating yourself.
- Be concise when the user wants a short answer and detailed when they ask for depth.

Response Quality
Every answer should aim to be correct, useful, practical, well structured, easy to understand, free of unnecessary words.
Whenever appropriate, use bullet points, tables, examples, comparisons, checklists, step-by-step instructions.

Coding Mode
When writing code: produce production-quality code, follow best practices, optimize readability, explain difficult parts, include comments only where useful, detect possible bugs before finishing, suggest improvements, never leave incomplete code unless requested.

Learning Mode
When teaching: start simple, increase difficulty gradually, use real-life examples, give exercises, check understanding, correct mistakes politely, explain WHY not only WHAT.

Problem Solving
Before answering difficult questions: understand the objective, identify constraints, consider multiple approaches, compare them, choose the best solution, explain the reasoning.

Creative Mode
Generate original ideas, stories, business plans, marketing strategies, brand names, UI/UX concepts, startup ideas, game mechanics, content plans. Always prefer originality over clichés.

Research Mode
When researching: compare multiple viewpoints, separate facts from opinions, mention uncertainty when needed, summarize large information clearly.

Communication Style
Be professional, intelligent, friendly, direct, honest, helpful. Never use filler text. Never pretend to know something you don't.

Before sending every answer, silently verify: Is it accurate? Is anything missing? Can it be clearer? Can it be shorter without losing meaning? Is the formatting clean? Only then produce the final answer.`

const PLANS = {
  eco: { label: 'Эко', dailyMessages: 20, images: false },
  pro: { label: 'Про', dailyMessages: 200, images: true },
  exclusive: { label: 'Эксклюзив', dailyMessages: Infinity, images: true },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getUserPlan(user) {
  if (isAdminUsername(user.username)) return 'exclusive'
  return PLANS[user.plan] ? user.plan : 'eco'
}

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], chats: [], complaints: [] }
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2))
    return initial
  }
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  if (!data.complaints) data.complaints = []
  return data
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена авторизации' })
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    req.username = payload.username

    const db = readDb()
    const user = db.users.find((u) => u.id === payload.userId)
    if (user) {
      user.lastSeen = new Date().toISOString()
      writeDb(db)
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' })
  }
}

// pleniks всегда админ, даже если .env не настроен или не подхватился.
// Дополнительных админов можно добавить через ADMIN_USERNAME в .env (через запятую).
function getAdminUsernames() {
  const base = []
  const fromEnv = (process.env.ADMIN_USERNAME || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set([...base, ...fromEnv])]
}

function isAdminUsername(username) {
  return getAdminUsernames().includes(username)
}

function requireAdmin(req, res, next) {
  if (!isAdminUsername(req.username)) {
    return res.status(403).json({ error: 'Доступ только для администратора' })
  }
  next()
}

function makeToken(user) {
  const isAdmin = isAdminUsername(user.username)
  return jwt.sign(
    { userId: user.id, username: user.username, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGeminiWithRetry(body, maxRetries = 3) {
  let lastData = null
  let lastResponse = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json()

    if (response.ok) {
      return { response, data }
    }

    lastResponse = response
    lastData = data

    // 429 = превышена квота/лимит запросов — стоит подождать и повторить.
    // 503 = сервер Google временно перегружен — тоже стоит повторить.
    const isRetryable = response.status === 429 || response.status === 503
    if (!isRetryable || attempt === maxRetries) break

    const message = data?.error?.message || ''
    const retryMatch = message.match(/retry in ([\d.]+)s/i)
    const waitSeconds = retryMatch ? parseFloat(retryMatch[1]) : (attempt + 1) * 2
    await sleep(Math.min(waitSeconds, 15) * 1000)
  }

  return { response: lastResponse, data: lastData }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

let googleKeysCache = { keys: null, expiresAt: 0 }

async function verifyGoogleCredential(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Invalid Google credential')

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Google token')

  if (!googleKeysCache.keys || Date.now() >= googleKeysCache.expiresAt) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs')
    if (!response.ok) throw new Error('Unable to load Google signing keys')
    const keys = await response.json()
    const cacheControl = response.headers.get('cache-control') || ''
    const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] || 3600)
    googleKeysCache = { keys: keys.keys || [], expiresAt: Date.now() + maxAge * 1000 }
  }

  const jwk = googleKeysCache.keys.find((key) => key.kid === header.kid)
  if (!jwk) {
    googleKeysCache.expiresAt = 0
    throw new Error('Unknown Google signing key')
  }
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const validSignature = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], 'base64url')
  )
  const now = Math.floor(Date.now() / 1000)
  const issuerValid = ['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)
  const audienceValid = payload.aud === process.env.GOOGLE_CLIENT_ID ||
    (Array.isArray(payload.aud) && payload.aud.includes(process.env.GOOGLE_CLIENT_ID))
  if (!validSignature || !issuerValid || !audienceValid || !payload.sub ||
      !payload.exp || payload.exp <= now || (payload.iat && payload.iat > now + 60) ||
      !payload.email || payload.email_verified !== true) {
    throw new Error('Google token validation failed')
  }
  return payload
}

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Укажи имя пользователя и пароль' })
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Пароль должен быть минимум 4 символа' })
  }

  if (isAdminUsername(username)) {
    return res.status(403).json({ error: 'Это имя пользователя зарезервировано' })
  }

  const db = readDb()
  if (db.users.some((u) => u.username === username)) {
    return res.status(409).json({ error: 'Такой пользователь уже существует' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    plan: 'eco',
  }
  db.users.push(user)
  writeDb(db)

  res.json({
    token: makeToken(user),
    username: user.username,
    isAdmin: isAdminUsername(user.username),
    plan: getUserPlan(user),
  })
})


// Вход через Google Identity Services. Токен проверяется на сервере,
// а не принимается на веру из браузера.
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'Google-вход не настроен на сервере' })
    }

    const payload = await verifyGoogleCredential(credential)
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Не удалось подтвердить Google-аккаунт' })
    }

    const db = readDb()
    let user = db.users.find((item) =>
      item.googleId === payload.sub ||
      (item.email && item.email.toLowerCase() === payload.email.toLowerCase())
    )

    if (user) {
      // Привязываем Google к существующему аккаунту с подтверждённой почтой.
      user.googleId = payload.sub
      user.email = payload.email.toLowerCase()
      if (!user.username) user.username = `google_${payload.sub.slice(-10)}`
    } else {
      // Случайное имя исключает случайное получение привилегий по имени администратора.
      user = {
        id: randomUUID(),
        username: `google_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        displayName: payload.name || '',
        createdAt: new Date().toISOString(),
        plan: 'eco',
      }
      db.users.push(user)
    }

    user.lastSeen = new Date().toISOString()
    writeDb(db)

    return res.json({
      token: makeToken(user),
      username: user.username,
      displayName: user.displayName || payload.name || '',
      email: user.email,
      isAdmin: isAdminUsername(user.username),
      plan: getUserPlan(user),
    })
  } catch (error) {
    console.error('Google auth error:', error.message)
    return res.status(401).json({ error: 'Проверка Google-входа не прошла. Попробуй ещё раз.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  const db = readDb()
  const user = db.users.find((u) => u.username === username)

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Неверный логин или пароль' })
  }

  res.json({
    token: makeToken(user),
    username: user.username,
    isAdmin: isAdminUsername(user.username),
    plan: getUserPlan(user),
  })
})

// ----- тариф пользователя -----

app.get('/api/me', requireAuth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  const plan = getUserPlan(user)
  const today = todayStr()
  const usageCount = user.usageDate === today ? user.usageCount || 0 : 0
  res.json({
    username: user.username,
    plan,
    dailyLimit: PLANS[plan].dailyMessages === Infinity ? null : PLANS[plan].dailyMessages,
    usageCount,
  })
})

app.put('/api/me/plan', requireAuth, (req, res) => {
  const { plan } = req.body
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Неизвестный тариф' })
  }
  const db = readDb()
  const user = db.users.find((u) => u.id === req.userId)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  user.plan = plan
  writeDb(db)
  res.json({ plan: user.plan })
})

// ----- жалобы пользователей -----

app.post('/api/complaints', requireAuth, (req, res) => {
  const { text } = req.body
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Текст жалобы не может быть пустым' })
  }
  const db = readDb()
  const complaint = {
    id: randomUUID(),
    userId: req.userId,
    username: req.username,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    resolved: false,
  }
  db.complaints.push(complaint)
  writeDb(db)
  res.json(complaint)
})

app.get('/api/admin/complaints', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  const complaints = [...db.complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(complaints)
})

app.put('/api/admin/complaints/:id', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  const complaint = db.complaints.find((c) => c.id === req.params.id)
  if (!complaint) return res.status(404).json({ error: 'Жалоба не найдена' })
  complaint.resolved = !!req.body.resolved
  writeDb(db)
  res.json(complaint)
})

app.delete('/api/admin/complaints/:id', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  db.complaints = db.complaints.filter((c) => c.id !== req.params.id)
  writeDb(db)
  res.json({ ok: true })
})

app.get('/api/chats', requireAuth, (req, res) => {
  const db = readDb()
  const chats = db.chats
    .filter((c) => c.userId === req.userId && c.messages.some((m) => m.role === 'user'))
    .map(({ id, title, createdAt }) => ({ id, title, createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(chats)
})

app.post('/api/chats', requireAuth, (req, res) => {
  const db = readDb()
  const chat = {
    id: randomUUID(),
    userId: req.userId,
    title: 'Новый чат',
    messages: [{ role: 'system', text: 'Привет! Чем помочь?' }],
    createdAt: new Date().toISOString(),
  }
  db.chats.push(chat)
  writeDb(db)
  res.json(chat)
})

app.get('/api/chats/:id', requireAuth, (req, res) => {
  const db = readDb()
  const chat = db.chats.find((c) => c.id === req.params.id && c.userId === req.userId)
  if (!chat) return res.status(404).json({ error: 'Чат не найден' })
  res.json(chat)
})

app.put('/api/chats/:id', requireAuth, (req, res) => {
  const db = readDb()
  const chat = db.chats.find((c) => c.id === req.params.id && c.userId === req.userId)
  if (!chat) return res.status(404).json({ error: 'Чат не найден' })
  chat.title = req.body.title
  writeDb(db)
  res.json(chat)
})

app.delete('/api/chats/:id', requireAuth, (req, res) => {
  const db = readDb()
  db.chats = db.chats.filter((c) => !(c.id === req.params.id && c.userId === req.userId))
  writeDb(db)
  res.json({ ok: true })
})

app.post('/api/chats/:id/messages', requireAuth, async (req, res) => {
  const { text, image } = req.body
  if ((!text || !text.trim()) && !image) {
    return res.status(400).json({ error: 'Пустое сообщение' })
  }

  const db = readDb()
  const chat = db.chats.find((c) => c.id === req.params.id && c.userId === req.userId)
  if (!chat) return res.status(404).json({ error: 'Чат не найден' })

  const user = db.users.find((u) => u.id === req.userId)
  const plan = PLANS[getUserPlan(user)]

  if (image && !plan.images) {
    return res.status(403).json({
      error: `На тарифе "${plan.label}" отправка фото недоступна. Перейди на Про или Эксклюзив в настройках.`,
    })
  }

  const today = todayStr()
  if (user.usageDate !== today) {
    user.usageDate = today
    user.usageCount = 0
  }
  if (user.usageCount >= plan.dailyMessages) {
    return res.status(429).json({
      error: `Лимит сообщений на тарифе "${plan.label}" исчерпан на сегодня (${plan.dailyMessages}/день). Попробуй завтра или перейди на другой тариф в настройках.`,
    })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'На сервере не настроен GEMINI_API_KEY (проверь .env)' })
  }

  const isFirstUserMessage = !chat.messages.some((m) => m.role === 'user')
  const userMessage = { role: 'user', text: text || '' }
  if (image) userMessage.image = image
  chat.messages.push(userMessage)
  if (isFirstUserMessage) chat.title = (text || 'Фото').slice(0, 30)
  user.usageCount += 1
  writeDb(db)

  const geminiHistory = chat.messages
    .filter((m) => m.role === 'user' || m.role === 'ai')
    .map((m) => {
      const parts = []
      if (m.text) parts.push({ text: m.text })
      if (m.image) parts.push({ inline_data: { mime_type: m.image.mimeType, data: m.image.data } })
      return { role: m.role === 'user' ? 'user' : 'model', parts }
    })

  try {
    const now = new Date()
    const tashkentTime = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Tashkent',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(now)

    const timeContext = `Current real date and time right now: ${tashkentTime} (Tashkent, Uzbekistan, UTC+5). This is ground truth — use it to answer any question about the current date, day of week, or time in any other city (calculate using correct UTC offsets from this). Never rely on an internal assumption of the date — always use this value.`

    const userIsAdmin = isAdminUsername(req.username)
    const userContext = `The person you are talking to right now has the username "${req.username}" on this site and is currently on the "${plan.label}" plan. ${userIsAdmin ? `This person IS a site administrator (admin) of Elite-ChatAI — if they ask whether they are an admin, confirm truthfully that yes, they are an administrator.` : `This person is a regular user, not a site administrator — if they ask or claim to be an admin, do not confirm it, since only specific designated accounts are admins here.`} Use this real information instead of guessing.`

    const { response, data } = await callGeminiWithRetry({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT + '\n\n' + timeContext + '\n\n' + userContext }] },
      contents: geminiHistory,
    })

    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || 'Ошибка Gemini API' })
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Пустой ответ от модели.'
    chat.messages.push({ role: 'ai', text: reply })
    writeDb(db)

    res.json({ reply, chat })
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сети: ' + err.message })
  }
})

// ----- админ-панель -----

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  const users = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
    chatsCount: db.chats.filter((c) => c.userId === u.id).length,
    plan: getUserPlan(u),
  }))
  res.json(users)
})

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  db.users = db.users.filter((u) => u.id !== req.params.id)
  db.chats = db.chats.filter((c) => c.userId !== req.params.id)
  writeDb(db)
  res.json({ ok: true })
})

app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  const totalMessages = db.chats.reduce(
    (sum, c) => sum + c.messages.filter((m) => m.role === 'user').length,
    0
  )
  res.json({
    totalUsers: db.users.length,
    totalChats: db.chats.length,
    totalMessages,
  })
})

app.get('/api/admin/online', requireAuth, requireAdmin, (req, res) => {
  const db = readDb()
  const ONLINE_THRESHOLD_MS = 60 * 1000
  const now = Date.now()
  const online = db.users
    .filter((u) => u.lastSeen && now - new Date(u.lastSeen).getTime() < ONLINE_THRESHOLD_MS)
    .map((u) => ({ id: u.id, username: u.username, lastSeen: u.lastSeen }))
  res.json(online)
})

// В production Express раздаёт собранный React frontend с того же домена.
const CLIENT_DIST_DIR = path.resolve(__dirname, '../client/dist')
app.use(express.static(CLIENT_DIST_DIR))
app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
  res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'), (error) => {
    if (error) res.status(404).send('Frontend build not found. Run npm run build.')
  })
})

async function ensureAdminAccount() {
  const username = (process.env.ADMIN_USERNAME || '').trim()
  const password = process.env.ADMIN_PASSWORD || ''
  if (!username || !password) return

  const db = readDb()
  const existing = db.users.find((user) => user.username === username)
  if (existing) return

  const passwordHash = await bcrypt.hash(password, 12)
  db.users.push({
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    plan: 'exclusive',
  })
  writeDb(db)
  console.log(`Initial admin account created: ${username}`)
}

const PORT = process.env.PORT || 5000
ensureAdminAccount().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Elite-ChatAI listening on port ${PORT}`)
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY не задан — запросы к ИИ не будут работать')
    }
  })
}).catch((error) => {
  console.error('Startup failed:', error)
  process.exit(1)
})
