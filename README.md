# Hiryali

## Automated disaster alerts (n8n)

n8n checks GDACS every 2 minutes, keeps Orange/Red events within 300 km of Lahore, removes duplicates, and POSTs new alerts to the website.

```bash
npx n8n                                  # terminal 1
node automation/mock-website.mjs         # terminal 2 (test receiver on :5057)
```

Import `automation/disaster-alerts.n8n.json` in n8n, run **Test Alert (Manual)**, then open <http://localhost:5057>.

Full setup and the payload contract: [`automation/README.md`](automation/README.md)
