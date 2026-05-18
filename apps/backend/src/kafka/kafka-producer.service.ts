import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ClientKafka } from "@nestjs/microservices"
import { HelloEventDto } from "./dto/hello-event.dto"
import {
  FileContextEventDto,
  TextContextEventDto,
} from "./dto/context-event.dto"
import { ChatMessageEventDto } from "./dto/chat-message-event.dto"

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject("KAFKA_SERVICE")
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect()
  }

  async onModuleDestroy() {
    await this.kafkaClient.close()
  }

  emitHelloEvent(payload: HelloEventDto) {
    this.kafkaClient.emit("test", payload)
  }

  emitTextContextEvent(payload: TextContextEventDto) {
    console.error("Unimplemented: emitTextContextEvent", payload)
  }

  emitFileContextEvent(payload: FileContextEventDto) {
    this.kafkaClient.emit("conference.chat.file", payload)
  }

  emitChatEvent(payload: ChatMessageEventDto) {
    this.kafkaClient.emit("conference.chat", payload)
  }

  emitChatAiRequestEvent(payload: ChatMessageEventDto) {
    this.kafkaClient.emit("conference.chat.ai.request", payload)
  }
}
