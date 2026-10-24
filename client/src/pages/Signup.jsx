import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", language: "en" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: "" })); }
  async function submit(event) {
    event.preventDefault(); setError("");
    const errors = {};
    if (form.name.trim().length < 2) errors.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address.";
    if (form.password.length < 8) errors.password = "Use at least 8 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try { await signup({ ...form, name: form.name.trim(), email: form.email.trim() }); navigate("/chat", { replace: true }); }
    catch (e) { setError(e.message || "We could not create your account."); }
    finally { setBusy(false); }
  }
  return <AuthLayout title="Create your account" subtitle="Save your crop checks and return to your reports." sideTitle="A clearer view of your field."><form onSubmit={submit} noValidate className="space-y-5">
    {error && <p role="alert" className="error-box">{error}</p>}
    <div><label htmlFor="signup-name" className="field-label">Full name</label><input id="signup-name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} className="field-input" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "signup-name-error" : undefined} />{fieldErrors.name && <p id="signup-name-error" className="field-error">{fieldErrors.name}</p>}</div>
    <div><label htmlFor="signup-email" className="field-label">Email address</label><input id="signup-email" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="field-input" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined} />{fieldErrors.email && <p id="signup-email-error" className="field-error">{fieldErrors.email}</p>}</div>
    <div><label htmlFor="signup-password" className="field-label">Password</label><div className="relative"><input id="signup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className="field-input pr-12" aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-help"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p id="signup-password-help" className="mt-1 text-xs text-[var(--gray-700)]">Use at least 8 characters.</p>{fieldErrors.password && <p id="signup-password-error" className="field-error">{fieldErrors.password}</p>}</div>
    <fieldset><legend className="field-label">Preferred language</legend><div className="language-toggle"><button type="button" aria-pressed={form.language === "en"} onClick={() => update("language", "en")}>English</button><button type="button" aria-pressed={form.language === "ur"} onClick={() => update("language", "ur")}>اردو</button></div></fieldset>
    <button type="submit" disabled={busy} className="primary-button w-full justify-center">{busy && <LoaderCircle size={18} className="animate-spin" />}{busy ? "Creating account…" : "Create an account"}</button>
    <p className="text-sm text-[var(--gray-700)]">Already have an account? <Link to="/login" className="font-semibold underline underline-offset-4">Log in</Link></p>
  </form></AuthLayout>;
}
