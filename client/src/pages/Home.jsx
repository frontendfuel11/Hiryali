import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sprout,
  Sun,
  Bug,
  X,
} from "lucide-react";
import Brand from "../components/Brand";
import EmergencyBar from "../components/EmergencyBar";
import Chat from "./Chat";
import { CONFIG } from "../config";
import { useAlerts } from "../hooks/useAlerts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const faqs = [
  [
    "Does Hariyali cost anything?",
    "This demo does not process payments. Check the service terms provided by your local programme before relying on any production service.",
  ],
  [
    "Which crops can I check?",
    "The interface includes wheat, rice, cotton, sugarcane, vegetables, and an Other option. Actual support depends on the model and local validation.",
  ],
  [
    "How accurate is the report?",
    "A photo can miss important context and cannot confirm every pest or disease. Confirm findings with a local agriculture officer.",
  ],
  [
    "Does this replace an agriculture officer?",
    "No. Hariyali provides general guidance only and does not replace an in-person assessment.",
  ],
  [
    "Can I use Urdu?",
    "Yes. Choose Urdu in the language control. The interface supports right-to-left layout for the main chat and report.",
  ],
  [
    "How do alerts work?",
    "Live alerts are fetched by n8n from GDACS (earthquakes, floods, cyclones, wildfires) within 300 km of Lahore and from Open-Meteo (rain, thunderstorm, wind). Test alerts are clearly labelled TEST.",
  ],
];

