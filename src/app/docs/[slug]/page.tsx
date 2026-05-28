import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsShell } from "../DocsShell";
import { docs, getDoc } from "@/docs/registry";

export function generateStaticParams() {
  return docs.filter((doc) => doc.slug !== "overview").map((doc) => ({ slug: doc.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = getDoc(params.slug);
  if (!doc) {
    return {
      title: "Docs | Corporate Safe Transfer on Arc"
    };
  }

  return {
    title: `${doc.title} | Corporate Safe Transfer Docs`,
    description: doc.description
  };
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDoc(params.slug);
  if (!doc || doc.slug === "overview") {
    notFound();
  }

  const Component = doc.Component;
  return (
    <DocsShell activeSlug={doc.slug} title={doc.title} description={doc.description}>
      <Component />
    </DocsShell>
  );
}
