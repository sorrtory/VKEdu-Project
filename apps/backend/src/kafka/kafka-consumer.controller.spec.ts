import { Test, TestingModule } from "@nestjs/testing"
import { KafkaConsumerController } from "./kafka-consumer.controller"
import { KafkaConsumerService } from "./kafka-consumer.service"

describe("KafkaConsumerController", () => {
  let controller: KafkaConsumerController
  const mockConsumerService = {
    hello: jest.fn(),
    transcript: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KafkaConsumerController],
      providers: [{ provide: KafkaConsumerService, useValue: mockConsumerService }],
    }).compile()

    controller = module.get<KafkaConsumerController>(KafkaConsumerController)
    jest.clearAllMocks()
  })

  it("transcriptHandler delegates conference.transcript events", () => {
    const message = {
      timestamp: "2026-05-24T10:15:30.000Z",
      type: "speech",
      room_id: "room-1",
      room_name: "room-1",
      participant_id: "participant-1",
      participant_identity: "alice",
      sequence: 1,
      text: "Hello transcript",
    }

    controller.transcriptHandler(message as never)

    expect(mockConsumerService.transcript).toHaveBeenCalledTimes(1)
    expect(mockConsumerService.transcript).toHaveBeenCalledWith(message)
  })
})