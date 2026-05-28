import Link from "next/link";
import type { ReactNode } from "react";
import { docs } from "@/docs/registry";

export function DocsShell({
  activeSlug,
  children,
  description,
  title
}: {
  activeSlug: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="docsShell">
      <aside className="docsSidebar">
        <Link className="docsBrand" href="/">
          Corporate Safe Transfer
        </Link>
        <nav aria-label="Documentation">
          {docs.map((doc) => (
            <Link key={doc.slug} className={doc.slug === activeSlug ? "active" : ""} href={doc.slug === "overview" ? "/docs" : `/docs/${doc.slug}`}>
              {doc.title}
            </Link>
          ))}
        </nav>
      </aside>
      <article className="docsContent">
        <header className="docsHeader">
          <p className="eyebrow">Documentation</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div className="mdxBody">{children}</div>
      </article>
    </main>
  );
}
