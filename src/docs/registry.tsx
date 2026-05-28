import type { ComponentType } from "react";
import Architecture from "../../docs/architecture.mdx";
import Configuration from "../../docs/configuration.mdx";
import Contracts from "../../docs/contracts.mdx";
import Glossary from "../../docs/glossary.mdx";
import Overview from "../../docs/overview.mdx";
import SecurityModel from "../../docs/security-model.mdx";
import Setup from "../../docs/setup.mdx";
import Troubleshooting from "../../docs/troubleshooting.mdx";
import Usage from "../../docs/usage.mdx";

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
};

export const docs: DocPage[] = [
  {
    slug: "overview",
    title: "Overview",
    description: "Purpose, audience, and scope for Corporate Safe Transfer.",
    Component: Overview
  },
  {
    slug: "architecture",
    title: "Architecture",
    description: "How the smart contract, dApp, tests, deployment scripts, and docs fit together.",
    Component: Architecture
  },
  {
    slug: "setup",
    title: "Setup",
    description: "Install dependencies, configure environment files, run tests, and start the app.",
    Component: Setup
  },
  {
    slug: "usage",
    title: "Usage",
    description: "Role-based walkthrough for Mary, Ralph, and Rita.",
    Component: Usage
  },
  {
    slug: "security-model",
    title: "Security Model",
    description: "Trust boundaries, onchain controls, limitations, and production considerations.",
    Component: SecurityModel
  },
  {
    slug: "contracts",
    title: "Contracts",
    description: "Function-level reference for the CorporateSafeTransfer smart contract.",
    Component: Contracts
  },
  {
    slug: "configuration",
    title: "Configuration",
    description: "Deployment and frontend environment variables.",
    Component: Configuration
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Common setup, wallet, network, deposit, and withdrawal issues.",
    Component: Troubleshooting
  },
  {
    slug: "glossary",
    title: "Glossary",
    description: "Key terms used by the app and documentation.",
    Component: Glossary
  }
];

export function getDoc(slug: string) {
  return docs.find((doc) => doc.slug === slug);
}
