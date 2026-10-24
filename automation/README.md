# Automated Disaster Alerts — n8n

n8n polls **GDACS** (global disaster feed, no API key), keeps only **Orange/Red** alerts within **300 km of Lahore**, removes duplicates, and POSTs new alerts to the website.

```
Schedule (every 2 min) ──► GDACS RSS ──► filter 300 km + dedupe ──┐
                                                                  ├──► POST /api/alerts/ingest
Manual "Test Alert" ──────────────────────────────────────────────┘
```

Lahore: `31.5204, 74.3587`. Radius: `300 km`. Feed: `https://www.gdacs.org/xml/rss.xml`.

The scheduled feed is real, so it may legitimately return 0 alerts near Lahore during judging. The **Test Alert (Manual)** trigger sends a fake Lahore flood through the exact same POST node — use that for the live demo.

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

## Changing location

Edit the `FARM` constant in **Filter + Dedupe (Lahore 300km)**. Both the USGS-style coordinate filter and the radius live there.
