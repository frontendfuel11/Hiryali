import { useEffect, useState } from "react";
import { getAlerts } from "../lib/api";

// Polls the n8n-backed alerts endpoint. An empty/unreachable endpoint shows a
// neutral "monitoring" state rather than inventing alerts.
export function useAlerts(pollMs = 15000) {
  const [alerts, setAlerts] = useState([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const data = await getAlerts();
        if (stopped) return;
        const list = Array.isArray(data) ? data : [];
        setAlerts(list);
        setLive(list.length > 0);
        setError("");
      } catch (err) {
        if (!stopped) {
          setAlerts([]);
          setLive(false);
          setError(err.message || "Alerts unavailable");
        }
      }
    };

    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { alerts, live, error };
}
