import { Test, TestingModule } from "@nestjs/testing"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { KafkaProducerService } from "../kafka/kafka-producer.service"

describe("ConferenceController - Board Snapshot", () => {
  let controller: ConferenceController
  let emitBoardSnapshot: jest.MockedFunction<
    KafkaProducerService["emitBoardSnapshot"]
  >

  beforeEach(async () => {
    emitBoardSnapshot = jest.fn()
    const mockKafkaProducerService = {
      emitBoardSnapshot,
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceController],
      providers: [
        {
          provide: ConferenceService,
          useValue: {},
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducerService,
        },
      ],
    }).compile()

    controller = module.get<ConferenceController>(ConferenceController)
  })

  it("should submit board snapshot and emit Kafka event", () => {
    const testDto = {
      conferenceId: "test-conference-123",
      imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    }

    const result = controller.submitBoardSnapshot(testDto)

    expect(result.success).toBe(true)
    expect(result.capturedAt).toBeDefined()
    expect(emitBoardSnapshot).toHaveBeenCalledTimes(1)
    const [event] = emitBoardSnapshot.mock.calls[0]
    expect(event.conferenceId).toBe(testDto.conferenceId)
    expect(event.imageBase64).toBe(testDto.imageBase64)
    expect(typeof event.capturedAt).toBe("string")
  })

  it("should set capturedAt to current ISO timestamp", () => {
    const testDto = {
      conferenceId: "test-conference-123",
      imageBase64: "base64data",
    }

    const before = new Date()
    const result = controller.submitBoardSnapshot(testDto)
    const after = new Date()

    const capturedTime = new Date(result.capturedAt)
    expect(capturedTime.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(capturedTime.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})
