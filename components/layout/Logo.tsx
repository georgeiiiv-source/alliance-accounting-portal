import Link from "next/link";
export function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`logo ${light ? "light" : ""}`} aria-label="Alliance Accounting home"><span className="mark">A</span><span><b>ALLIANCE</b><small>ACCOUNTING &amp; FINANCIAL SERVICES</small></span></Link>;
}
