import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"]
};

export default createMDX({
  options: {
    remarkPlugins: [remarkGfm]
  }
})(nextConfig);
