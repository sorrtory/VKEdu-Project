const DEVELOPMENT_JWT_SECRET = "dev-insecure-jwt-secret"

let hasWarnedAboutJwtFallback = false

export function getJwtSecret(): string {
  const secret = process.env.BACKEND_JWT_SECRET?.trim()
  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_JWT_SECRET must be set in production")
  }

  if (!hasWarnedAboutJwtFallback) {
    console.warn(
      "Warning: BACKEND_JWT_SECRET is not set. Falling back to an insecure development secret.",
    )
    hasWarnedAboutJwtFallback = true
  }

  return DEVELOPMENT_JWT_SECRET
}
