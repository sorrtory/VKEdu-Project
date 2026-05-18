import { Injectable } from "@nestjs/common"
import type { Prisma } from "../generated/prisma/client"
import { PrismaService } from "../prisma/prisma.service"

type ChatSenderType = "chat" | "ai" | "speaker" | "system"
type ChatMessageKind = "text" | "file"
type TranscriptSource = "voice" | "chat" | "board" | "file"

interface RecordChatMessageParams {
  messageId?: string
  roomName: string
  senderId?: string
  senderName?: string
  senderType: ChatSenderType
  kind?: ChatMessageKind
  text?: string
  metadata?: Prisma.InputJsonValue
  createdAt?: string
}

interface RecordAttachmentParams {
  roomName: string
  filename: string
  bucket: string
  objectKey: string
  contentType?: string
  size: number
}

interface RecordTranscriptParams {
  roomName: string
  source?: TranscriptSource
  speakerId?: string
  speakerName?: string
  text: string
  metadata?: Prisma.InputJsonValue
  occurredAt?: string
}

interface RecordSummaryParams {
  roomName: string
  text: string
  metadata?: Prisma.InputJsonValue
  createdAt?: string
}

@Injectable()
export class ConferenceHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureRoom(roomName: string) {
    return this.ensureConferenceChat(roomName)
  }

  async recordChatMessage(params: RecordChatMessageParams) {
    const chat = await this.ensureConferenceChat(params.roomName)

    return this.prisma.chatMessage.create({
      data: {
        ...(params.messageId ? { chatMessageId: params.messageId } : {}),
        chatId: chat.chatId,
        senderId: params.senderId,
        senderName: params.senderName,
        senderType: params.senderType,
        kind: params.kind ?? "text",
        text: params.text,
        metadata: params.metadata,
        createdAt: params.createdAt ? new Date(params.createdAt) : undefined,
      },
      include: {
        attachment: true,
      },
    })
  }

  async recordAttachment(params: RecordAttachmentParams) {
    const chat = await this.ensureConferenceChat(params.roomName)
    const metadata: Prisma.InputJsonObject = {
      filename: params.filename,
      bucket: params.bucket,
      objectKey: params.objectKey,
      size: params.size,
      ...(params.contentType ? { contentType: params.contentType } : {}),
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          chatId: chat.chatId,
          senderType: "system",
          kind: "file",
          text: params.filename,
          metadata,
        },
      })

      const attachment = await tx.conferenceAttachment.create({
        data: {
          conferenceId: chat.conferenceId,
          chatMessageId: message.chatMessageId,
          filename: params.filename,
          bucket: params.bucket,
          objectKey: params.objectKey,
          contentType: params.contentType,
          size: params.size,
        },
      })

      return { message, attachment }
    })
  }

  async recordTranscript(params: RecordTranscriptParams) {
    const conference = await this.ensureConference(params.roomName)

    return this.prisma.transcriptEntry.create({
      data: {
        conferenceId: conference.conferenceId,
        source: params.source ?? "voice",
        speakerId: params.speakerId,
        speakerName: params.speakerName,
        text: params.text,
        metadata: params.metadata,
        occurredAt: params.occurredAt ? new Date(params.occurredAt) : undefined,
      },
    })
  }

  async recordSummary(params: RecordSummaryParams) {
    const conference = await this.ensureConference(params.roomName)

    return this.prisma.summaryEntry.create({
      data: {
        conferenceId: conference.conferenceId,
        text: params.text,
        metadata: params.metadata,
        createdAt: params.createdAt ? new Date(params.createdAt) : undefined,
      },
    })
  }

  async getChatHistory(roomName: string) {
    const chat = await this.getConferenceChat(roomName)
    if (!chat) {
      return []
    }

    return this.prisma.chatMessage.findMany({
      where: { chatId: chat.chatId },
      include: { attachment: true },
      orderBy: { createdAt: "asc" },
    })
  }

  async getAttachments(roomName: string) {
    const conference = await this.getConference(roomName)
    if (!conference) {
      return []
    }

    return this.prisma.conferenceAttachment.findMany({
      where: { conferenceId: conference.conferenceId },
      orderBy: { createdAt: "asc" },
    })
  }

  async getTranscriptHistory(roomName: string) {
    const conference = await this.getConference(roomName)
    if (!conference) {
      return []
    }

    return this.prisma.transcriptEntry.findMany({
      where: { conferenceId: conference.conferenceId },
      orderBy: { occurredAt: "asc" },
    })
  }

  async getSummaryHistory(roomName: string) {
    const conference = await this.getConference(roomName)
    if (!conference) {
      return []
    }

    return this.prisma.summaryEntry.findMany({
      where: { conferenceId: conference.conferenceId },
      orderBy: { createdAt: "asc" },
    })
  }

  private async ensureConferenceChat(roomName: string) {
    const conference = await this.ensureConference(roomName)

    return this.prisma.conferenceChat.upsert({
      where: { conferenceId: conference.conferenceId },
      update: {},
      create: { conferenceId: conference.conferenceId },
    })
  }

  private async ensureConference(roomName: string) {
    return this.prisma.conference.upsert({
      where: { roomName },
      update: {},
      create: {
        roomName,
        title: roomName,
      },
    })
  }

  private async getConferenceChat(roomName: string) {
    return this.prisma.conferenceChat.findFirst({
      where: { conference: { roomName } },
    })
  }

  private async getConference(roomName: string) {
    return this.prisma.conference.findUnique({
      where: { roomName },
    })
  }
}
