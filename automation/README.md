# Automated Disaster Alerts — n8n

n8n polls **GDACS** (global disaster feed, no API key), keeps only **Orange/Red** alerts within **300 km of Lahore**, removes duplicates, and POSTs new alerts to the website.

```
Schedule (every 2 min) ──► GDACS RSS ──► filter 300 km + dedupe ──┬──► POST /api/alerts/ingest
                                                                  └──► Discord webhook
Manual "Test Alert" ─────────────────────────────────────────────┘
```

Lahore: `31.5204, 74.3587`. Radius: `300 km`. Feed: `https://www.gdacs.org/xml/rss.xml`.

The scheduled feed is real, so it may legitimately return 0 alerts near Lahore during judging. The **Test Alert (Manual)** trigger sends a fake Lahore flood through the exact same POST node — use that for the live demo.

## Real data vs test data

- **Scheduled path — real.** It downloads the live GDACS feed (317 items at the time of writing) and keeps Orange/Red events inside the radius. Right now that is **0 near Lahore**, which is correct behavior, not a bug. The n8n execution view proves the feed was fetched.
- **Test Alert — synthetic.** It creates a `TEST-...` alert with `"test": true` and sends it through the same filter/POST path. It exists so the demo always has something to show.
- **Mock receiver — not a data source.** It only stores and displays whatever n8n POSTs. It invents nothing.

For the demo: show the **Fetch GDACS Feed** node output (hundreds of real events), then run **Test Alert (Manual)** and show the alert appear on the site. Say plainly that the live feed had no qualifying event near Lahore that minute, so the test trigger is simulating one.

## Setup (5 minutes)

1. Start n8n:

   ```bash
   npx n8n
   ```

   It opens at <http://localhost:5678>.

2. In n8n: **Workflows → Import from File** → `automation/disaster-alerts.n8n.json`.

3. Start the mock website receiver (stand-in for the real backend):

   ```bash
   node automation/mock-website.mjs
   ```

4. Open **Test Alert (Manual)** → click **Execute workflow**. Then open <http://localhost:5057> — the alert appears there.

5. **Activate** the workflow so the 2-minute schedule runs.

No API key, no credentials, no Telegram, no env vars.

## Automatic flow (no clicks)

Once the workflow is **Active**:

1. Every 2 minutes n8n fetches GDACS.
2. It filters to Orange/Red within 300 km of Lahore and drops duplicates.
3. Each new alert is POSTed to the website **and** sent to Discord in parallel.
4. The frontend polls `GET /api/alerts` every ~15 seconds and renders it.

There is no manual step in the real flow. The **Test Alert** trigger exists only for verification and demos.

## Discord alerts

1. In Discord: channel → **Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL**.
2. In n8n: open **Notify Discord** and replace `REPLACE_WITH_YOUR_WEBHOOK` with that URL.
3. Run **Test Alert (Manual)** — the message appears in the channel.

Discord and the website run in parallel: if Discord fails, the website still receives the alert (`Continue On Fail` is enabled on both HTTP nodes).

The webhook URL is a secret. Don't commit the real URL; rotate it if it leaks.

## Agent quickstart

Run these from the repository root. Expected output is noted after each step.

1. **Check Node** — `node -v` → `v20` or newer.
2. **Terminal A** — `npx n8n` → wait for `Editor is now accessible via: http://localhost:5678`. First run may take 1–2 minutes and ask you to create a local owner account (any email/password).
3. **Terminal B** — `node automation/mock-website.mjs` → `Mock website on http://localhost:5057`.
4. **Import** — in n8n: **Workflows → Create Workflow → ⋯ → Import from File** → `automation/disaster-alerts.n8n.json` → **Cmd/Ctrl+S**.
   CLI alternative (n8n must be stopped): `npx n8n import:workflow --input=automation/disaster-alerts.n8n.json`.
5. **Test** — open the **Test Alert (Manual)** node → **Execute workflow**. Expect green ticks on all three nodes and HTTP `201` on **Send to Website**.
6. **Verify** — `curl -s http://localhost:5057/api/alerts` → JSON containing `"id": "TEST-..."`. The same alert appears at <http://localhost:5057>.
7. **Activate** — toggle **Active** (top right). The 2-minute schedule now runs.

