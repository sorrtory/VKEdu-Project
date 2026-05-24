import { Injectable, Logger } from "@nestjs/common"
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets"
import type { Server, Socket } from "socket.io"
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
  joinRoom(
    @MessageBody() payload: JoinTranscriptRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.roomId) {
      return
    }

    const roomName = `room:${payload.roomId}`
    client.join(roomName)
    this.logger.debug(`Socket ${client.id} joined room ${roomName}`)
  }

  @SubscribeMessage("room:leave")
  leaveRoom(
    @MessageBody() payload: JoinTranscriptRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.roomId) {
      return
    }

    const roomName = `room:${payload.roomId}`
    client.leave(roomName)
    this.logger.debug(`Socket ${client.id} left room ${roomName}`)
  }

  broadcastTranscript(message: TranscriptEventDto) {
    const payload: TranscriptMessagePayload = {
      roomName: message.room_name,
      roomId: message.room_id,
      timestamp: message.timestamp,
      type: message.type,
      sequence: message.sequence,
      text: message.text,
      participantId: message.participant_id,
      participantIdentity: message.participant_identity,
    }

    const roomName = payload.roomId ? `room:${payload.roomId}` : payload.roomName

    if (roomName) {
      this.server.to(roomName).emit("transcript:new", payload)
      return
    }

    this.server.emit("transcript:new", payload)
  }
}