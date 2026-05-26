import { BadRequestException, Injectable } from "@nestjs/common"
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

@Injectable()
export class ConferenceService {
  private readonly roomService: RoomServiceClient
  private readonly API_KEY: string
  private readonly API_SECRET: string
  private readonly LK_HOST: string
  private readonly conferenceCreators = new Map<string, string>()

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: S3StorageService,
    private readonly kafkaProducerService: KafkaProducerService,
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
  ): Promise<{ token: string; creatorId: string }> {
    console.log(
      `[generateToken] Processing request for room: ${conferenceName}, participant: ${participantIdentity}`,
    )

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
    this.kafkaProducerService.emitBoardCropEvent({
      conferenceName,
      roomId: conferenceName,
      participantIdentity,
      participantName,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      imageBase64: file.buffer.toString("base64"),
    })

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
