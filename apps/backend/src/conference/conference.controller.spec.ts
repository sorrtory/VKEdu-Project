import { Test, TestingModule } from "@nestjs/testing"
import { BadRequestException } from "@nestjs/common"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"

describe("ConferenceController", () => {
  let controller: ConferenceController
  const mockConferenceService = {
    createConference: jest.fn(),
    generateToken: jest.fn(),
    onMicro: jest.fn(),
    onCam: jest.fn(),
    offMicro: jest.fn(),
    offCam: jest.fn(),
    uploadBoardCrop: jest.fn(),
    requestSummary: jest.fn(),
    getSummaryTickerStatus: jest.fn(),
    updateSummaryTicker: jest.fn(),
    listConferences: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceController],
      providers: [
        { provide: ConferenceService, useValue: mockConferenceService },
      ],
    }).compile()

    controller = module.get<ConferenceController>(ConferenceController)
    jest.clearAllMocks()
  })

  it("uploadBoardCrop calls the service with file and metadata", async () => {
    const file = {
      originalname: "board.png",
      mimetype: "image/png",
      size: 4,
      buffer: Buffer.from("test"),
    } as Express.Multer.File

    mockConferenceService.uploadBoardCrop.mockResolvedValue({
      success: true,
      message: "Board snapshot sent to Kafka",
    })

    const result = await controller.uploadBoardCrop(
      "room-1",
      { participantIdentity: "creator-1", participantName: "Alice" },
      file,
    )

    expect(mockConferenceService.uploadBoardCrop).toHaveBeenCalledTimes(1)
    expect(mockConferenceService.uploadBoardCrop).toHaveBeenCalledWith(
      "room-1",
      file,
      "creator-1",
      "Alice",
    )
    expect(result).toEqual({
      success: true,
      message: "Board snapshot sent to Kafka",
    })
  })

  it("uploadBoardCrop rejects missing file", async () => {
    await expect(
      controller.uploadBoardCrop("room-1", {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("requestSummary delegates to service", async () => {
    mockConferenceService.requestSummary.mockResolvedValue({
      success: true,
      requested: true,
    })

    await expect(controller.requestSummary("room-1")).resolves.toEqual({
      success: true,
      requested: true,
    })
    expect(mockConferenceService.requestSummary).toHaveBeenCalledWith("room-1")
  })

  it("listConferences returns only authenticated user conferences", async () => {
    mockConferenceService.listConferences.mockResolvedValue([{ id: "room-1" }])

    await expect(
      controller.listConferences({
        user: {
          userId: "user-1",
          email: "alice@example.com",
          nickname: "Alice",
        },
      } as never),
    ).resolves.toEqual({
      success: true,
      items: [{ id: "room-1" }],
    })
    expect(mockConferenceService.listConferences).toHaveBeenCalledWith("user-1")
  })

  it("listConferences returns empty list for guests", async () => {
    await expect(controller.listConferences({} as never)).resolves.toEqual({
      success: true,
      items: [],
    })
    expect(mockConferenceService.listConferences).not.toHaveBeenCalled()
  })

  it("generateToken uses authenticated user identity when present", async () => {
    mockConferenceService.generateToken.mockResolvedValue({
      token: "token",
      creatorId: "user-1",
    })

    await expect(
      controller.generateToken(
        {
          user: {
            userId: "user-1",
            email: "alice@example.com",
            nickname: "Alice",
          },
        } as never,
        {
          conferenceName: "room-1",
          participantName: "Ignored",
          participantIdentity: "guest:fake",
        },
      ),
    ).resolves.toEqual({ token: "token", creatorId: "user-1" })
    expect(mockConferenceService.generateToken).toHaveBeenCalledWith(
      "room-1",
      "user-1",
      "Alice",
      true,
      "user-1",
    )
  })

  it("updateSummaryTicker starts ticker with interval", async () => {
    mockConferenceService.updateSummaryTicker.mockResolvedValue({
      success: true,
      active: true,
      intervalSeconds: 60,
    })

    await expect(
      controller.updateSummaryTicker("room-1", {
        action: "start",
        intervalSeconds: 60,
      }),
    ).resolves.toEqual({
      success: true,
      active: true,
      intervalSeconds: 60,
    })
    expect(mockConferenceService.updateSummaryTicker).toHaveBeenCalledWith(
      "room-1",
      "start",
      60,
    )
  })

  it("updateSummaryTicker rejects invalid action", async () => {
    await expect(
      controller.updateSummaryTicker("room-1", {
        action: "pause" as "start",
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
