import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Logo } from "./Logo";

const links = [["Home", "/"], ["Services", "/services"], ["Pricing", "/pricing"], ["About Us", "/about"], ["Contact", "/contact"]];
export function Header() {
  return <header className="site-head"><Logo/><nav aria-label="Primary navigation">{links.map(([label, href])=><Link key={href} href={href}>{label}</Link>)}</nav><div className="head-actions"><Link className="login" href="/login"><LockKeyhole/> Client login</Link><Link className="btn" href="/contact">Get started <ArrowRight/></Link></div></header>;
}
