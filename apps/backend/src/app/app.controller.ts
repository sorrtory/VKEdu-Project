import { Controller, Get } from "@nestjs/common"
import { KafkaProducerService } from "../kafka/kafka-producer.service"
import { HelloEventDto } from "../kafka/dto/hello-event.dto"

@Controller()
export class AppController {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  @Get()
  getHealth() {
    return { status: "ok" }
  }

  @Get("emit")
  emitTestEvent() {
    const testDTO = new HelloEventDto()
    testDTO.message = "Test message from /emit endpoint"
    this.kafkaProducer.emitHelloEvent(testDTO)
    return { message: "Event emitted" }
  }
}
