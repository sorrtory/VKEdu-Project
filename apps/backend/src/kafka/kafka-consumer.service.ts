import { Injectable } from "@nestjs/common"
import { ConferenceHistoryService } from "../conference/conference-history.service"
import {
  ConferenceHistoryEventDto,
  TranscriptHistoryEventDto,
} from "./dto/conference-history-event.dto"
import { HelloEventDto } from "./dto/hello-event.dto"

@Injectable()
export class KafkaConsumerService {
  constructor(
    private readonly conferenceHistoryService: ConferenceHistoryService,
  ) {}

  hello(message: HelloEventDto) {
    console.log("Received message in service:", message.message)
  }

  async recordChatAiResponse(message: ConferenceHistoryEventDto) {
    await this.conferenceHistoryService.recordChatMessage({
      roomName: this.getRoomName(message),
      senderId: message.senderId,
      senderName: message.senderName ?? "AI",
      senderType: "ai",
      text: message.text,
      createdAt: message.createdAt,
    })
  }

  async recordSummary(message: ConferenceHistoryEventDto) {
    await this.conferenceHistoryService.recordSummary({
      roomName: this.getRoomName(message),
      text: message.text,
      createdAt: message.createdAt,
    })
  }

  async recordTranscript(message: TranscriptHistoryEventDto) {
    await this.conferenceHistoryService.recordTranscript({
      roomName: this.getRoomName(message),
      source: message.source,
      speakerId: message.speakerId ?? message.senderId,
      speakerName: message.speakerName ?? message.senderName,
      text: message.text,
      occurredAt: message.occurredAt ?? message.createdAt,
    })
  }

  private getRoomName(message: ConferenceHistoryEventDto) {
    const roomName = message.conferenceName ?? message.roomId
    if (!roomName) {
      throw new Error("conferenceName or roomId is required")
    }

    return roomName
  }
}
