import { Router } from 'express';

const router = Router();
let alerts = [];

router.get('/', (_req, res) => res.json(alerts));

router.post('/ingest', (req, res) => {
  const key = process.env.ALERTS_KEY;
  if (key && req.get('x-alerts-key') !== key) {
    return res.status(401).json({ message: 'Invalid alerts key.' });
  }
  const incoming = Array.isArray(req.body) ? req.body : [req.body];
  for (const a of incoming) {
    if (!a || !a.title) continue;
    const id = a.id || `${a.type}-${a.title}`;
    if (!alerts.some((x) => x.id === id)) {
      alerts.unshift({ ...a, id, receivedAt: new Date().toISOString() });
    }
  }
  alerts = alerts.slice(0, 50);
  res.json({ ok: true, count: alerts.length });
});

export default router;