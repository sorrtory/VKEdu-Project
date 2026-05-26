import { Injectable } from "@nestjs/common"
import { HelloEventDto } from "./dto/hello-event.dto"
import { TranscriptEventDto } from "./dto/transcript-event.dto"
import { ChatMessageEventDto } from "./dto/chat-message-event.dto"
import { SummaryEventDto } from "./dto/summary-event.dto"
import { TranscriptGateway } from "./transcript.gateway"
import { ConferenceHistoryService } from "../conference-history/conference-history.service"

@Injectable()
export class KafkaConsumerService {
  constructor(
    private readonly transcriptGateway: TranscriptGateway,
    private readonly conferenceHistoryService: ConferenceHistoryService,
  ) {}

  hello(message: HelloEventDto) {
    console.log("Received message in service:", message.message)
    // * Call Prisma here
    // await this.prisma.userEvent.create({
    //   data: {
    //     userId: message.userId,
    //     type: "USER_CREATED",
    //     payload: message,
    //   },
    // })
  }

  async transcript(message: TranscriptEventDto) {
    await this.conferenceHistoryService.saveTranscriptEntry({
      roomId: message.room_id,
      text: message.text,
      source: "voice",
      speakerId: message.participant_id,
      speakerName: message.participant_identity,
      occurredAt: message.timestamp,
      metadata: {
        type: message.type,
        roomName: message.room_name,
        sequence: message.sequence,
      },
    })
    this.transcriptGateway.broadcastTranscript(message)
  }

  async chatAiResponse(message: ChatMessageEventDto) {
    await this.conferenceHistoryService.saveChatMessage({
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderType: message.senderType,
      text: message.text,
      createdAt: message.createdAt,
    })
    this.transcriptGateway.broadcastChatMessage(message)
  }

  async summary(message: SummaryEventDto) {
    await this.conferenceHistoryService.saveSummaryEntry({
      roomId: message.room_id,
      text: message.text,
      createdAt: message.timestamp,
      metadata: {
        type: message.type,
      },
    })
    this.transcriptGateway.broadcastSummary(message)
  }
}
