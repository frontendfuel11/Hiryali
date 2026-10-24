import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  async function submit(event) {
    event.preventDefault(); setError("");
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try { await login({ email: email.trim(), password }); navigate("/chat", { replace: true }); }
    catch (e) { setError(e.message || "We could not log you in."); }
    finally { setBusy(false); }
  }
  return <AuthLayout title="Welcome back" subtitle="Log in to open your crop checks and reports." sideTitle="Keep your field checks together."><form onSubmit={submit} noValidate className="space-y-5">
    {error && <p role="alert" className="error-box">{error}</p>}
    <div><label htmlFor="login-email" className="field-label">Email address</label><input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((old) => ({ ...old, email: "" })); }} className="field-input" aria-invalid={!!fieldErrors.email} />{fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}</div>
    <div><label htmlFor="login-password" className="field-label">Password</label><div className="relative"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((old) => ({ ...old, password: "" })); }} className="field-input pr-12" aria-invalid={!!fieldErrors.password} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}</div>
    <button type="submit" disabled={busy} className="primary-button w-full justify-center">{busy && <LoaderCircle size={18} className="animate-spin" />}{busy ? "Logging in…" : "Log in"}</button>
    <p className="text-sm text-[var(--gray-700)]">New to Hariyali? <Link to="/signup" className="font-semibold underline underline-offset-4">Create an account</Link></p>
  </form></AuthLayout>;
}
