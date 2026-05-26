-- CreateEnum
CREATE TYPE "ConferenceRole" AS ENUM ('host', 'participant');

-- CreateEnum
CREATE TYPE "ChatMessageKind" AS ENUM ('text', 'file');

-- CreateEnum
CREATE TYPE "ChatMessageSenderType" AS ENUM ('chat', 'ai', 'speaker', 'system');

-- CreateEnum
CREATE TYPE "TranscriptSource" AS ENUM ('voice', 'chat', 'board', 'file');

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
    "room_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CONFERENCE_pkey" PRIMARY KEY ("conference_id")
);

-- CreateTable
CREATE TABLE "CONFERENCE_CHAT" (
    "chat_id" UUID NOT NULL,
    "conference_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CONFERENCE_CHAT_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "CHAT_MESSAGE" (
    "chat_message_id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "sender_type" "ChatMessageSenderType" NOT NULL,
    "kind" "ChatMessageKind" NOT NULL DEFAULT 'text',
    "text" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CHAT_MESSAGE_pkey" PRIMARY KEY ("chat_message_id")
);

-- CreateTable
CREATE TABLE "CONFERENCE_ATTACHMENT" (
    "attachment_id" UUID NOT NULL,
    "conference_id" UUID NOT NULL,
    "chat_message_id" UUID,
    "filename" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "content_type" TEXT,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CONFERENCE_ATTACHMENT_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "TRANSCRIPT_ENTRY" (
    "transcript_entry_id" UUID NOT NULL,
    "conference_id" UUID NOT NULL,
    "source" "TranscriptSource" NOT NULL DEFAULT 'voice',
    "speaker_id" TEXT,
    "speaker_name" TEXT,
    "text" TEXT NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TRANSCRIPT_ENTRY_pkey" PRIMARY KEY ("transcript_entry_id")
);

-- CreateTable
CREATE TABLE "SUMMARY_ENTRY" (
    "summary_entry_id" UUID NOT NULL,
    "conference_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SUMMARY_ENTRY_pkey" PRIMARY KEY ("summary_entry_id")
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
CREATE UNIQUE INDEX "CONFERENCE_room_name_key" ON "CONFERENCE"("room_name");

-- CreateIndex
CREATE UNIQUE INDEX "CONFERENCE_CHAT_conference_id_key" ON "CONFERENCE_CHAT"("conference_id");

-- CreateIndex
CREATE INDEX "CHAT_MESSAGE_chat_id_created_at_idx" ON "CHAT_MESSAGE"("chat_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CONFERENCE_ATTACHMENT_chat_message_id_key" ON "CONFERENCE_ATTACHMENT"("chat_message_id");

-- CreateIndex
CREATE INDEX "CONFERENCE_ATTACHMENT_conference_id_created_at_idx" ON "CONFERENCE_ATTACHMENT"("conference_id", "created_at");

-- CreateIndex
CREATE INDEX "CONFERENCE_ATTACHMENT_object_key_idx" ON "CONFERENCE_ATTACHMENT"("object_key");

-- CreateIndex
CREATE INDEX "TRANSCRIPT_ENTRY_conference_id_occurred_at_idx" ON "TRANSCRIPT_ENTRY"("conference_id", "occurred_at");

-- CreateIndex
CREATE INDEX "SUMMARY_ENTRY_conference_id_created_at_idx" ON "SUMMARY_ENTRY"("conference_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CONFERENCE_USERS_user_id_conference_id_key" ON "CONFERENCE_USERS"("user_id", "conference_id");

-- CreateIndex
CREATE INDEX "REFRESH_TOKEN_user_id_revoked_idx" ON "REFRESH_TOKEN"("user_id", "revoked");

-- AddForeignKey
ALTER TABLE "CONFERENCE_CHAT" ADD CONSTRAINT "CONFERENCE_CHAT_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CHAT_MESSAGE" ADD CONSTRAINT "CHAT_MESSAGE_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "CONFERENCE_CHAT"("chat_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONFERENCE_ATTACHMENT" ADD CONSTRAINT "CONFERENCE_ATTACHMENT_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONFERENCE_ATTACHMENT" ADD CONSTRAINT "CONFERENCE_ATTACHMENT_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "CHAT_MESSAGE"("chat_message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRANSCRIPT_ENTRY" ADD CONSTRAINT "TRANSCRIPT_ENTRY_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SUMMARY_ENTRY" ADD CONSTRAINT "SUMMARY_ENTRY_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONFERENCE_USERS" ADD CONSTRAINT "CONFERENCE_USERS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONFERENCE_USERS" ADD CONSTRAINT "CONFERENCE_USERS_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "CONFERENCE"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "REFRESH_TOKEN" ADD CONSTRAINT "REFRESH_TOKEN_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
