# Automated Disaster Alerts — n8n

n8n polls **GDACS** (global disaster feed, no API key) and **Open-Meteo** (local weather forecast, no API key), keeps only relevant alerts, removes duplicates, and POSTs them to the website and Discord.

```
Every 2 min ──► GDACS RSS ──► 300 km + Orange/Red filter ──┬──► POST /api/alerts/ingest
           └──► Open-Meteo ──► rain/thunderstorm/wind ─────┴──► Discord webhook
Manual "Test Alert" ────────────────────────────────────────┘
```

Lahore: `31.5204, 74.3587`. Radius: `300 km`. Feeds: `https://www.gdacs.org/xml/rss.xml` and `https://api.open-meteo.com/v1/forecast`.

## Ports (single source of truth)

| Service | URL | Start command |
|---|---|---|
| n8n | <http://localhost:5678> | `npx n8n` |
| Mock receiver | <http://localhost:5057> | `node automation/mock-website.mjs` |
| React site | <http://localhost:5173> | `cd client && npm run dev` |
| Real backend (not used today) | <http://localhost:5000> | needs MongoDB + alert routes |

Today's demo path: **n8n :5678 → mock receiver :5057 → React site :5173**. Everything else is future work.

> On this Mac, port 5000 is occupied by AirPlay (ControlCenter). The mock uses 5057 to avoid it.

The scheduled feed is real, so it may legitimately return 0 alerts near Lahore during judging. The **Test Alert (Manual)** trigger sends a simulated Lahore event through the exact same POST node — use that for the live demo.

## Real data vs test data

- **Scheduled disaster path — real.** It downloads the live GDACS feed (317 items at the time of writing) and keeps Orange/Red events inside the radius. Right now that is **0 near Lahore**, which is correct behavior, not a bug. The n8n execution view proves the feed was fetched.
- **Weather path — real.** It calls **Open-Meteo** (free, no API key) for Lahore's daily forecast. If rain, a thunderstorm, or high wind is forecast, it creates an alert. Today's forecast is `0.9 mm` of rain, so a real **"Rain expected near Lahore (0.9 mm)"** alert is generated. This is threshold-based forecast data, not an official government warning.
- **Test Alert — synthetic event, real weather.** It first calls Open-Meteo for Lahore, then creates a `TEST-...` alert with `"test": true` and embeds the real temperature, rain, weather code, and wind gust in `details`. The event type is randomly picked from flood/rain/thunderstorm/wildfire, with clean titles. The UI shows a small **Test alert** label and Discord shows a `Test alert — simulated event` footer. It is not passed off as live.
- **Mock receiver — not a data source.** It only stores and displays whatever n8n POSTs. It invents nothing.
- **Frontend fallback — sample.** If the alerts endpoint is empty or down, the site shows `SAMPLE_ALERTS`, labelled **Sample alert**. The page is never empty, but it never pretends those are live.

## What is real vs demo

| Part | Status |
|---|---|
| GDACS disaster alerts | **Real** live feed |
| Open-Meteo rain/thunderstorm/wind | **Real** forecast data, threshold-derived |
| Test Alert | **Synthetic**, labelled `Test alert` / Discord footer |
| Frontend fallback alerts | **Sample**, labelled `Sample alert` |
| Crop analysis and chat | **Demo/mock** (`VITE_USE_MOCK`, backend `createDemoReport`) — not a trained model |
| Mock receiver | Stores and displays only what n8n sends |

Be explicit about the last two rows if judges ask. The alert pipeline is real; the crop analysis is currently a demo.

GDACS only reports major disasters — **earthquake, flood, cyclone, wildfire, drought, volcano, tsunami**. It has **no rain or thunderstorm category**; that's why the weather path uses Open-Meteo instead. Open-Meteo's WMO codes: `51–65` rain, `80–82` showers, `95–99` thunderstorm. The weather alert fires when the daily rain is **≥ 0.5 mm**, the code is **≥ 51**, or gusts are **≥ 60 km/h**.

For the demo: show the **Fetch GDACS Feed** node output (hundreds of real events), then run **Test Alert (Manual)** and show the alert appear on the site. Say plainly that the live feed had no qualifying event near Lahore that minute, so the test trigger is simulating one. You can also run **Check Weather (Manual)** to show a real Open-Meteo rain alert.

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
5. **Test** — open the **Test Alert (Manual)** node → **Execute workflow**. It fetches real Open-Meteo values, builds a labeled test alert, and expects HTTP `201` on **Send to Website**.
6. **Real weather** — open **Check Weather (Manual)** → **Execute workflow**. Expect a real alert such as `Rain expected near Lahore (0.9 mm)` on the site and Discord.
7. **Verify** — `curl -s http://localhost:5057/api/alerts` → JSON containing the alert IDs. The same alerts appear at <http://localhost:5057>.
8. **Activate** — toggle **Active** (top right). The 2-minute schedule now runs both GDACS and Open-Meteo.
9. **Validate everything** — `./automation/check-demo.sh` → all ✅.

You do **not** need the real backend or MongoDB for this demo.

