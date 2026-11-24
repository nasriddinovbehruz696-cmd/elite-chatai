# Elite-ChatAI — full-stack

React (Vite + Tailwind + DaisyUI + React Router) фронтенд + Express бэкенд с настоящей авторизацией.

## Структура

```
gemini-fullstack/
├── server/   — Express API в одном файле server.js (регистрация/логин, чаты, вызовы Gemini)
└── client/   — React приложение
```

## Возможности

- Регистрация и вход (пароли хешируются bcrypt, сессия — JWT токен)
- Несколько чатов, история сохраняется на сервере
- Ответы в формате markdown (жирный текст, списки, код — рендерятся красиво)
- Можно прикреплять фото в чат (кнопка "+" или Ctrl+V) — ИИ их анализирует
- Аватарка для ИИ — своя картинка в настройках
- ИИ всегда знает текущую дату и время (Ташкент, UTC+5) и может считать время в любом городе мира
- Отвечает на том языке, на котором пишет пользователь — любом
- Модель называет себя "Elite-ChatAI", не упоминает Google/Gemini
- Несколько тем оформления

## Запуск

### 1. Сервер

```bash
cd server
npm install
```

Скопируй `.env.example` в `.env`:

```bash
cp .env.example .env
```

Открой `.env` и вставь свой ключ:

```
GEMINI_API_KEY=твой_ключ_с_aistudio.google.com
JWT_SECRET=любая_случайная_строка
PORT=5000
```

Запусти сервер:

```bash
npm run dev
```

Должно вывести: `Server running on http://localhost:5000`

### 2. Клиент (в новом терминале)

```bash
cd client
npm install
npm run dev
```

Открой адрес, который покажет Vite (обычно `http://localhost:5173`).

## Важно про безопасность

- Никогда не коммить `.env` в git — он уже в `.gitignore`
- `data/db.json` тоже в `.gitignore`


## Вход через Google

1. В Google Cloud Console создай OAuth Client ID типа **Web application** и настрой OAuth consent screen.
2. В Authorized JavaScript origins добавь адрес сайта, например `http://localhost:5173`.
3. В `server/.env` укажи `GOOGLE_CLIENT_ID=...`.
4. Создай `client/.env` по примеру `client/.env.example` и укажи тот же ID в `VITE_GOOGLE_CLIENT_ID=...`.
5. Перезапусти сервер и Vite-клиент.

Google ID token проверяется сервером через Google Auth Library. Существующий аккаунт с той же подтверждённой почтой будет связан с Google-входом; новый Google-пользователь получит отдельный аккаунт. Для production добавь домен сайта в Authorized JavaScript origins и используй HTTPS.


## Деплой на Railway
Смотри подробную инструкцию в [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md). Для одного Railway-сервиса используются корневые npm workspaces: `npm run build` и `npm start`.
