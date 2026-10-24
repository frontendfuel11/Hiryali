import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Brand from "../components/Brand";
import { CONFIG } from "../config";

export default function AuthLayout({ title, subtitle, children, sideTitle }) {
  return <main className="min-h-screen"><header className="site-width flex min-h-[76px] items-center justify-between border-b border-[var(--gray-200)]"><Brand /><Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--gray-700)] hover:text-[var(--green)]"><ArrowLeft size={16} />Homepage</Link></header><div className="auth-layout site-width"><section className="auth-form-wrap"><p className="eyebrow">Your crop, your language</p><h1 className="!text-4xl sm:!text-5xl">{title}</h1><p className="mt-4 max-w-md text-[var(--gray-700)]">{subtitle}</p><div className="mt-8">{children}</div></section><aside className="auth-photo-wrap"><img src={CONFIG.images.auth} alt="Farmer standing in a crop field" width="900" height="1100" onError={(e) => { e.currentTarget.hidden = true; e.currentTarget.nextElementSibling.hidden = false; }} /><div className="photo-fallback" hidden><span>Photo asset needed</span><small>{CONFIG.images.auth}</small></div><div className="auth-photo-caption"><h2>{sideTitle}</h2><p className="mt-3 leading-7">Share what you can see. Review the report, then confirm important decisions with a local agriculture officer.</p></div></aside></div></main>;
}
