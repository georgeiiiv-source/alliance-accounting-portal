import type { Metadata } from "next";
import "@/src/styles.css";
import "@/src/phase2.css";
import "@/src/phase3.css";
import "@/src/document-workflow.css";

export const metadata: Metadata = {
  title: { default: "Alliance Accounting & Financial Services", template: "%s | Alliance Accounting" },
  description: "Tax, bookkeeping, payroll, and advisory services with a secure client portal."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
