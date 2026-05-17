import { Controller, Get } from "@nestjs/common"
import { ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger"
import { KafkaProducerService } from "../kafka/kafka-producer.service"
import { HelloEventDto } from "../kafka/dto/hello-event.dto"

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  getHealth() {
    return { status: "ok" }
  }

  @Get("emit")
  @ApiOperation({ summary: "Emit a test Kafka event" })
  @ApiOkResponse({ schema: { example: { message: "Event emitted" } } })
  emitTestEvent() {
    const testDTO = new HelloEventDto()
    testDTO.message = "Test message from /emit endpoint"
    this.kafkaProducer.emitHelloEvent(testDTO)
    return { message: "Event emitted" }
  }
}