No secrets are needed. Nothing outside this repository is modified.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `port 5678 is already in use` | n8n is already running | Open <http://localhost:5678> instead of starting another |
| `port 5057` busy | Another process uses it | `MOCK_PORT=5058 node automation/mock-website.mjs`, then change the URL in **Send to Website** |
| `access to env vars denied` | Old workflow version | Re-import `automation/disaster-alerts.n8n.json` |
| Page at 5057 is empty | Mock not running, or wrong URL in **Send to Website** | Start the mock; the node URL must end in `/api/alerts/ingest` |
| No scheduled alerts | Feed has no Orange/Red events within 300 km (normal) | Use **Test Alert (Manual)** for the demo |
| Workflow never fires | Not activated | Toggle **Active**, or click **Execute workflow** manually |

## Files

| File | Purpose |
|---|---|
| `disaster-alerts.n8n.json` | Importable n8n workflow (schedule + manual test + POST) |
| `mock-website.mjs` | Local stand-in backend at `:5057`; prints received alerts and serves a live page |
| `README.md` | This guide |

## Point it at the real backend

Open the **Send to Website** node and replace the URL with the real endpoint, e.g. `http://localhost:5000/api/alerts/ingest`. Save, then re-run the test.

## Test with webhook.site instead

Get a temporary URL from <https://webhook.site>, paste it into the **Send to Website** node, and run the manual trigger. The JSON payload appears on webhook.site.

## Payload sent to the website

`POST /api/alerts/ingest` with `Content-Type: application/json`:

```json
{
  "id": "1573578-1742347",
  "type": "earthquake",
  "title": "Orange earthquake (Magnitude 5.9M) in Pakistan",
  "severity": "orange",
  "country": "Pakistan",
  "lat": 31.5204,
  "lng": 74.3587,
  "distanceKm": 42,
  "source": "GDACS",
  "url": "https://www.gdacs.org/...",
  "detectedAt": "2026-10-24T09:20:00.000Z"
}
```

Test alerts also include `"test": true`.

The backend should store the alert and expose it to the frontend (`GET /api/alerts`, polling every ~15 s, or SSE). Duplicate protection lives in n8n, so the same GDACS event is only sent once.

## Integrating with the real website

The workflow is already finished. Integration only means pointing it at a real endpoint and displaying what it sends. **Treat the payload above as the API contract** — the backend should match it, not the other way round. That way the automation needs no changes.

### Backend (teammate)

Two endpoints are enough:

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/api/alerts/ingest` | Validate `id` + `title`, store newest-first (cap ~50), return `201 { "ok": true, "id": ... }` |
| `GET` | `/api/alerts` | Return the stored alerts, newest first |

Minimal Express 5 (CommonJS) version — the same behavior as `automation/mock-website.mjs`:

```js
const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json())

const alerts = []
app.post('/api/alerts/ingest', (req, res) => {
  const a = req.body
  if (!a?.id || !a?.title) return res.status(400).json({ ok: false })
  alerts.unshift({ ...a, receivedAt: new Date().toISOString() })
  alerts.splice(50)
  console.log('ALERT:', a.id, a.title)
  res.status(201).json({ ok: true, id: a.id })
})
app.get('/api/alerts', (_req, res) => res.json(alerts))
app.listen(5000, () => console.log('API on http://localhost:5000'))
```

Notes:

- There is **no Mongo/Mongoose dependency** in `server/package.json`. Use in-memory storage for the demo; don't add a database now.
- `test: true` marks demo alerts. The UI can show them with a "TEST" badge.
- If the real backend runs on port 5000, the only n8n change is the URL.

### Frontend (teammate)

Poll the endpoint and render a banner/list. Polling is enough; SSE is optional:

```jsx
const [alerts, setAlerts] = useState([])
useEffect(() => {
  const load = () => fetch('http://localhost:5000/api/alerts')
    .then((r) => r.json())
    .then(setAlerts)
  load()
  const id = setInterval(load, 15000)
  return () => clearInterval(id)
}, [])
```

Show `severity` with colour (red/orange), `title`, `country`, `distanceKm`, and `detectedAt`. Ignore alerts whose `id` you've already rendered.

### What changes in n8n

Only when the backend deviates from the contract:

| Backend choice | n8n change |
|---|---|
| Different port or path | Edit the URL in **Send to Website** |
| Different field names | Edit the output keys in **Filter + Dedupe**, and tell the frontend |
| Requires an auth header | Add the header in **Send to Website** |
| Follows the contract above | **No change** |

### Security

For the local demo this is fine as-is. If you deploy it, don't expose `/api/alerts/ingest` publicly without a shared secret: n8n sends a header, the backend verifies it. CORS only affects the browser's `GET`; n8n's `POST` is server-to-server.

## Changing location

Edit the `FARM` constant in **Filter + Dedupe (Lahore 300km)**. Both the USGS-style coordinate filter and the radius live there.
