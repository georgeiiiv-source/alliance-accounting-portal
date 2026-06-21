"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

type RegistrationResult = {
  message: string;
  success: boolean;
  verificationUrl?: string;
};

export function RegisterPage() {
  const [result, setResult] = useState<RegistrationResult>({ message: "", success: false });
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult({ message: "", success: false });
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setResult({ message: "Passwords do not match.", success: false });
      setSending(false);
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = await response.json();
    if (!response.ok) {
      setResult({ message: body.error ?? "Registration failed.", success: false });
    } else if (body.emailDelivered) {
      setResult({
        message: "Account created. Verification email sent successfully - check your inbox.",
        success: true,
        verificationUrl: body.verificationUrl,
      });
    } else {
      setResult({
        message: body.emailError ?? "Account created, but the verification email could not be sent. Check the server log.",
        success: false,
        verificationUrl: body.verificationUrl,
      });
    }
    setSending(false);
  }

  return <div className="login-page">
    <div className="login-side">
      <Logo light />
      <div>
        <div className="eyebrow light"><span /> SECURE ONBOARDING</div>
        <h1>Start your Alliance<br /><em>client relationship.</em></h1>
        <p>Create an account, verify your email, and complete your secure profile.</p>
      </div>
      <div className="login-security"><ShieldCheck /><span><b>Privacy by design</b><small>Least-privilege access · Encrypted records · Complete audit trail</small></span></div>
    </div>
    <div className="login-form">
      <div className="form-wrap">
        <h2>Create your account</h2>
        <p>Use a unique password with at least 12 characters.</p>
        <form onSubmit={submit}>
          <label>Full name<input name="name" required minLength={2} /></label>
          <label>Email address<input name="email" required type="email" /></label>
          <label>Password<input name="password" required type="password" minLength={12} /></label>
          <label>Confirm password<input name="confirm" required type="password" minLength={12} /></label>
          <button className="btn" disabled={sending}>{sending ? "Creating..." : "Create secure account"} <ArrowRight /></button>
        </form>
        {result.message && <p className={result.success ? "success-message" : "form-error"} role="status">{result.message}</p>}
        {result.verificationUrl && <p><a href={result.verificationUrl}>Open local verification link</a></p>}
        <div className="switch">Already registered? <Link href="/login">Sign in</Link></div>
      </div>
    </div>
  </div>;
}
