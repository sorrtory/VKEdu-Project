import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { HelloEventDto } from "./dto/hello-event.dto"
import { TranscriptEventDto } from "./dto/transcript-event.dto"
import { ChatMessageEventDto } from "./dto/chat-message-event.dto"
import { SummaryEventDto } from "./dto/summary-event.dto"
import { TranscriptGateway } from "./transcript.gateway"

@Injectable()
export class KafkaConsumerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptGateway: TranscriptGateway,
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

  transcript(message: TranscriptEventDto) {
    this.transcriptGateway.broadcastTranscript(message)
  }

  chatAiResponse(message: ChatMessageEventDto) {
    this.transcriptGateway.broadcastChatMessage(message)
  }

  summary(message: SummaryEventDto) {
    this.transcriptGateway.broadcastSummary(message)
  }
}
