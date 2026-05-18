import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets"
import { UsePipes, ValidationPipe } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { Server, Socket } from "socket.io"
import { KafkaProducerService } from "../kafka/kafka-producer.service"
import { ConferenceHistoryService } from "../conference/conference-history.service"
import { JoinRoomDto } from "./dto/join-room.dto"
import { LeaveRoomDto } from "./dto/leave-room.dto"
import { SendMessageDto } from "./dto/send-message.dto"
import { ChatMessageEventDto } from "../kafka/dto/chat-message-event.dto"

interface ChatSocketData {
  participantId?: string
  participantName?: string
  joinedRooms?: Set<string>
}

interface RoomEvent {
  roomId: string
  participantId: string
  participantName: string
  socketId: string
  createdAt: string
}

interface MessageEvent {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderType: "chat" | "ai"
  text: string
  createdAt: string
}

@WebSocketGateway({
  namespace: "/conference",
  path: "/ws",
  cors: {
    origin: "*",
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server

  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly conferenceHistoryService: ConferenceHistoryService,
  ) {}

  @SubscribeMessage("room:join")
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinRoomDto,
  ): Promise<RoomEvent> {
    const roomName = this.getRoomName(payload.roomId)
    const socketData = socket.data as ChatSocketData

    socketData.participantId = payload.participantId
    socketData.participantName = payload.participantName
    socketData.joinedRooms = socketData.joinedRooms ?? new Set<string>()
    socketData.joinedRooms.add(payload.roomId)

    await socket.join(roomName)

    const event = this.createRoomEvent(
      payload.roomId,
      payload.participantId,
      payload.participantName,
      socket.id,
    )

    this.server.to(roomName).emit("room:joined", event)
    return event
  }

  @SubscribeMessage("room:leave")
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: LeaveRoomDto,
  ): Promise<RoomEvent> {
    const socketData = socket.data as ChatSocketData
    const participantId = socketData.participantId ?? socket.id
    const participantName = socketData.participantName ?? "unknown"

    await this.leaveRoom(socket, payload.roomId, participantId, participantName)

    return this.createRoomEvent(
      payload.roomId,
      participantId,
      participantName,
      socket.id,
    )
  }

  @SubscribeMessage("message:send")
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<MessageEvent> {
    const socketData = socket.data as ChatSocketData
    const roomName = this.getRoomName(payload.roomId)

    if (!socketData.joinedRooms?.has(payload.roomId)) {
      throw new WsException("Join the room before sending messages")
    }

    const senderName =
      payload.senderName ?? socketData.participantName ?? "unknown"
    const senderId = payload.senderId ?? socketData.participantId ?? socket.id
    const text = payload.text.trim()

    if (!text) {
      throw new WsException("Message text must not be empty")
    }

    const senderType = text.startsWith("@ai") ? "ai" : "chat"
    const event = this.createMessageEvent(
      payload.roomId,
      senderId,
      senderName,
      senderType,
      text,
    )

    await this.conferenceHistoryService.recordChatMessage({
      messageId: event.id,
      roomName: event.roomId,
      senderId: event.senderId,
      senderName: event.senderName,
      senderType: event.senderType,
      text: event.text,
      createdAt: event.createdAt,
    })

    this.server.to(roomName).emit("message:new", event)
    this.emitKafkaEvent(event)

    return event
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const socketData = socket.data as ChatSocketData
    const participantId = socketData.participantId ?? socket.id
    const participantName = socketData.participantName ?? "unknown"
    const joinedRooms = socketData.joinedRooms ?? new Set<string>()

    for (const roomId of joinedRooms) {
      await this.leaveRoom(socket, roomId, participantId, participantName)
    }
  }

  private async leaveRoom(
    socket: Socket,
    roomId: string,
    participantId: string,
    participantName: string,
  ): Promise<void> {
    const socketData = socket.data as ChatSocketData
    const roomName = this.getRoomName(roomId)

    await socket.leave(roomName)
    socketData.joinedRooms?.delete(roomId)

    this.server
      .to(roomName)
      .emit(
        "room:left",
        this.createRoomEvent(roomId, participantId, participantName, socket.id),
      )
  }

  private emitKafkaEvent(event: MessageEvent): void {
    const payload: ChatMessageEventDto = {
      roomId: event.roomId,
      senderId: event.senderId,
      senderName: event.senderName,
      senderType: event.senderType,
      text: event.text,
      createdAt: event.createdAt,
    }

    if (event.senderType === "ai") {
      this.kafkaProducerService.emitChatAiRequestEvent(payload)
      return
    }

    this.kafkaProducerService.emitChatEvent(payload)
  }

  private createRoomEvent(
    roomId: string,
    participantId: string,
    participantName: string,
    socketId: string,
  ): RoomEvent {
    return {
      roomId,
      participantId,
      participantName,
      socketId,
      createdAt: new Date().toISOString(),
    }
  }

  private createMessageEvent(
    roomId: string,
    senderId: string,
    senderName: string,
    senderType: "chat" | "ai",
    text: string,
  ): MessageEvent {
    return {
      id: randomUUID(),
      roomId,
      senderId,
      senderName,
      senderType,
      text,
      createdAt: new Date().toISOString(),
    }
  }

  private getRoomName(roomId: string): string {
    return `room:${roomId}`
  }
}
