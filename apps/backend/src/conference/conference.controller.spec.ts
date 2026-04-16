import { Test, TestingModule } from "@nestjs/testing"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"

describe("ConferenceController", () => {
  let controller: ConferenceController
  let service: Partial<ConferenceService>

  beforeEach(async () => {
    service = {
      generateToken: jest.fn().mockResolvedValue("fake-token"),
      createRoom: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceController],
      providers: [
        {
          provide: ConferenceService,
          useValue: service,
        },
      ],
    }).compile()

    controller = module.get<ConferenceController>(ConferenceController)
  })

  it("generates a token", async () => {
    const res = await controller.getToken({
      roomName: "r",
      participantName: "p",
    })
    expect(res).toEqual({ token: "fake-token" })
    expect(service.generateToken).toHaveBeenCalledWith("r", "p")
  })

  it("creates a room", async () => {
    const res = await controller.createRoom({ roomName: "room1" })
    expect(res).toEqual({ success: true })
    expect(service.createRoom).toHaveBeenCalledWith("room1")
  })
})
