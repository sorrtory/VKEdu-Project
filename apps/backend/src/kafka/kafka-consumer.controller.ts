import {
  Controller,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { EventPattern, Payload } from "@nestjs/microservices"
import { KafkaConsumerService } from "./kafka-consumer.service"
import { KafkaLoggingInterceptor } from "./kafka-logging.interceptor"
import { HelloEventDto } from "./dto/hello-event.dto"
import { KafkaExceptionFilter } from "./kafka-exception.filter"
import { TranscriptEventDto } from "./dto/transcript-event.dto"
import { ChatMessageEventDto } from "./dto/chat-message-event.dto"
import { SummaryEventDto } from "./dto/summary-event.dto"

@Controller()
@UseInterceptors(KafkaLoggingInterceptor)
@UseFilters(KafkaExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class KafkaConsumerController {
  constructor(private readonly kafkaConsumerService: KafkaConsumerService) {}

  @EventPattern("test")
  helloHandler(@Payload() message: HelloEventDto) {
    this.kafkaConsumerService.hello(message)
  }

  @EventPattern("conference.transcript")
  transcriptHandler(@Payload() message: TranscriptEventDto) {
    this.kafkaConsumerService.transcript(message)
  }

  @EventPattern("conference.chat.ai.response")
  chatAiResponseHandler(@Payload() message: ChatMessageEventDto) {
    this.kafkaConsumerService.chatAiResponse(message)
  }

  @EventPattern("conference.summary.response")
  summaryHandler(@Payload() message: SummaryEventDto) {
    this.kafkaConsumerService.summary(message)
  }
}
