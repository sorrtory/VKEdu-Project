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
import {
  ConferenceHistoryEventDto,
  TranscriptHistoryEventDto,
} from "./dto/conference-history-event.dto"

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

  @EventPattern("conference.chat.ai.response")
  chatAiResponseHandler(@Payload() message: ConferenceHistoryEventDto) {
    return this.kafkaConsumerService.recordChatAiResponse(message)
  }

  @EventPattern("conference.summary.response")
  summaryResponseHandler(@Payload() message: ConferenceHistoryEventDto) {
    return this.kafkaConsumerService.recordSummary(message)
  }

  @EventPattern("conference.transcript")
  transcriptHandler(@Payload() message: TranscriptHistoryEventDto) {
    return this.kafkaConsumerService.recordTranscript(message)
  }
}
