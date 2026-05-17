import { Test, TestingModule } from "@nestjs/testing"
import { AppController } from "./app.controller"
import { KafkaProducerService } from "../kafka/kafka-producer.service"

describe("AppController", () => {
  let controller: AppController
  const mockProducer = { emitHelloEvent: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: KafkaProducerService, useValue: mockProducer }],
    }).compile()

    controller = module.get<AppController>(AppController)
    mockProducer.emitHelloEvent.mockClear()
  })

  it("getHealth returns ok", () => {
    expect(controller.getHealth()).toEqual({ status: "ok" })
  })

  it("emitTestEvent calls producer and returns message", () => {
    const res = controller.emitTestEvent()

    expect(mockProducer.emitHelloEvent).toHaveBeenCalledTimes(1)
    expect(mockProducer.emitHelloEvent).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test message from /emit endpoint" }),
    )
    expect(res).toEqual({ message: "Event emitted" })
  })
})
