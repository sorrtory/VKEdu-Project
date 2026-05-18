-- CreateEnum
CREATE TYPE "ConferenceRole" AS ENUM ('host', 'participant');

-- CreateTable
CREATE TABLE "USER" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USER_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "CONFERENCE" (
    "conference_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CONFERENCE_pkey" PRIMARY KEY ("conference_id")
);

-- CreateTable
CREATE TABLE "CONFERENCE_USERS" (
    "conference_users_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "conference_id" UUID NOT NULL,
    "role" "ConferenceRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CONFERENCE_USERS_pkey" PRIMARY KEY ("conference_users_id")
);

-- CreateTable
CREATE TABLE "REFRESH_TOKEN" (
    "refresh_token_id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "REFRESH_TOKEN_pkey" PRIMARY KEY ("refresh_token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USER_email_key" ON "USER"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CONFERENCE_USERS_user_id_conference_id_key" ON "CONFERENCE_USERS"("user_id", "conference_id");

-- CreateIndex
CREATE INDEX "REFRESH_TOKEN_user_id_revoked_idx" ON "REFRESH_TOKEN"("user_id", "revoked");

-- AddForeignKey
ALTER TABLE "CONFERENCE_USERS" ADD CONSTRAINT "CONFERENCE_USERS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONFERENCE_USERS" ADD CONSTRAINT "CONFERENCE_USERS_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REFRESH_TOKEN" ADD CONSTRAINT "REFRESH_TOKEN_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
