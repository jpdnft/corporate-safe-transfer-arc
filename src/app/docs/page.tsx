import type { Metadata } from "next";
import { DocsShell } from "./DocsShell";
import { getDoc } from "@/docs/registry";

const doc = getDoc("overview");

export const metadata: Metadata = {
  title: "Docs | Corporate Safe Transfer on Arc",
  description: doc?.description
};

export default function DocsIndexPage() {
  if (!doc) return null;

  const Component = doc.Component;
  return (
    <DocsShell activeSlug={doc.slug} title={doc.title} description={doc.description}>
      <Component />
    </DocsShell>
  );
}