function Photo({ src, alt, className = "", width = 800, height = 600 }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`photo-fallback ${className}`}
        role="img"
        aria-label={`${alt}. Supply a licensed photo at ${src}.`}
      >
        <Leaf size={28} strokeWidth={1.75} />
        <span>Photo asset needed</span>
        <small>{src}</small>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const mainRef = useRef(null);
  const [faqOpen, setFaqOpen] = useState(-1);
  const [helpOpen, setHelpOpen] = useState(false);
  const { alerts, live } = useAlerts();

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      gsap.from(".hero-copy > *", {
        y: 16,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: "power2.out",
      });

      gsap.utils.toArray(".reveal-section").forEach((element) => {
        gsap.from(element, {
          y: 18,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });
    },
    { scope: mainRef }
  );

  return (
    <main ref={mainRef}>
      <EmergencyBar />
      
      <header className="site-width flex min-h-[76px] items-center justify-between gap-5 border-b border-[var(--gray-200)]">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          <a href="#how-it-works" className="nav-link">
            How it works
          </a>
          <a href="#sample-alerts" className="nav-link">
            Alerts
          </a>
          <a href="#questions" className="nav-link">
            Questions
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="min-h-11 inline-flex items-center text-sm font-semibold"
          >
            Log in
          </Link>
          <Link to="/signup" className="primary-button">
            Sign up
          </Link>
        </div>
      </header>

      <section className="site-width hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sprout size={16} strokeWidth={1.75} /> Crop and field checks
          </p>
          <h1>Send a photo of your crop. Get a quality report in your language.</h1>
          <p className="lead">
            Share a clear crop or field photo to review visible signs and decide what
            to inspect next.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to="/signup" className="primary-button">
              Upload a crop photo <ArrowRight size={17} strokeWidth={1.75} />
            </Link>
            <a href="#sample-report" className="text-link">
              See a report preview
            </a>
          </div>
          <p className="mt-5 text-sm text-[var(--gray-700)]">
            English and Urdu · Up to four photos per check
          </p>
        </div>
        
        <div className="hero-visual">
          <Photo
            src={CONFIG.images.hero}
            alt="A crop field in daylight"
            className="hero-photo"
            width={1000}
            height={900}
          />
          <div className="hero-chat-preview">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-700)]">
              Conversation preview
            </p>
            <div className="mt-3 flex items-start gap-3">
              <Photo
                src="/images/leaf-closeup.jpg"
                alt="Close-up of a crop leaf"
                className="preview-thumb"
                width={160}
                height={120}
              />
              <p className="text-sm leading-6">Can you check these leaves?</p>
            </div>
            <div className="mt-3 border-t border-[var(--gray-200)] pt-3">
              <p className="font-semibold">Report preview</p>
              <p className="mt-1 text-sm leading-6 text-[var(--gray-700)]">
                Visible leaves appear mostly healthy. A wider field photo would help
                assess spacing and weeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-width reveal-section section-what">
        <div className="sticky-heading">
          <p className="eyebrow">A closer look</p>
          <h2>What one photo tells you</h2>
          <p className="mt-4 text-[var(--gray-700)]">
            The report separates visible signs from details that need a closer
            inspection.
          </p>
        </div>
        <div className="feature-list">
          {[
            [Leaf, "Crop health", "Review visible colour changes, spots, and leaf damage."],
            [Sun, "Growth stage", "Record what can be seen and what needs crop-age context."],
            [Bug, "Visible pests or disease", "Flag possible symptoms without claiming certainty from one photo."],
            [Sprout, "Field condition", "Use a wider view to check spacing, weeds, and soil surface."],
            [CheckCircle2, "What to do this week", "Get practical next steps and signs that call for expert help."],
          ].map(([Icon, title, desc]) => (
            <article className="feature-row" key={title}>
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="site-width reveal-section section-process">
        <p className="eyebrow">From photo to next step</p>
        <h2>How a check works</h2>
        <div className="timeline">
          {[
            ["1", "Take the photo", "Use daylight and include the affected leaf or plant."],
            ["2", "Hariyali reads it", "The assistant reviews visible signs and notes uncertainty."],
            ["3", "Read the report", "Review actions and ask a follow-up question in your language."],
          ].map(([n, title, desc]) => (
            <article className="timeline-step" key={n}>
              <span className="timeline-number">{n}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="sample-alerts" className="site-width reveal-section section-alerts">
        <div className="section-intro">
          <p className="eyebrow">
            <AlertTriangle size={16} strokeWidth={1.75} /> {live ? "Live alerts" : "Alerts"}
          </p>
          <h2>Warnings near Lahore</h2>
          <p>
            {live
              ? "Fetched automatically by n8n from GDACS and Open-Meteo, filtered to Lahore. Test alerts are labelled TEST."
              : "Monitoring GDACS and Open-Meteo for Lahore. New warnings appear here automatically."}
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Type</th>
                <th>What is happening</th>
                <th>Source / action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    No active warnings near Lahore right now. Monitoring GDACS and
                    Open-Meteo.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id || alert.event}>
                    <td>
                      <span className="severity">{alert.severity}</span>
                    </td>
                    <td>{alert.crop || alert.type || "Alert"}</td>
                    <td>
                      {alert.title || alert.event}
                      {alert.test ? " (test)" : ""}
                    </td>
                    <td>{alert.action || (alert.source ? `Source: ${alert.source}` : "—")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="site-width reveal-section section-compare">
        <div>
          <p className="eyebrow">A second opinion</p>
          <h2>Hariyali or guessing</h2>
          <p className="mt-4 text-[var(--gray-700)]">
            A photo can help organise observations, but it does not replace local
            knowledge or an expert visit.
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table compare-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Guessing or waiting</th>
                <th>Sending a photo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Language</th>
                <td>Advice may be hard to follow.</td>
                <td>Read the report in English or Urdu.</td>
              </tr>
              <tr>
                <th>When unsure</th>
                <td>It can be difficult to know what to check.</td>
                <td>
                  The report can flag uncertainty and suggest what photo or detail is
                  missing.
                </td>
              </tr>
              <tr>
                <th>Pesticide advice</th>
                <td>A guess can lead to unnecessary treatment.</td>
                <td>
                  Confirm the cause and product guidance with a local agriculture
                  officer.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="sample-report" className="site-width reveal-section section-sample">
        <div className="sample-copy">
          <p className="eyebrow">Report preview</p>
          <h2>A report you can read at a glance</h2>
          <p>
            See the sort of information a crop check can organise. This preview is
            not a diagnosis.
          </p>
          <Link to="/signup" className="text-link inline-flex min-h-11 items-center gap-2">
            Try a photo check <ArrowRight size={16} />
          </Link>
        </div>
        <div className="sample-report">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-700)]">
                Report preview
              </p>
              <h3 className="mt-2">Wheat</h3>
            </div>
            <span className="border border-[var(--gray-300)] px-3 py-2 text-sm font-semibold">
              Good
            </span>
          </div>
          <p className="mt-4 leading-7">
            The visible leaves appear mostly healthy in this image. A wider
            field photo would help assess plant spacing and weeds.
          </p>
          <div className="mt-5 border-l-2 border-[var(--green)] pl-4">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Suggested next step
            </p>
            <p className="mt-1 font-semibold">
              Check several plants and take a wider field photo.
            </p>
          </div>
          <p className="mt-5 border-t border-[var(--gray-200)] pt-4 text-sm text-[var(--gray-700)]">
            AI estimate. Confirm with a local agriculture officer.
          </p>
        </div>
      </section>

      <section id="questions" className="site-width reveal-section section-faq">
        <div>
          <p className="eyebrow">Before you send a photo</p>
          <h2>Questions farmers ask</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <article className="faq-item" key={question}>
              <h3>
                <button
                  type="button"
                  aria-expanded={faqOpen === index}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setFaqOpen(faqOpen === index ? -1 : index)}
                >
                  {question}
                  <span aria-hidden="true">{faqOpen === index ? "−" : "+"}</span>
                </button>
              </h3>
              {faqOpen === index && (
                <p id={`faq-answer-${index}`} className="faq-answer">
                  {answer}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="site-width reveal-section section-close">
        <p className="eyebrow">A useful first check</p>
        <h2>Start with a clear photo and a question.</h2>
        <Link to="/signup" className="primary-button mt-6">
          Create an account <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="site-width footer">
        <div>
          <Brand />
          <p className="mt-3 max-w-md text-sm text-[var(--gray-700)]">
            General guidance only. Confirm with a local agriculture officer before
            using any pesticide.
          </p>
        </div>
        <div className="footer-links">
          <a href="#how-it-works">How it works</a>
          <a href="#sample-alerts">Alerts</a>
          <a href="#questions">Questions</a>
          <Link to="/login">Log in</Link>
        </div>
        <p className="footer-note">
          © {new Date().getFullYear()} Hariyali · Hackathon demo
        </p>
      </footer>

      <div className="urgent-help">
        <button
          type="button"
          onClick={() => setHelpOpen((open) => !open)}
          aria-expanded={helpOpen}
          className="urgent-trigger"
        >
          <MessageCircle size={18} strokeWidth={1.75} />
          Need urgent help?
        </button>
        {helpOpen && (
          <div className="urgent-panel" role="dialog" aria-label="Ask AgriGuard">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3>Ask AgriGuard</h3>
              <button
                type="button"
                className="urgent-close-inline"
                onClick={() => setHelpOpen(false)}
                aria-label="Close urgent help"
              >
                <X size={17} />
              </button>
            </div>
            <Chat compact />
            <p className="mt-2 text-xs text-[var(--gray-700)]">
              For an emergency, call{" "}
              <a
                className="underline"
                href={`tel:${CONFIG.agricultureOfficerPhone}`}
              >
                {CONFIG.agricultureOfficerPhone}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}