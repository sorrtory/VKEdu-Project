import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk"
import { KafkaProducerService } from "../kafka/kafka-producer.service"
import { S3StorageService, type StoredObject } from "../storage/storage.service"
import { ConferenceHistoryService } from "../conference-history/conference-history.service"
import { ConferenceRole } from "../generated/prisma/enums"

@Injectable()
export class ConferenceService implements OnModuleDestroy {
  private static readonly MIN_SUMMARY_TICKER_INTERVAL_SECONDS = 15
  private static readonly MAX_SUMMARY_TICKER_INTERVAL_SECONDS = 3600
  private static readonly LIVEKIT_AGENT_PARTICIPANT_KIND = 4

  private readonly roomService: RoomServiceClient
  private readonly API_KEY: string
  private readonly API_SECRET: string
  private readonly LK_HOST: string
  private readonly conferenceCreators = new Map<string, string>()
  private readonly summaryTickers = new Map<
    string,
    { timer: NodeJS.Timeout; intervalSeconds: number; lastRequestedAt?: string }
  >()

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: S3StorageService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly conferenceHistoryService: ConferenceHistoryService,
  ) {
    // These environment variables are required — getOrThrow will throw at startup if missing
    this.LK_HOST = this.configService.getOrThrow<string>("BACKEND_LIVEKIT_HOST")
    this.API_KEY = this.configService.getOrThrow<string>("LIVEKIT_API_KEY")
    this.API_SECRET =
      this.configService.getOrThrow<string>("LIVEKIT_API_SECRET")

    this.roomService = new RoomServiceClient(
      this.LK_HOST,
      this.API_KEY,
      this.API_SECRET,
    )
  }

  onModuleDestroy() {
    for (const ticker of this.summaryTickers.values()) {
      clearInterval(ticker.timer)
    }
    this.summaryTickers.clear()
  }

  // 🔍 Вспомогательный метод: проверка существования комнаты
  private async roomExists(roomName: string): Promise<boolean> {
    try {
      // Передаём имя в массиве — вернёт только эту комнату, если она есть
      const rooms = await this.roomService.listRooms([roomName])
      return rooms.length > 0
    } catch (err: unknown) {
      const error = err as { status?: number }
      if (error.status === 401 || error.status === 403) {
        throw err // критичная ошибка авторизации
      }
      console.log(`[roomExists] here was some warn`)
      return false
    }
  }

  async generateToken(
    conferenceName: string,
    participantIdentity: string,
    participantName: string,
    isAdmin: boolean,
    userId?: string,
  ): Promise<{ token: string; creatorId: string }> {
    console.log(
      `[generateToken] Processing request for room: ${conferenceName}, participant: ${participantIdentity}`,
    )
    await this.conferenceHistoryService.ensureConference(conferenceName)

    // 1. Проверяем, существует ли комната (SDK v2.x: listRooms принимает массив имён)
    let roomExists = false
    try {
      const rooms = await this.roomService.listRooms([conferenceName])
      roomExists = rooms.length > 0
      console.log(
        `[generateToken] Room ${conferenceName} exists: ${roomExists}`,
      )
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string }
      if (error.status === 401 || error.status === 403) {
        console.error(
          `[generateToken] Auth error checking room:`,
          error.message,
        )
        throw err
      }
      console.warn(
        `[generateToken] Could not check room existence:`,
        error.message,
      )
      // При ошибке сети считаем, что комнаты нет — агент диспатчится при создании
      roomExists = false
    }

    // 2. Создаём AccessToken
    const token = new AccessToken(this.API_KEY, this.API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      // ttl: 3600, // опционально: время жизни токена в секундах
    })

    // 3. Назначаем создателя комнаты один раз на первую выдачу токена
    if (!this.conferenceCreators.has(conferenceName)) {
      this.conferenceCreators.set(conferenceName, participantIdentity)
    }
    const creatorId =
      this.conferenceCreators.get(conferenceName) ?? participantIdentity
    if (userId) {
      await this.conferenceHistoryService.ensureConferenceMembership(
        conferenceName,
        userId,
        creatorId === participantIdentity
          ? ConferenceRole.host
          : ConferenceRole.participant,
      )
    }

    // 4. Если комната создаётся впервые — добавляем конфигурацию с агентом
    if (!roomExists) {
      console.log(
        `[generateToken] Setting roomConfig with agent: default-agent`,
      )
      const roomConfig = new RoomConfiguration({
        name: conferenceName,
      })
      roomConfig.agents = [
        new RoomAgentDispatch({
          agentName: "default-agent",
          metadata: JSON.stringify({
            initiator: participantIdentity,
            createdAt: new Date().toISOString(),
            conference: conferenceName,
          }),
        }),
      ]
      token.roomConfig = roomConfig
    }

    // 5. Добавляем права доступа (гранты)
    token.addGrant({
      roomJoin: true,
      room: conferenceName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isAdmin,
      // canUpdateOwnMetadata: true, // опционально
    })

    // 6. Генерируем и возвращаем JWT + identity создателя комнаты
    const jwt = await token.toJwt()
    console.log(
      `[generateToken] Token generated successfully for ${participantIdentity}`,
    )

    console.log(
      "[generateToken] roomConfig:",
      JSON.stringify(token.roomConfig, null, 2),
    )

    return { token: jwt, creatorId }
  }

  // Опционально: явное создание комнаты без участника (агент НЕ прикрепится)
  async createConference(conferenceName: string) {
    await this.conferenceHistoryService.ensureConference(conferenceName)
    await this.roomService.createRoom({ name: conferenceName })
  }

  async uploadFile(
    conferenceName: string,
    file: Express.Multer.File,
  ): Promise<
    StoredObject & { downloadUrl: string; downloadTtlSeconds: number }
  > {
    const storedFile = await this.storageService.uploadConferenceFile({
      conferenceName,
      file,
    })
    const downloadUrl = await this.storageService.createDownloadUrl(
      storedFile.key,
    )

    this.kafkaProducerService.emitFileContextEvent({
      conferenceName,
      filename: storedFile.filename,
      bucket: storedFile.bucket,
      objectKey: storedFile.key,
      contentType: storedFile.contentType,
      size: storedFile.size,
    })
    await this.conferenceHistoryService.saveAttachment({
      roomId: conferenceName,
      filename: storedFile.filename,
      bucket: storedFile.bucket,
      objectKey: storedFile.key,
      contentType: storedFile.contentType,
      size: storedFile.size,
    })

    return {
      ...storedFile,
      downloadUrl,
      downloadTtlSeconds: this.storageService.getDownloadTtlSeconds(),
    }
  }

  async uploadBoardCrop(
    conferenceName: string,
    file: Express.Multer.File,
    participantIdentity?: string,
    participantName?: string,
  ) {
    await Promise.resolve(
      this.kafkaProducerService.emitBoardCropEvent({
        conferenceName,
        roomId: conferenceName,
        participantIdentity,
        participantName,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        imageBase64: file.buffer.toString("base64"),
      }),
    )

    return {
      success: true,
      message: "Board snapshot sent to Kafka",
    }
  }

  async createDownloadUrl(conferenceName: string, file: string) {
    const safeConferenceName =
      conferenceName.trim().replace(/[^a-zA-Z0-9._-]/g, "_") || "file"
    const expectedPrefix = `conferences/${safeConferenceName}/`
    if (!file.startsWith(expectedPrefix)) {
      throw new BadRequestException("file does not belong to this conference")
    }

    return {
      downloadUrl: await this.storageService.createDownloadUrl(file),
      downloadTtlSeconds: this.storageService.getDownloadTtlSeconds(),
    }
  }

  async getChatHistory(conferenceName: string) {
    return this.conferenceHistoryService.getChatHistory(conferenceName)
  }

  async getTranscriptHistory(conferenceName: string) {
    return this.conferenceHistoryService.getTranscriptHistory(conferenceName)
  }

  async getSummaryHistory(conferenceName: string) {
    return this.conferenceHistoryService.getSummaryHistory(conferenceName)
  }

  async listConferences(userId: string) {
    return this.conferenceHistoryService.listConferences(userId)
  }

  async requestSummary(conferenceName: string) {
    await this.conferenceHistoryService.ensureConference(conferenceName)

    const activeParticipants =
      await this.getActiveHumanParticipantCount(conferenceName)
    if (activeParticipants === 0) {
      return {
        success: true,
        requested: false,
        reason: "empty-room",
        activeParticipants,
      }
    }

    const createdAt = new Date().toISOString()
    this.kafkaProducerService.emitSummaryRequestEvent({
      type: "summary_request",
      roomId: conferenceName,
      room_id: conferenceName,
      createdAt,
    })

    const ticker = this.summaryTickers.get(conferenceName)
    if (ticker) {
      ticker.lastRequestedAt = createdAt
    }

    return {
      success: true,
      requested: true,
      activeParticipants,
      createdAt,
    }
  }

  async updateSummaryTicker(
    conferenceName: string,
    action: "start" | "stop",
    intervalSeconds?: number,
  ) {
    if (action === "stop") {
      this.stopSummaryTicker(conferenceName)
      return this.getSummaryTickerStatus(conferenceName)
    }

    const normalizedIntervalSeconds =
      this.normalizeSummaryTickerInterval(intervalSeconds)
    this.stopSummaryTicker(conferenceName)

    const timer = setInterval(() => {
      void this.requestSummary(conferenceName).catch((error: unknown) => {
        console.error(
          `[summaryTicker] failed to request summary for ${conferenceName}`,
          error,
        )
      })
    }, normalizedIntervalSeconds * 1000)

    this.summaryTickers.set(conferenceName, {
      timer,
      intervalSeconds: normalizedIntervalSeconds,
    })

    const firstRequest = await this.requestSummary(conferenceName)
    return {
      ...this.getSummaryTickerStatus(conferenceName),
      firstRequest,
    }
  }

  getSummaryTickerStatus(conferenceName: string) {
    const ticker = this.summaryTickers.get(conferenceName)
    return {
      success: true,
      active: Boolean(ticker),
      intervalSeconds: ticker?.intervalSeconds ?? null,
      lastRequestedAt: ticker?.lastRequestedAt ?? null,
    }
  }

  private stopSummaryTicker(conferenceName: string) {
    const ticker = this.summaryTickers.get(conferenceName)
    if (!ticker) {
      return
    }

    clearInterval(ticker.timer)
    this.summaryTickers.delete(conferenceName)
  }

  private normalizeSummaryTickerInterval(intervalSeconds?: number) {
    const fallbackIntervalSeconds = 60
    const value = Number(intervalSeconds ?? fallbackIntervalSeconds)
    if (!Number.isFinite(value)) {
      return fallbackIntervalSeconds
    }

    return Math.min(
      ConferenceService.MAX_SUMMARY_TICKER_INTERVAL_SECONDS,
      Math.max(
        ConferenceService.MIN_SUMMARY_TICKER_INTERVAL_SECONDS,
        Math.floor(value),
      ),
    )
  }

  private async getActiveHumanParticipantCount(conferenceName: string) {
    try {
      const agentName = this.configService.get<string>("LIVEKIT_AGENT_NAME")
      const participants =
        await this.roomService.listParticipants(conferenceName)
      return participants.filter(
        (participant) =>
          Number(participant.kind) !==
            ConferenceService.LIVEKIT_AGENT_PARTICIPANT_KIND &&
          (!agentName || participant.identity !== agentName),
      ).length
    } catch (error: unknown) {
      const livekitError = error as { status?: number }
      if (livekitError.status === 404) {
        return 0
      }
      throw error
    }
  }

  // Мутит или размучивает треки участникам. True - включить, false - выключить.
  async manageTrack(
    conferenceName: string,
    callerName: string,
    targetName: string,
    trackType: TrackSource,
    type: boolean,
  ) {
    const participant = await this.roomService.getParticipant(
      conferenceName,
      targetName,
    )
    for (const track of participant.tracks) {
      if (track.source === trackType) {
        await this.roomService.mutePublishedTrack(
          conferenceName,
          targetName,
          track.sid,
          type,
        )
      }
    }

    return { success: true }
  }

  async onMicro(
    conferenceName: string,
    callerName: string,
    targetName: string,
  ) {
    await this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.MICROPHONE,
      true,
    )
  }

  async offMicro(
    conferenceName: string,
    callerName: string,
    targetName: string,
  ) {
    await this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.MICROPHONE,
      false,
    )
  }

  async onCam(conferenceName: string, callerName: string, targetName: string) {
    await this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.CAMERA,
      true,
    )
  }

  async offCam(conferenceName: string, callerName: string, targetName: string) {
    await this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.CAMERA,
      false,
    )
  }
}
