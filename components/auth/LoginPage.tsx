"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export function LoginPage({ verified = false, tokenError = false }: { verified?: boolean; tokenError?: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    if (result?.error) { setError("Sign-in failed. Check your credentials and verify your email address."); setLoading(false); return; }
    const session = await fetch("/api/auth/session").then(response => response.json());
    window.location.href = session?.user?.role === "CLIENT" ? "/portal" : "/admin";
  }
  return <div className="login-page"><div className="login-side"><Logo light/><div><div className="eyebrow light"><span/> PRIVATE CLIENT ACCESS</div><h1>Your financial world,<br/><em>in one secure place.</em></h1><p>Share documents, track progress, and stay connected with your Alliance team.</p></div><div className="login-security"><ShieldCheck/><span><b>Protected at every step</b><small>Encrypted storage · Role-based access · Automatic session timeout</small></span></div></div><div className="login-form"><div className="form-wrap"><h2>Welcome back</h2><p>Sign in to your secure client portal.</p>{verified&&<p className="success-message" role="status">Your email is verified. You can now sign in.</p>}{tokenError&&<p className="form-error" role="alert">That verification link is invalid or expired.</p>}<form onSubmit={submit}><label>Email address<input name="email" type="email" required autoComplete="email"/></label><label><span>Password <Link href="/forgot-password">Forgot password?</Link></span><input name="password" type="password" required minLength={12} autoComplete="current-password"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="btn" disabled={loading}>{loading?"Signing in…":"Sign in securely"} <ArrowRight/></button></form><div className="mfa"><LockKeyhole/> Multi-factor authentication can be enabled for your account</div><div className="switch">New to Alliance? <Link href="/register">Create an account</Link></div></div></div></div>;
}
