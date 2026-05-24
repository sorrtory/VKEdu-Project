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
  roomName: string
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
    if (!payload.roomName) {
      return
    }

    client.join(payload.roomName)
    this.logger.debug(`Socket ${client.id} joined room ${payload.roomName}`)
  }

  @SubscribeMessage("room:leave")
  leaveRoom(
    @MessageBody() payload: JoinTranscriptRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.roomName) {
      return
    }

    client.leave(payload.roomName)
    this.logger.debug(`Socket ${client.id} left room ${payload.roomName}`)
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

    if (payload.roomName) {
      this.server.to(payload.roomName).emit("transcript:new", payload)
      return
    }

    this.server.emit("transcript:new", payload)
  }
}