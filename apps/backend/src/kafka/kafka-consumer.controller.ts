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
}
