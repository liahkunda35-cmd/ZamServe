import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
