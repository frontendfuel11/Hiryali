import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, LogOut, Menu, MessageSquare, Plus, Sprout, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Brand from "../components/Brand";
import ChatComposer from "../components/ChatComposer";
import CropReport from "../components/CropReport";
import { analyzeCrop, getConversation, getConversations } from "../lib/api";

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
function formatDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "Recent check" : new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
}
function Typing() {
  const reduce = useReducedMotion();
  return <div className="flex items-center gap-3 py-4" role="status" aria-live="polite"><Sprout size={20} strokeWidth={1.75} className="text-[var(--green)]" /><p className="text-sm text-[var(--gray-700)]">Looking at your photo</p>{!reduce && <span className="flex gap-1" aria-hidden="true">{[0,1,2].map((n) => <motion.span key={n} className="h-1.5 w-1.5 bg-[var(--green)]" animate={{ opacity: [.35,1,.35] }} transition={{ duration: 1.1, repeat: Infinity, delay: n * .18 }} />)}</span>}</div>;
}
function EmptyState({ onSuggestion }) {
  return <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-5 py-14"><Sprout size={34} strokeWidth={1.5} className="mb-5 text-[var(--green)]" /><p className="mb-3 text-sm font-semibold uppercase tracking-[.12em] text-[var(--gray-700)]">Your next field check</p><h1 className="!text-4xl sm:!text-5xl">Send a photo to start</h1><p className="mt-5 max-w-xl text-[var(--gray-700)]">Share a clear crop or field photo to receive an initial assessment and practical suggestions for what to inspect next.</p><div className="mt-8 border-t border-[var(--gray-200)]">{[{title:"Use daylight",description:"Avoid shadows and make sure the affected area is visible."},{title:"Photograph one leaf",description:"Take a close-up that shows spots, colour changes, or damage."},{title:"Include the field",description:"A wider shot helps show spacing, weeds, and field conditions."}].map((tip,i) => <article key={tip.title} className="grid gap-2 border-b border-[var(--gray-200)] py-4 sm:grid-cols-[36px_1fr]"><span className="text-sm font-semibold text-[var(--green)]">0{i+1}</span><div><h3 className="!text-lg">{tip.title}</h3><p className="mt-1 text-sm text-[var(--gray-700)]">{tip.description}</p></div></article>)}</div><div className="mt-7"><p className="mb-3 text-sm font-semibold">Or start with a question</p><div className="flex flex-wrap gap-2">{["How do I take a good crop photo?","What should I check in my field?"].map((s) => <button key={s} type="button" onClick={() => onSuggestion(s)} className="min-h-11 border border-[var(--gray-300)] px-3 py-2 text-left text-sm hover:border-[var(--green)]">{s}</button>)}</div></div></div>;
}
function Sidebar({ conversations, activeId, language, setLanguage, onNew, onSelect, onLogout, mobile = false, onClose }) {
  return <div className="flex h-full min-h-0 flex-col"><div className="flex min-h-[76px] items-center justify-between gap-3 border-b border-[var(--gray-200)] px-5"><Brand />{mobile && <button type="button" onClick={onClose} aria-label="Close conversation sidebar" className="flex min-h-11 min-w-11 items-center justify-center"><X size={20} /></button>}</div><div className="p-4"><button type="button" onClick={onNew} className="primary-button w-full justify-center"><Plus size={18} strokeWidth={1.75} />New check</button></div><div className="min-h-0 flex-1 overflow-y-auto px-3"><p className="px-2 pb-3 pt-2 text-xs font-semibold uppercase tracking-[.12em] text-[var(--gray-700)]">Past checks</p>{conversations.length ? <div className="space-y-1">{conversations.map((c) => { const cid = c.id || c.conversationId; return <button key={cid} type="button" onClick={() => onSelect(cid)} className={`flex min-h-14 w-full items-start gap-3 px-3 py-3 text-left ${cid === activeId ? "border-l-2 border-[var(--green)] bg-[var(--gray-100)]" : "border-l-2 border-transparent hover:bg-[var(--gray-100)]"}`}><MessageSquare size={17} className="mt-1 shrink-0 text-[var(--gray-700)]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.title || c.crop || "Crop check"}</span><span className="mt-1 flex items-center gap-1 text-xs text-[var(--gray-700)]"><CalendarDays size={12} />{formatDate(c.updatedAt || c.updated_at || c.createdAt)}</span></span></button>; })}</div> : <p className="px-2 py-3 text-sm text-[var(--gray-700)]">Your crop checks will appear here.</p>}</div><div className="border-t border-[var(--gray-200)] p-4"><label htmlFor={mobile ? "mobile-language" : "chat-language"} className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[var(--gray-700)]">Report language</label><select id={mobile ? "mobile-language" : "chat-language"} value={language} onChange={(e) => setLanguage(e.target.value)} className="field-input"><option value="en">English</option><option value="ur">اردو</option></select><button type="button" onClick={onLogout} className="mt-3 flex min-h-11 w-full items-center gap-2 px-2 text-sm text-[var(--gray-700)] hover:text-[var(--green)]"><LogOut size={17} />Log out</button></div></div>;
}
function UserMessage({ message }) {
  return <article className="ml-auto max-w-[94%] sm:max-w-[85%]">{message.images?.length > 0 && <div className={`mb-3 grid gap-2 ${message.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{message.images.map((image,i) => <img key={`${message.id}-${i}`} src={image.preview} alt={`Uploaded crop photo ${i+1}`} width="640" height="480" className="max-h-72 w-full border border-[var(--gray-200)] object-cover" />)}</div>}{message.text && <div className="border border-[var(--gray-300)] px-4 py-3"><p className="whitespace-pre-wrap leading-7">{message.text}</p></div>}{message.crop && <p className="mt-2 text-right text-xs text-[var(--gray-700)]">Crop: {message.crop}</p>}</article>;
}
function AssistantMessage({ message, language, onFollowUp, onRetake, onRetry }) {
  if (message.status === "loading") return <Typing />;
  if (message.status === "error") return <div className="max-w-2xl border border-[var(--red)] p-4" role="alert"><p className="font-semibold">This check could not be completed.</p><p className="mt-2 text-sm text-[var(--gray-700)]">{message.error || "Please check your connection and try again."}</p><button type="button" onClick={() => onRetry(message.retryPayload)} className="primary-button mt-4">Try again</button></div>;
  if (message.report) return <CropReport report={message.report} language={language} onFollowUp={onFollowUp} onRetake={onRetake} />;
  return <p className="max-w-2xl whitespace-pre-wrap py-3 leading-7">{message.text}</p>;
}

export default function Chat() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const reduce = useReducedMotion();
  const [language, setLanguage] = useState(user?.language || "en");
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState("");
  const [composerError, setComposerError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const endRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerButtonRef = useRef(null);
  const previousFocus = useRef(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try { const result = await getConversations(); setConversations(Array.isArray(result) ? result : result?.conversations || []); } catch { /* Chat remains usable when history is unavailable. */ }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onDragOver = (e) => {
      if (Array.from(e.dataTransfer?.types || []).includes("Files")) e.preventDefault();
    };
    const onDrop = (e) => {
      if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
      e.preventDefault();
      if (e.target.closest?.(".composer")) return; // composer handles its own drop
      const input = document.querySelector('input[aria-label="Choose crop photos"]');
      if (!input || typeof DataTransfer === "undefined") return;
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files || []).forEach((file) => dt.items.add(file));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" }); }, [messages, reduce]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    previousFocus.current = document.activeElement;
    const drawer = drawerRef.current;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const getFocusable = () => Array.from(drawer?.querySelectorAll(selector) || []);
    getFocusable()[0]?.focus();
    function onKey(event) {
      if (event.key === "Escape") { setDrawerOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); (previousFocus.current || drawerButtonRef.current)?.focus?.(); };
  }, [drawerOpen]);

  function newCheck() { setActiveId(null); setMessages([]); setPageError(""); setComposerError(""); setDraftText(""); setDrawerOpen(false); }
  async function selectConversation(conversationId) {
    if (!conversationId || busyRef.current) return;
    setPageError(""); setDrawerOpen(false);
    try {
      const result = await getConversation(conversationId);
      setActiveId(conversationId);
      setMessages((result?.messages || []).map((m) => ({ ...m, id: m.id || id(), role: m.role || (m.report ? "assistant" : "user"), images: m.images || [] })));
    } catch (error) { setPageError(error.message || "This conversation could not be opened."); }
  }
  async function doLogout() { try { await logout(); } finally { navigate("/login", { replace: true }); } }
  async function sendMessage(payload, retrying = false) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setPageError(""); setComposerError("");
    const requestPayload = { ...payload, language: payload.language || language, conversationId: payload.conversationId || activeId };
    const userMessage = { id: id(), role: "user", text: requestPayload.message || "", crop: requestPayload.crop || "", images: (requestPayload.images || []).map((file) => ({ preview: URL.createObjectURL(file), name: file.name })) };
    const loading = { id: id(), role: "assistant", status: "loading" };
    setMessages((current) => retrying ? [...current.filter((m) => m.status !== "error"), loading] : [...current, userMessage, loading]);
    try {
      const report = await analyzeCrop(requestPayload);
      setMessages((current) => [...current.filter((m) => m.id !== loading.id), { id: id(), role: "assistant", report }]);
      const newId = report?.conversationId || requestPayload.conversationId;
      if (newId) setActiveId(newId);
      await refresh();
    } catch (error) {
      setMessages((current) => [...current.filter((m) => m.id !== loading.id), { id: id(), role: "assistant", status: "error", error: error.message, retryPayload: requestPayload }]);
    } finally { busyRef.current = false; setBusy(false); }
  }
  function followUp(prompt) { setDraftText(prompt); document.getElementById("crop-description")?.focus(); }
  const sideProps = { conversations, activeId, language, setLanguage, onNew: newCheck, onSelect: selectConversation, onLogout: doLogout, onClose: () => setDrawerOpen(false) };

  return <div className="flex h-dvh min-h-[500px] overflow-hidden bg-[var(--paper)]">
    <aside className="hidden w-[260px] shrink-0 border-r border-[var(--gray-200)] lg:block"><Sidebar {...sideProps} /></aside>
    <AnimatePresence>{drawerOpen && <><motion.button type="button" aria-label="Close navigation drawer" initial={{ opacity: 0 }} animate={{ opacity: .35 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 cursor-default bg-black lg:hidden" /><motion.aside ref={drawerRef} initial={reduce ? false : { x: language === "ur" ? "100%" : "-100%" }} animate={{ x: 0 }} exit={{ x: language === "ur" ? "100%" : "-100%" }} transition={{ duration: reduce ? 0 : .23 }} className="fixed inset-y-0 left-0 z-50 w-[min(300px,88vw)] border-r border-[var(--gray-200)] bg-[var(--paper)] lg:hidden" role="dialog" aria-modal="true" aria-label="Conversation navigation"><Sidebar {...sideProps} mobile /></motion.aside></>}</AnimatePresence>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-[var(--gray-200)] px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><button ref={drawerButtonRef} type="button" onClick={() => setDrawerOpen(true)} aria-label="Open conversation navigation" aria-expanded={drawerOpen} className="flex min-h-11 min-w-11 items-center justify-center lg:hidden"><Menu size={21} strokeWidth={1.75} /></button><div className="min-w-0"><h2 className="!text-lg !tracking-normal">Crop and field check</h2><p className="truncate text-xs text-[var(--gray-700)]">{user?.name || user?.email || "Hariyali assistant"}</p></div></div><Link to="/" className="inline-flex min-h-11 items-center text-sm text-[var(--gray-700)] hover:text-[var(--green)]">Homepage</Link></header>
      {pageError && <div role="alert" className="border-b border-[var(--gray-300)] px-5 py-3 text-sm">{pageError}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-relevant="additions text" aria-label="Conversation messages">{messages.length === 0 ? <EmptyState onSuggestion={followUp} /> : <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">{messages.map((message) => <div key={message.id}>{message.role === "user" ? <UserMessage message={message} /> : <AssistantMessage message={message} language={language} onFollowUp={followUp} onRetake={() => document.getElementById("crop-description")?.focus()} onRetry={(payload) => sendMessage(payload, true)} />}</div>)}<div ref={endRef} /></div>}</div>
      <div className="shrink-0">{composerError && <div role="alert" className="mx-auto max-w-4xl px-4 pb-2 text-sm text-[var(--red)] sm:px-6">{composerError}</div>}<div className="mx-auto w-full max-w-4xl px-3 pb-3 sm:px-6 sm:pb-5"><ChatComposer key={activeId || "new-check"} language={language} busy={busy} initialText={draftText} onError={setComposerError} onClearError={() => setComposerError("")} onSend={sendMessage} /><p className="mt-2 text-center text-xs text-[var(--gray-700)]">AI estimate. Confirm with a local agriculture officer.</p></div></div>
    </div>
  </div>;
}
