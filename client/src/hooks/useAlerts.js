import { useEffect, useState } from "react";
import { getAlerts } from "../lib/api";
import { SAMPLE_ALERTS } from "../config";

// Polls the n8n-backed alerts endpoint. Falls back to the built-in samples
// when the endpoint is down or empty, so the page never looks broken.
export function useAlerts(pollMs = 15000) {
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const data = await getAlerts();
        if (stopped) return;
        if (Array.isArray(data) && data.length > 0) {
          setAlerts(data);
          setLive(true);
          setError("");
        } else {
          setAlerts(SAMPLE_ALERTS);
          setLive(false);
        }
      } catch (err) {
        if (!stopped) setError(err.message || "Alerts unavailable");
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
