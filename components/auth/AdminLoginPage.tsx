"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    if (result?.error) { setError("Sign-in failed. Check your administrator credentials."); setLoading(false); return; }
    const session = await fetch("/api/auth/session").then(response => response.json());
    if (!session?.user || !["STAFF", "ADMIN"].includes(session.user.role)) {
      await signOut({ redirect: false });
      setError("This sign-in page is for staff and administrators only.");
      setLoading(false);
      return;
    }
    window.location.href = "/admin/documents";
  }

  return <div className="login-page admin-login-page">
    <div className="login-side">
      <Logo light />
      <div><div className="eyebrow light"><span /> FIRM ADMINISTRATION</div><h1>Secure staff<br /><em>workspace access.</em></h1><p>Review client documents, manage workflows, and oversee firm operations.</p></div>
      <div className="login-security"><ShieldCheck /><span><b>Protected at every step</b><small>Encrypted storage · Role-based access · Automatic session timeout</small></span></div>
    </div>
    <div className="login-form"><div className="form-wrap">
      <h2>Administrator sign in</h2><p>Use an authorized staff or administrator account.</p>
      <form onSubmit={submit}>
        <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
        <label><span>Password <Link href="/forgot-password">Forgot password?</Link></span><input name="password" type="password" required minLength={12} autoComplete="current-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn" disabled={loading}>{loading ? "Signing in..." : "Enter staff workspace"} <ArrowRight /></button>
      </form>
      <div className="mfa"><LockKeyhole /> Multi-factor authentication can be enabled for your account</div>
      <div className="switch">Client account? <Link href="/login">Use client sign in</Link></div>
    </div></div>
  </div>;
}
