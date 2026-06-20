import { Header } from "./Header";
import { Footer } from "./Footer";
export function MarketingShell({ children }: { children: React.ReactNode }) { return <><Header/><main>{children}</main><Footer/></>; }
