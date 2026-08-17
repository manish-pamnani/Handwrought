import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's auth module pulls in jose (ESM-only) via jwks-rsa;
  // bundling it triggers an ERR_REQUIRE_ESM at runtime. Keeping it external
  // makes Node resolve it natively instead of going through the bundler.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
