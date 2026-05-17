import path from "node:path"
import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"


const rootDir = path.join(__dirname, "../../")
const envResult = loadEnvConfig(rootDir, true, console, true)

console.log("Loaded env files:", envResult.loadedEnvFiles.map((f) => f.path))

if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_LIVEKIT_URL is not set. Please set it to the URL of your LiveKit server.",
  )
}


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

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) return []

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
