import path from "node:path"
import type { NextConfig } from "next"

// standalone build is used for production builds
const isStandalone = process.env.BUILD_STANDALONE === "true"

// In development, we want to proxy API requests to the backend server
const isDevelopment = process.env.NODE_ENV === "development"

const nextConfig: NextConfig = {
  ...(isStandalone
    ? {
        output: "standalone",
        outputFileTracingRoot: path.join(__dirname, "../../"),
      }
    : {}),

  async rewrites() {
    if (!isDevelopment) return []

    const host = process.env.BACKEND_HOST || "localhost"
    const port = process.env.BACKEND_PORT || "3000"
    const backendUrl = `http://${host}:${port}`

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig