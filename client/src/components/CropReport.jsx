import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, CircleHelp, Copy, ExternalLink, Leaf, ShieldAlert } from "lucide-react";

const STATUS = {
  ok: { label: "OK", Icon: Check },
  watch: { label: "Watch", Icon: CircleHelp },
  problem: { label: "Problem", Icon: AlertTriangle },
};
const QUALITY = { good: { label: "Good", rating: 4 }, fair: { label: "Fair", rating: 3 }, poor: { label: "Poor", rating: 2 } };

function Finding({ item, field = false }) {
  const key = field ? "watch" : (STATUS[item.status] ? item.status : "watch");
  const { label, Icon } = STATUS[key];
  return <article className="grid gap-2 border-t border-[var(--gray-200)] py-4 sm:grid-cols-[minmax(120px,.7fr)_1.6fr] sm:gap-5"><div><p className="font-semibold">{item.label || "Observation"}</p><span className="mt-2 inline-flex min-h-8 items-center gap-2 border border-[var(--gray-300)] px-2 text-xs font-semibold"><Icon size={15} strokeWidth={1.75} aria-hidden="true" />{label}</span></div><div><p className="text-[var(--gray-700)]">{item.observation || "More information is needed to assess this finding."}</p>{!field && item.confidence && <p className="mt-2 text-xs text-[var(--gray-700)]">Confidence: {item.confidence}</p>}</div></article>;
}
function BulletSection({ title, items, Icon }) {
  if (!items?.length) return null;
  return <section className="border-t border-[var(--gray-200)] py-5"><h4 className="mb-3 flex items-center gap-2 font-semibold"><Icon size={18} strokeWidth={1.75} aria-hidden="true" />{title}</h4><ul className="space-y-2">{items.map((item, i) => <li key={`${title}-${i}`} className="flex items-start gap-3"><span className="mt-[10px] h-1.5 w-1.5 shrink-0 bg-[var(--green)]" /><span className="text-[var(--gray-700)]">{item}</span></li>)}</ul></section>;
}

export default function CropReport({ report, language = "en", onFollowUp, onRetake }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const usable = report?.photo_ok !== false;
  const quality = QUALITY[report?.overall?.label] || QUALITY.fair;
  const summary = report?.summary?.[language] || report?.summary?.en || "The report could not provide a summary.";
  const action = report?.actions?.[0] || "Ask a local agriculture officer to inspect the crop before treatment.";
  const text = [`Hariyali crop report — ${report?.crop || "Crop"}`, `Quality: ${quality.label}`, `Confidence: ${report?.overall?.confidence || "low"}`, summary, `Most important action: ${action}`].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const element = document.createElement("textarea");
      element.value = text;
      element.style.position = "fixed";
      element.style.opacity = "0";
      document.body.appendChild(element);
      element.select();
      try { setCopied(document.execCommand("copy")); } finally { element.remove(); }
    }
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!usable) return <section className="max-w-3xl border border-[var(--gray-300)] p-5 sm:p-6"><div className="flex items-start gap-3"><AlertTriangle size={23} strokeWidth={1.75} className="mt-1 shrink-0" aria-hidden="true" /><div><h3>We could not assess this photo</h3><p className="mt-2 text-[var(--gray-700)]">{report?.photo_issue || "The photo may be too dark, blurry, or too far away to assess."}</p></div></div><p className="mt-4 text-[var(--gray-700)]">Try taking a new photo in daylight, focusing on one affected leaf, and adding a wider view of the field.</p><button type="button" onClick={onRetake} className="primary-button mt-5">Retake photo</button><p className="mt-4 text-sm text-[var(--gray-700)]">AI estimate. Confirm with a local agriculture officer.</p></section>;

  return <section className="max-w-3xl border border-[var(--gray-300)] bg-white" dir={language === "ur" ? "rtl" : "ltr"}>
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-[var(--gray-700)]">Crop quality report</p><h3 className="!text-2xl">{report?.crop || "Crop assessment"}</h3></div><div className="min-w-28 border border-[var(--gray-300)] px-3 py-2"><p className="text-xs text-[var(--gray-700)]">Overall quality</p><p className="mt-1 font-semibold">{quality.label}</p><div role="img" aria-label={`${quality.label} quality, ${report?.overall?.rating || quality.rating} of 5 segments`} className="mt-2 flex gap-1">{Array.from({ length: 5 }, (_, i) => <span key={i} className={`h-2.5 flex-1 border ${i < (report?.overall?.rating || quality.rating) ? "border-[var(--green)] bg-[var(--green)]" : "border-[var(--gray-300)]"}`} />)}</div></div></div>
      <p className="mt-4 text-xs text-[var(--gray-700)]">Confidence: {report?.overall?.confidence || "low"}</p><p className="mt-5 leading-7">{summary}</p>
      <div className="mt-5 border-l-2 border-[var(--green)] pl-4"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-700)]">Most important action</p><p className="font-semibold">{action}</p></div>
      <p className="mt-5 text-sm text-[var(--gray-700)]">AI estimate. Confirm with a local agriculture officer.</p>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--gray-200)] pt-4"><button type="button" onClick={copySummary} className="inline-flex min-h-11 items-center gap-2 border border-[var(--gray-300)] px-3 text-sm hover:border-[var(--green)]"><Copy size={16} strokeWidth={1.75} aria-hidden="true" />{copied ? "Copied" : "Copy summary"}</button><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[var(--gray-300)] px-3 text-sm hover:border-[var(--green)]">Share on WhatsApp<ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" /></a></div>
    </div>
    <div className="border-t border-[var(--gray-300)]"><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls="full-crop-report" className="flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left font-semibold sm:px-6">Show full report<motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: reduce ? 0 : .2 }}><ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" /></motion.span></button>
      <AnimatePresence initial={false}>{expanded && <motion.div id="full-crop-report" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : .25 }} className="overflow-hidden"><div className="px-5 pb-5 sm:px-6 sm:pb-6"><h4 className="mb-3 font-semibold">Crop findings</h4>{report?.crop_findings?.length ? report.crop_findings.map((item, i) => <Finding key={`${item.label}-${i}`} item={item} />) : <p className="py-3 text-[var(--gray-700)]">No crop findings were returned.</p>}<h4 className="mb-3 mt-6 font-semibold">Farm and field findings</h4>{report?.field_findings?.length ? report.field_findings.map((item, i) => <Finding key={`${item.label}-${i}`} item={item} field />) : <p className="py-3 text-[var(--gray-700)]">A wider field photo may be needed to assess field conditions.</p>}<BulletSection title="What to do this week" items={report?.actions} Icon={Leaf} /><BulletSection title="What to avoid" items={report?.avoid} Icon={ShieldAlert} /><BulletSection title="Call an expert if" items={report?.call_expert_if} Icon={AlertTriangle} /></div></motion.div>}</AnimatePresence>
    </div>
    <div className="flex flex-wrap gap-2 border-t border-[var(--gray-200)] p-4 sm:px-6">{["Explain in simpler words", "What should I do first?", "Send another photo"].map((label) => <button key={label} type="button" onClick={() => label === "Send another photo" ? onRetake?.() : onFollowUp?.(label)} className="min-h-11 border border-[var(--gray-300)] px-3 py-2 text-sm hover:border-[var(--green)]">{label}</button>)}</div>
  </section>;
}
