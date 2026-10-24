// MOCK website receiver for the n8n demo. Not part of the real app.
// Run: node automation/mock-website.mjs
// Then open http://localhost:5057
import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 5057)
const alerts = []

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>Hiryali — Mock Alerts</title>
<style>
  body{font:16px/1.5 system-ui;margin:0;background:#0f1115;color:#e8e8ea}
  header{padding:24px 32px;border-bottom:1px solid #262a33}
  h1{margin:0;font-size:20px} p{color:#9aa1ad;margin:4px 0 0}
  main{padding:24px 32px;display:grid;gap:12px}
  article{background:#171a21;border:1px solid #262a33;border-left:4px solid #e5484d;border-radius:8px;padding:16px}
  .meta{color:#9aa1ad;font-size:13px;margin-top:6px}
  .tag{display:inline-block;background:#e5484d;color:#fff;border-radius:4px;padding:1px 7px;font-size:12px;margin-right:8px}
  .empty{color:#9aa1ad}
</style></head><body>
<header><h1>Hiryali — Mock Website Receiver</h1><p>Replace this with the real backend. Alerts arrive from n8n.</p></header>
<main id="list"><p class="empty">No alerts yet. Run the n8n Test Alert trigger.</p></main>
<script>
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
async function refresh() {
  const r = await fetch('/api/alerts')
  const data = await r.json()
  const list = document.getElementById('list')
  if (!data.length) { list.innerHTML = '<p class="empty">No alerts yet. Run the n8n Test Alert trigger.</p>'; return }
  list.innerHTML = data.map(a => \`<article>
    <div><span class="tag">\${esc(a.severity || 'alert')}</span><strong>\${esc(a.title)}</strong></div>
    <div class="meta">\${esc(a.type)} · \${esc(a.country)} · \${esc(a.distanceKm)} km from Lahore · \${esc(a.source)}</div>
    <div class="meta">\${esc(a.detectedAt)} · ID \${esc(a.id)}</div>
  </article>\`).join('')
}
refresh(); setInterval(refresh, 3000)
</script></body></html>`

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '')

  if (req.method === 'POST' && req.url === '/api/alerts/ingest') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', () => {
      try {
        const alert = JSON.parse(body)
        alerts.unshift({ ...alert, receivedAt: new Date().toISOString() })
        alerts.splice(50)
        console.log('ALERT RECEIVED:', JSON.stringify(alert))
        send(res, 201, { ok: true, id: alert.id })
      } catch {
        send(res, 400, { ok: false, error: 'invalid JSON' })
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/alerts') return send(res, 200, alerts)
  if (req.method === 'GET' && req.url === '/') return send(res, 200, page, 'text/html')

  send(res, 404, { ok: false, error: 'not found' })
})

server.listen(PORT, () => console.log(`Mock website on http://localhost:${PORT}`))
