import { Injectable, Logger } from "@nestjs/common"
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets"
import { randomUUID } from "node:crypto"
import type { Server, Socket } from "socket.io"
import { ChatMessageEventDto } from "./dto/chat-message-event.dto"
import { SummaryEventDto } from "./dto/summary-event.dto"
import { TranscriptEventDto } from "./dto/transcript-event.dto"

interface JoinTranscriptRoomPayload {
  roomId: string
}

interface TranscriptMessagePayload {
  roomName: string
  roomId: string
  timestamp: string
  type: string
  sequence: number
  text: string
  participantId?: string
  participantIdentity?: string
}

interface ChatMessagePayload {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderType: "chat" | "ai"
  text: string
  createdAt: string
}

interface SummaryMessagePayload {
  id: string
  roomId: string
  text: string
  createdAt: string
}

@Injectable()
@WebSocketGateway({
  namespace: "/conference",
  path: "/ws",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TranscriptGateway {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(TranscriptGateway.name)

  @SubscribeMessage("room:join")
  async joinRoom(
    @MessageBody() payload: JoinTranscriptRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.roomId) {
      return
    }

    const roomName = `room:${payload.roomId}`
    await client.join(roomName)
    this.logger.debug(`Socket ${client.id} joined room ${roomName}`)
  }

  @SubscribeMessage("room:leave")
  async leaveRoom(
    @MessageBody() payload: JoinTranscriptRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.roomId) {
      return
    }

    const roomName = `room:${payload.roomId}`
    await client.leave(roomName)
    this.logger.debug(`Socket ${client.id} left room ${roomName}`)
  }

  broadcastTranscript(message: TranscriptEventDto) {
    const payload: TranscriptMessagePayload = {
      roomName: message.room_name ?? message.room_id,
      roomId: message.room_id,
      timestamp: message.timestamp,
      type: message.type,
      sequence: message.sequence ?? 0,
      text: message.text,
      participantId: message.participant_id,
      participantIdentity: message.participant_identity,
    }

    const roomName = payload.roomId
      ? `room:${payload.roomId}`
      : payload.roomName

    if (roomName) {
      this.server.to(roomName).emit("transcript:new", payload)
      return
    }

    this.server.emit("transcript:new", payload)
  }

  broadcastChatMessage(message: ChatMessageEventDto) {
    const payload: ChatMessagePayload = {
      id: randomUUID(),
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderType: message.senderType,
      text: message.text,
      createdAt: message.createdAt,
    }

    this.server.to(`room:${payload.roomId}`).emit("message:new", payload)
  }

  broadcastSummary(message: SummaryEventDto) {
    const payload: SummaryMessagePayload = {
      id: randomUUID(),
      roomId: message.room_id,
      text: message.text,
      createdAt: message.timestamp,
    }

    this.server.to(`room:${payload.roomId}`).emit("summary:new", payload)
  }
}
