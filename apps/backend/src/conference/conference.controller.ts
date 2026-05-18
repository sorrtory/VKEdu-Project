import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ConferenceService } from "./conference.service"
import { KafkaProducerService } from "../kafka/kafka-producer.service"
import { SubmitBoardSnapshotDto } from "./dto/submit-board-snapshot.dto"
import { BoardSnapshotEventDto } from "../kafka/dto/board-snapshot.dto"

@Controller("conference")
export class ConferenceController {
  constructor(
    private conferenceService: ConferenceService,
    private kafkaProducerService: KafkaProducerService,
  ) {}

  @Post("create")
  async createConference(@Body() body: { conferenceName: string }) {
    await this.conferenceService.createConference(body.conferenceName)
    return { success: true }
  }

  @Post(":conferenceName/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Param("conferenceName") conferenceName: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("file is required")
    }

    const storedFile = await this.conferenceService.uploadFile(
      conferenceName,
      file,
    )

    return { success: true, file: storedFile }
  }

  @Get(":conferenceName/download")
  async createDownloadUrl(
    @Param("conferenceName") conferenceName: string,
    @Query("file") file?: string,
  ) {
    if (!file) {
      throw new BadRequestException("file query parameter is required")
    }

    const result = await this.conferenceService.createDownloadUrl(
      conferenceName,
      file,
    )

    return { success: true, ...result }
  }

  @Post("token")
  async generateToken(
    @Body()
    body: {
      conferenceName: string
      participantName: string
      participantIdentity?: string
    },
  ) {
    const participantIdentity =
      body.participantIdentity?.trim() || body.participantName

    const result = await this.conferenceService.generateToken(
      body.conferenceName,
      participantIdentity,
      body.participantName,
      true,
    )
    return result
  }

  @Post("on/micro")
  async onMicro(
    @Body()
    body: {
      conferenceName: string
      callertName: string
      targettName: string
    },
  ) {
    await this.conferenceService.onMicro(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("on/cam")
  async onCam(
    @Body()
    body: {
      conferenceName: string
      callertName: string
      targettName: string
    },
  ) {
    await this.conferenceService.onCam(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("off/micro")
  async offMicro(
    @Body()
    body: {
      conferenceName: string
      callertName: string
      targettName: string
    },
  ) {
    await this.conferenceService.offMicro(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("off/cam")
  async offCam(
    @Body()
    body: {
      conferenceName: string
      callertName: string
      targettName: string
    },
  ) {
    await this.conferenceService.offCam(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("board/snapshot")
  submitBoardSnapshot(@Body() dto: SubmitBoardSnapshotDto) {
    const boardEvent: BoardSnapshotEventDto = {
      conferenceId: dto.conferenceId,
      imageBase64: dto.imageBase64,
      capturedAt: new Date().toISOString(),
    }
    this.kafkaProducerService.emitBoardSnapshot(boardEvent)
    return { success: true, capturedAt: boardEvent.capturedAt }
  }
}
