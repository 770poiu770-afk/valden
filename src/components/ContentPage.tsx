import type { ReactNode } from "react";
import { Notice } from "./ui";

export function ContentPage({ title, intro, children, legal = false, aside }: { title: string; intro?: ReactNode; children: ReactNode; legal?: boolean; aside?: ReactNode }) {
  const showTemplateNote = legal && process.env.NODE_ENV !== "production";
  return (
    <div className="container-page py-12">
      <div className={aside ? "grid gap-10 lg:grid-cols-[1fr_20rem]" : ""}>
        <article className="max-w-[72ch]">
          <h1 className="display text-[34px] sm:text-[44px]">{title}</h1>
          {intro && <p className="mt-4 text-lg text-steel-500">{intro}</p>}
          {showTemplateNote && <div className="mt-6"><Notice tone="warn" title="Template text">This policy is a starting template and must be reviewed by qualified counsel for your jurisdictions before launch. This notice is hidden in production builds.</Notice></div>}
          <div className="prose-body mt-8">{children}</div>
        </article>
        {aside && <aside className="space-y-4 self-start">{aside}</aside>}
      </div>
    </div>
  );
}
