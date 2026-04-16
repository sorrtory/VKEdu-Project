import dotenv from "dotenv"
import dotenvExpand from "dotenv-expand"

// load .env in development
dotenvExpand.expand(dotenv.config({ path: "../../.env" }))
// rely on runtime environment variables in production

import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "yarn tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
