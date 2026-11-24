# Развёртывание Elite-ChatAI на Railway (один сервис)

## Что настроено в проекте
- Корневой `package.json` с npm workspaces: Railway устанавливает зависимости `client` и `server`.
- `npm run build` собирает Vite frontend.
- `npm start` запускает Express API, который одновременно раздаёт `client/dist`.
- Express слушает `0.0.0.0:$PORT`, а `/api/health` используется для health check.
- База JSON может храниться в Railway Volume через `DATA_DIR=/data`.

## Переменные Railway (Service → Variables)
Обязательные:
- `GEMINI_API_KEY` — ключ Gemini API.
- `JWT_SECRET` — длинная случайная секретная строка.
- `DATA_DIR=/data` — путь к подключённому Volume.

Google Sign-In (если используешь):
- `GOOGLE_CLIENT_ID` — OAuth Web Client ID для проверки токена сервером.
- `VITE_GOOGLE_CLIENT_ID` — тот же самый Client ID; он встраивается в frontend во время build.

Необязательный администратор (создаётся при первом запуске, если заданы оба значения):
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Не добавляй API keys, JWT secret или пароли в GitHub, исходники или `VITE_*` переменные. `VITE_*` доступны в браузере; для Google Client ID это нормально, для секретов — нет.

## Railway настройки
1. Залей весь каталог `gemini-fullstack` в GitHub как один репозиторий. Не загружай `.env`, `node_modules` или реальные ключи.
2. Railway → New Project → Deploy from GitHub Repo → выбери репозиторий. Root Directory оставь `/`.
3. Railway подхватит `railway.json`: Build Command `npm run build`, Start Command `npm start`.
4. В Service → Variables добавь переменные из списка выше. `PORT` вручную не задавай: Railway предоставляет его сам.
5. В Service → Volumes создай Volume и укажи Mount Path `/data`. Это важно: без Volume JSON-база будет находиться на временном диске и может потеряться при новом deployment.
6. В Settings → Networking нажми Generate Domain. Открой выданный `https://...` адрес.
7. Проверь `https://ТВОЙ-ДОМЕН/api/health` — ответ должен быть `{"ok":true}`.

## Google OAuth после получения домена
В Google Cloud Console открой OAuth Client типа Web application и добавь точный Railway-домен в Authorized JavaScript origins, например `https://your-app.up.railway.app`. Сохрани изменения. В Railway должны быть заданы оба значения `GOOGLE_CLIENT_ID` и `VITE_GOOGLE_CLIENT_ID` (одинаковые), затем сделай Redeploy, потому что VITE-переменная нужна во время сборки frontend.

## Важное про данные
Существующая локальная база `server/data/db.json` автоматически не переносится на Railway. Если в ней есть нужные пользователи/чаты, сделай резервную копию до публикации и отдельно перенеси её в Volume.
