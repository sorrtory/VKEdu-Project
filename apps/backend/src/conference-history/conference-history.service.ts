import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { ChatMessageKind } from "../generated/prisma/enums"
import type { Prisma } from "../generated/prisma/client"

interface SaveChatMessageParams {
  roomId: string
  senderId?: string | null
  senderName?: string | null
  senderType: "chat" | "ai" | "speaker" | "system"
  text: string
  createdAt?: string | Date
  metadata?: Prisma.InputJsonValue
}

interface SaveTranscriptParams {
  roomId: string
  text: string
  source?: "voice" | "chat" | "board" | "file"
  speakerId?: string | null
  speakerName?: string | null
  occurredAt?: string | Date
  metadata?: Prisma.InputJsonValue
}

interface SaveSummaryParams {
  roomId: string
  text: string
  createdAt?: string | Date
  metadata?: Prisma.InputJsonValue
}

interface SaveAttachmentParams {
  roomId: string
  filename: string
  bucket: string
  objectKey: string
  contentType?: string | null
  size: number
}

@Injectable()
export class ConferenceHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureConference(roomName: string) {
    return this.getOrCreateConference(roomName)
  }

  async saveChatMessage(params: SaveChatMessageParams) {
    const chat = await this.getOrCreateChat(params.roomId)

    return this.prisma.chatMessage.create({
      data: {
        chatId: chat.chatId,
        senderId: params.senderId ?? null,
        senderName: params.senderName ?? null,
        senderType: params.senderType,
        kind: ChatMessageKind.text,
        text: params.text,
        metadata: params.metadata,
        createdAt: this.parseDate(params.createdAt),
      },
    })
  }

  async saveTranscriptEntry(params: SaveTranscriptParams) {
    const conference = await this.getOrCreateConference(params.roomId)

    return this.prisma.transcriptEntry.create({
      data: {
        conferenceId: conference.conferenceId,
        source: params.source ?? "voice",
        speakerId: params.speakerId ?? null,
        speakerName: params.speakerName ?? null,
        text: params.text,
        metadata: params.metadata,
        occurredAt: this.parseDate(params.occurredAt),
      },
    })
  }

  async saveSummaryEntry(params: SaveSummaryParams) {
    const conference = await this.getOrCreateConference(params.roomId)

    return this.prisma.summaryEntry.create({
      data: {
        conferenceId: conference.conferenceId,
        text: params.text,
        metadata: params.metadata,
        createdAt: this.parseDate(params.createdAt),
      },
    })
  }

  async saveAttachment(params: SaveAttachmentParams) {
    const conference = await this.getOrCreateConference(params.roomId)

    return this.prisma.conferenceAttachment.create({
      data: {
        conferenceId: conference.conferenceId,
        filename: params.filename,
        bucket: params.bucket,
        objectKey: params.objectKey,
        contentType: params.contentType ?? null,
        size: params.size,
      },
    })
  }

  async getChatHistory(roomId: string) {
    const chat = await this.prisma.conferenceChat.findFirst({
      where: { conference: { roomName: roomId } },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    return (chat?.messages ?? []).map((message) => ({
      id: message.chatMessageId,
      roomId,
      senderId: message.senderId ?? "",
      senderName: message.senderName ?? "unknown",
      senderType: message.senderType,
      text: message.text ?? "",
      createdAt: message.createdAt.toISOString(),
    }))
  }

  async getTranscriptHistory(roomId: string) {
    const entries = await this.prisma.transcriptEntry.findMany({
      where: { conference: { roomName: roomId } },
      orderBy: { occurredAt: "asc" },
    })

    return entries.map((entry) => ({
      id: entry.transcriptEntryId,
      roomId,
      text: entry.text,
      createdAt: entry.occurredAt.toISOString(),
      speakerId: entry.speakerId,
      speakerName: entry.speakerName,
      source: entry.source,
    }))
  }

  async getSummaryHistory(roomId: string) {
    const entries = await this.prisma.summaryEntry.findMany({
      where: { conference: { roomName: roomId } },
      orderBy: { createdAt: "asc" },
    })

    return entries.map((entry) => ({
      id: entry.summaryEntryId,
      roomId,
      text: entry.text,
      createdAt: entry.createdAt.toISOString(),
    }))
  }

  async listConferences() {
    const conferences = await this.prisma.conference.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            attachments: true,
            transcriptEntries: true,
            summaryEntries: true,
          },
        },
        chat: {
          select: {
            _count: {
              select: {
                messages: true,
              },
            },
          },
        },
      },
    })

    return conferences.map((conference) => ({
      id: conference.conferenceId,
      roomName: conference.roomName ?? conference.conferenceId,
      title: conference.title,
      description: conference.description,
      startedAt: conference.startedAt?.toISOString() ?? null,
      endedAt: conference.endedAt?.toISOString() ?? null,
      createdAt: conference.createdAt.toISOString(),
      updatedAt: conference.updatedAt.toISOString(),
      counts: {
        chatMessages: conference.chat?._count.messages ?? 0,
        transcriptEntries: conference._count.transcriptEntries,
        summaryEntries: conference._count.summaryEntries,
        attachments: conference._count.attachments,
      },
    }))
  }

  private async getOrCreateConference(roomName: string) {
    const existingConference = await this.prisma.conference.findUnique({
      where: { roomName },
    })
    if (existingConference) {
      return existingConference
    }

    try {
      return await this.prisma.conference.create({
        data: {
          roomName,
          title: roomName,
          startedAt: new Date(),
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const conference = await this.prisma.conference.findUnique({
          where: { roomName },
        })

        if (conference) {
          return conference
        }
      }

      throw error
    }
  }

  private async getOrCreateChat(roomName: string) {
    const conference = await this.getOrCreateConference(roomName)

    const existingChat = await this.prisma.conferenceChat.findUnique({
      where: { conferenceId: conference.conferenceId },
    })
    if (existingChat) {
      return existingChat
    }

    try {
      return await this.prisma.conferenceChat.create({
        data: {
          conferenceId: conference.conferenceId,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const chat = await this.prisma.conferenceChat.findUnique({
          where: { conferenceId: conference.conferenceId },
        })

        if (chat) {
          return chat
        }
      }

      throw error
    }
  }

  private parseDate(value?: string | Date) {
    if (value instanceof Date) {
      return value
    }

    if (typeof value === "string") {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    return new Date()
  }
}
