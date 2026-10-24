# Hariyali API (Express + Node.js + MongoDB)

Backend for the Hariyali React/Vite frontend. It follows the frontend API contract:

- `POST /api/auth/signup` — `{ name, email, password, language }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me` — `{ user: null }` or `{ user }`
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `POST /api/analyze` — multipart form with `images` (1–4), `message`, `crop`, `lang` (`en` or `ur`), optional `conversationId`
- `GET /api/health`

## Requirements

- Node.js 20 or newer
- MongoDB Community running locally, or a MongoDB Atlas connection string

## Install on Windows

Open PowerShell or the VS Code terminal in this folder:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set a unique `JWT_SECRET` of at least 32 characters. For local MongoDB, the example URI works if MongoDB is running on the default port:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/hariyali
CLIENT_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
ANALYSIS_MODE=demo
```

Start the API:

```powershell
npm run dev
```

Health check: open `http://localhost:5000/api/health`.

## Connect the frontend

In `client/.env` (the React/Vite project), set:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:5000
```

Restart Vite after changing environment variables. The frontend's `fetch` calls must use `credentials: 'include'` (the supplied frontend API contract expects cookie authentication). Keep the client origin in `CLIENT_ORIGIN` exactly matched to the URL used by Vite.

## Important: crop analysis is demo-only

`src/services/analyzer.js` returns a clearly qualified demonstration report and does **not** inspect the uploaded image pixels or diagnose crop disease. This is deliberate: a real vision model/provider has not been configured. Before using this with farmers, replace `createDemoReport` with an actual image-analysis service, test it with local crop experts, and retain the agriculture-officer disclaimer. Do not use the demo report to make pesticide decisions.

Uploaded images are held in memory for the request and are **not** stored on disk or in MongoDB. MongoDB stores message metadata and report output. The demo analyzer does not use the image bytes.

## Security and behaviour

- Passwords are hashed with bcrypt; raw passwords are never stored.
- JWT is stored in an HttpOnly cookie, not localStorage.
- API uses Helmet, CORS allow-list, request rate limits, input checks, and upload limits (four images, 8 MB each by default).
- Supported image MIME types: JPEG, PNG, WEBP, HEIC/HEIF.
- For production, use HTTPS, set `COOKIE_SECURE=true`, use a strong secret, configure your exact frontend origin, and add CSRF protection appropriate to your deployment. Review privacy/retention requirements before storing any farmer conversations.

## API response shape

`POST /api/analyze` returns `conversationId` and the report keys expected by the frontend: `photo_ok`, `photo_issue`, `crop`, `overall`, `summary`, `crop_findings`, `field_findings`, `actions`, `avoid`, and `call_expert_if`. It also includes `analysisMode: "demo"` to make the current limitation explicit.
