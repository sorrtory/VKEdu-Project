import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ConferenceService } from "./conference.service"
import { BoardCropMetadataDto } from "./dto/board-crop.dto"
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard"
import type { RequestWithOptionalUser } from "../auth/types/request-with-optional-user.type"

@Controller("conference")
export class ConferenceController {
  constructor(private ConferenceService: ConferenceService) {}

  @Post("create")
  async createConference(@Body() body: { conferenceName: string }) {
    await this.ConferenceService.createConference(body.conferenceName)
    return { success: true }
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async listConferences(@Req() req: RequestWithOptionalUser) {
    return {
      success: true,
      items: req.user
        ? await this.ConferenceService.listConferences(req.user.userId)
        : [],
    }
  }

  @Post(":conferenceName/boardcrop")
  @UseInterceptors(FileInterceptor("file"))
  async uploadBoardCrop(
    @Param("conferenceName") conferenceName: string,
    @Body() metadata: BoardCropMetadataDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("file is required")
    }

    return await this.ConferenceService.uploadBoardCrop(
      conferenceName,
      file,
      metadata.participantIdentity,
      metadata.participantName,
    )
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

    const storedFile = await this.ConferenceService.uploadFile(
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

    const result = await this.ConferenceService.createDownloadUrl(
      conferenceName,
      file,
    )

    return { success: true, ...result }
  }

  @Get(":conferenceName/chat")
  async getChatHistory(
    @Param("conferenceName") conferenceName: string,
    @Query("type") type = "json",
  ) {
    this.assertJsonHistoryType(type)
    return {
      success: true,
      items: await this.ConferenceService.getChatHistory(conferenceName),
    }
  }

  @Get(":conferenceName/transcript")
  async getTranscriptHistory(
    @Param("conferenceName") conferenceName: string,
    @Query("type") type = "json",
  ) {
    this.assertJsonHistoryType(type)
    return {
      success: true,
      items: await this.ConferenceService.getTranscriptHistory(conferenceName),
    }
  }

  @Get(":conferenceName/trascript")
  async getTranscriptHistoryLegacy(
    @Param("conferenceName") conferenceName: string,
    @Query("type") type = "json",
  ) {
    return this.getTranscriptHistory(conferenceName, type)
  }

  @Get(":conferenceName/summary")
  async getSummaryHistory(
    @Param("conferenceName") conferenceName: string,
    @Query("type") type = "json",
  ) {
    this.assertJsonHistoryType(type)
    return {
      success: true,
      items: await this.ConferenceService.getSummaryHistory(conferenceName),
    }
  }

  @Post(":conferenceName/summary/request")
  async requestSummary(@Param("conferenceName") conferenceName: string) {
    return await this.ConferenceService.requestSummary(conferenceName)
  }

  @Get(":conferenceName/ticker")
  getSummaryTickerStatus(@Param("conferenceName") conferenceName: string) {
    return this.ConferenceService.getSummaryTickerStatus(conferenceName)
  }

  @Post(":conferenceName/ticker")
  async updateSummaryTicker(
    @Param("conferenceName") conferenceName: string,
    @Body()
    body: {
      action?: "start" | "stop"
      intervalSeconds?: number
    },
  ) {
    if (body.action !== "start" && body.action !== "stop") {
      throw new BadRequestException("action must be start or stop")
    }

    return await this.ConferenceService.updateSummaryTicker(
      conferenceName,
      body.action,
      body.intervalSeconds,
    )
  }

  @Post("token")
  @UseGuards(OptionalJwtAuthGuard)
  async generateToken(
    @Req() req: RequestWithOptionalUser,
    @Body()
    body: {
      conferenceName: string
      participantName: string
      participantIdentity?: string
    },
  ) {
    const user = req.user ?? null
    const participantIdentity =
      user?.userId ?? body.participantIdentity?.trim() ?? body.participantName
    const participantName = user?.nickname ?? body.participantName

    const result = await this.ConferenceService.generateToken(
      body.conferenceName,
      participantIdentity,
      participantName,
      true,
      user?.userId,
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
    await this.ConferenceService.onMicro(
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
    await this.ConferenceService.onCam(
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
    await this.ConferenceService.offMicro(
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
    await this.ConferenceService.offCam(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  private assertJsonHistoryType(type: string) {
    if (type !== "json") {
      throw new BadRequestException("Only type=json is supported in the MVP")
    }
  }
}
