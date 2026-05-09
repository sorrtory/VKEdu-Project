import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcrypt"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
async function main() {
  // create or update a single superuser with a hashed password
  const superuserPassword = process.env.BACKEND_SUPERUSER_PASSWORD
  if (!superuserPassword) {
    throw new Error(
      "BACKEND_SUPERUSER_PASSWORD environment variable is not set",
    )
  }
  const superuserHash = await bcrypt.hash(superuserPassword, 10)
  const superuser = await prisma.user.upsert({
    where: { email: "admin@broadboard.ru" }, // idempotent identifier
    update: { passwordHash: superuserHash, nickname: "superuser" },
    create: {
      email: "admin@broadboard.ru",
      nickname: "superuser",
      passwordHash: superuserHash,
    },
  })
  console.log("Superuser created or updated:", superuser)
}
main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
