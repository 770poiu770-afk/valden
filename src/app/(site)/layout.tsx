import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CompareBar } from "@/components/client/CompareToggle";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (<><SiteHeader /><main id="main">{children}</main><SiteFooter /><CompareBar /></>);
}
