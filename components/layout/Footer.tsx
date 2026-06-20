import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return <footer><div className="footer-top"><div><Logo light/><p>Confident finances. Clear decisions.<br/>A better accounting relationship.</p><div className="badge"><ShieldCheck/> IRS Publication 4557-aligned safeguards</div></div><div><b>Firm</b><Link href="/about">About Us</Link><Link href="/services">Services</Link><Link href="/pricing">Pricing</Link><Link href="/contact">Contact</Link></div><div><b>Resources</b><Link href="/faq">FAQ</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/security">Data Security Policy</Link></div><div><b>Contact</b><p>hello@allianceaccountant.com<br/>(415) 555-0182<br/>Mon–Fri, 8am–6pm PT</p></div></div><div className="footer-bottom">© 2026 AllianceAccounting &amp; Financial Services, Inc. <span>IRS records are accessed only with taxpayer authorization.</span></div></footer>;
}
