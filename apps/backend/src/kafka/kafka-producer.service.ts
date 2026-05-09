import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ClientKafka } from "@nestjs/microservices"
import { HelloEventDto } from "./dto/hello-event.dto"

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
}
