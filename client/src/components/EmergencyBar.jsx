import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAlerts } from "../hooks/useAlerts";

export default function EmergencyBar() {
  const { alerts, live } = useAlerts();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const reduce = useReducedMotion();

  const count = alerts.length;

  useEffect(() => {
    if (!visible || reduce || count < 2) return;

    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      5000
    );

    return () => window.clearInterval(t);
  }, [visible, reduce, count]);

  if (count === 0) return null;

  const current = alerts[index % count];
  const label = current.test ? "Test alert" : live ? "Live alert" : "Sample alert";
  const message = current.title || current.event || "No alerts right now.";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? false : { y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: -16, opacity: 0 }}
          className="alert-strip"
        >
          <div className="site-width flex min-h-10 items-center gap-3 py-2">
            <AlertTriangle size={16} />
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              <strong>{label}:</strong> {message}
            </p>
            <a
              href="#sample-alerts"
              className="min-h-11 inline-flex items-center text-sm underline"
            >
              View alerts
            </a>
            <button
              type="button"
              aria-label="Close alert"
              onClick={() => setVisible(false)}
              className="min-h-11 min-w-11 inline-flex items-center justify-center"
            >
              <X size={17} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