No secrets are needed. Nothing outside this repository is modified.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `port 5678 is already in use` | n8n is already running | Open <http://localhost:5678> instead of starting another |
| `port 5057` busy | Another process uses it | `MOCK_PORT=5058 node automation/mock-website.mjs`, then change the URL in **Send to Website** |
| `access to env vars denied` | Old workflow version | Re-import `automation/disaster-alerts.n8n.json` |
| Page at 5057 is empty | Mock not running, or wrong URL in **Send to Website** | Start the mock; the node URL must end in `/api/alerts/ingest` |
| No scheduled alerts | Feed has no Orange/Red events within 300 km (normal) | Use **Test Alert (Manual)** for the demo |
| No weather alert | Forecast below thresholds today | Run **Check Weather (Manual)** and inspect **Build Weather Alert** output |
| `Fetch Open-Meteo` error | Network/API unavailable | The branch continues without sending; the GDACS path still works |
| Workflow never fires | Not activated | Toggle **Active**, or click **Execute workflow** manually |

## Files

| File | Purpose |
|---|---|
| `disaster-alerts.n8n.json` | Importable n8n workflow (schedule + manual test + POST) |
| `mock-website.mjs` | Local stand-in backend at `:5057`; prints received alerts and serves a live page |
| `check-demo.sh` | Pre-demo validator (n8n, mock, frontend, feeds, ports, Discord) |
| `README.md` | This guide |

## Current demo vs real backend

Today's demo is complete **without** the backend:

```
n8n :5678  →  mock receiver :5057  →  React site :5173
```

The API in `server/src` is done for auth/analyze/conversations, but it has **no `/api/alerts` routes**, requires MongoDB, and port 5000 is occupied by AirPlay on this Mac. Do not switch to it before judging.

When the alert routes exist:

1. Add `POST /api/alerts/ingest` and `GET /api/alerts` (contract below).
2. Set `MONGODB_URI` and start the API on a free port, e.g. `PORT=5050`.
3. Change the URL in **Send to Website** to `http://localhost:5050/api/alerts/ingest`.
4. Start the frontend with `VITE_ALERTS_URL=http://localhost:5050/api/alerts`.

## Pre-demo validation

Run this before recording:

```bash
./automation/check-demo.sh
```

It checks n8n, the mock receiver, the React site, the workflow file, the port alignment, GDACS, Open-Meteo, and whether the Discord URL is configured. Expected:

```
All checks passed. Ready to record.
```

The mock receiver starts **empty**. Until n8n sends something, the frontend shows the labelled **Sample alerts**, so the page is never blank. To populate it before recording:

1. Run **Check Weather (Manual)** → adds the real Open-Meteo alert.
2. Run **Test Alert (Manual)** → adds a clearly labelled test alert.
3. Refresh <http://localhost:5173>.

Restarting `mock-website.mjs` clears its in-memory alerts; do that if you want a clean slate before the final run.

Manual end-to-end check:

1. In n8n, run **Test Alert (Manual)**.
2. Confirm the alert arrived:

   ```bash
   curl -s http://localhost:5057/api/alerts | python3 -m json.tool | head -30
   ```

   The newest item has an `id` starting with `TEST-`, `"test": true`, and real weather in `details`.

3. Open <http://localhost:5173> — the banner/table updates within 15 seconds.
4. Check Discord — the embed footer says `Test alert — simulated event`.
5. Run **Check Weather (Manual)** — today it produces a real `Rain expected near Lahore (0.9 mm)` alert.
6. Confirm the real GDACS path still fetches:

   ```bash
   curl -s https://www.gdacs.org/xml/rss.xml | grep -c '<item>'
   ```

   Expect 300+.

If anything fails, fix it before recording. Do not rely on venue Wi-Fi for the demo video.

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

Test alerts also include `"test": true`. Weather alerts use `type: rain | thunderstorm | wind`, `source: "Open-Meteo"`, and a `details` object with precipitation, probability, weather code, and wind gust.

The backend should store the alert and expose it to the frontend (`GET /api/alerts`, polling every ~15 s, or SSE). Duplicate protection lives in n8n, so the same GDACS event is only sent once.

## Integrating with the real website

The workflow is already finished. Integration only means pointing it at a real endpoint and displaying what it sends. **Treat the payload above as the API contract** — the backend should match it, not the other way round. That way the automation needs no changes.

### Backend (future, not required today)

The current `server/src` backend does **not** have these routes yet. Add them when you switch from the mock. Two endpoints are enough:

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
app.listen(5050, () => console.log('API on http://localhost:5050'))
```

Notes:

- This snippet is a standalone reference (the same behavior as `automation/mock-website.mjs`), not the current backend. The real backend uses MongoDB, so add the routes there only when Mongo is available.
- `test: true` marks simulated alerts. The frontend labels them **Test alert**; Discord uses the footer `Test alert — simulated event`.
- Port 5050 avoids AirPlay on 5000. If you change it, update both the n8n URL and `VITE_ALERTS_URL`.

### Frontend (already wired)

`client/src/hooks/useAlerts.js` polls `VITE_ALERTS_URL` every 15 seconds and feeds both the top **EmergencyBar** and the **Alerts** table on the Home page.

- Default URL: `http://localhost:5057/api/alerts` (the mock receiver, so the demo works today)
- Falls back to `SAMPLE_ALERTS` if the endpoint is down or empty
- Test alerts show as **Test alert**; real ones show as **Live alert**

To switch to the real backend:

```bash
cd client
VITE_ALERTS_URL=http://localhost:5000/api/alerts npm run dev
```

No React changes are needed — only that environment variable. The frontend handles `severity`, `title`, `type`, `source`, `distanceKm`, `detectedAt`, and `test`.

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

Edit the `FARM` constant in **Filter + Dedupe (Lahore 300km)** for GDACS. For weather, update the `latitude`/`longitude` in the **Fetch Open-Meteo** URL and the coordinates in **Build Weather Alert**.
