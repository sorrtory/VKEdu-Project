import { Injectable } from "@nestjs/common"
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk"

@Injectable()
export class ConferenceService {
  private readonly roomService: RoomServiceClient
  private readonly apiKey: string
  private readonly apiSecret: string

  constructor() {
    const host =
      process.env.LIVEKIT_SERVER_URL ??
      process.env.LIVEKIT_HOST ??
      "http://livekit:7880"
    // TODO: remove this neuroshit
    const apiKey = process.env.LIVEKIT_API_KEY ?? "devkey"
    const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret"

    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit API credentials are not configured")
    }

    this.apiKey = apiKey
    this.apiSecret = apiSecret

    this.roomService = new RoomServiceClient(host, apiKey, apiSecret)
  }

  async createRoom(roomName: string) {
    await this.roomService.createRoom({
      name: roomName,
    })
  }

  async createConference(conferenceName: string) {
    await this.createRoom(conferenceName)
  }

  async generateToken(
    roomName: string,
    participantName: string,
    isAdmin = true,
  ): Promise<string> {
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
    })

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isAdmin,
    })

    return accessToken.toJwt()
  }

  async manageTrack(
    conferenceName: string,
    _callerName: string,
    targetName: string,
    trackSource: TrackSource,
    muted: boolean,
  ) {
    const participant = await this.roomService.getParticipant(
      conferenceName,
      targetName,
    )

    for (const track of participant.tracks) {
      if (track.source === trackSource) {
        await this.roomService.mutePublishedTrack(
          conferenceName,
          targetName,
          track.sid,
          muted,
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
    return this.manageTrack(
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
    return this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.MICROPHONE,
      false,
    )
  }

  async onCam(
    conferenceName: string,
    callerName: string,
    targetName: string,
  ) {
    return this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.CAMERA,
      true,
    )
  }

  async offCam(
    conferenceName: string,
    callerName: string,
    targetName: string,
  ) {
    return this.manageTrack(
      conferenceName,
      callerName,
      targetName,
      TrackSource.CAMERA,
      false,
    )
  }
}
