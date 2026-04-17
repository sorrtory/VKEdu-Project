import { Body, Controller, Post } from "@nestjs/common"
import { ConferenceService } from "./conference.service"
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { CreateConferenceDto } from "./dto/create-conference.dto"
import { CreateRoomDto } from "./dto/create-room.dto"
import { GenerateTokenDto } from "./dto/generate-token.dto"
import { TrackControlDto } from "./dto/track-control.dto"

@Controller("conference")
@ApiTags("Conference")
export class ConferenceController {
  constructor(private ConferenceService: ConferenceService) {}

  @Post("token")
  @ApiOperation({ summary: "Generate LiveKit token for a participant" })
  @ApiResponse({
    status: 200,
    description: "Returns a JWT token",
    schema: { example: { token: "..." } },
  })
  async getToken(@Body() body: GenerateTokenDto) {
    const token = await this.ConferenceService.generateToken(
      body.roomName,
      body.participantName,
    )
    return { token }
  }

  @Post("create")
  @ApiOperation({ summary: "Create a conference room using legacy MVP naming" })
  @ApiBody({ type: CreateConferenceDto })
  @ApiResponse({
    status: 200,
    description: "Conference created",
    schema: { example: { success: true } },
  })
  async createConference(@Body() body: CreateConferenceDto) {
    await this.ConferenceService.createConference(body.conferenceName)
    return { success: true }
  }

  @Post("room")
  @ApiOperation({ summary: "Create a LiveKit room" })
  @ApiResponse({
    status: 200,
    description: "Room created",
    schema: { example: { success: true } },
  })
  async createRoom(@Body() body: CreateRoomDto) {
    await this.ConferenceService.createRoom(body.roomName)
    return { success: true }
  }

  @Post("on/micro")
  @ApiOperation({ summary: "Mute a participant microphone track" })
  @ApiBody({ type: TrackControlDto })
  @ApiResponse({
    status: 200,
    description: "Microphone track updated",
    schema: { example: { success: true } },
  })
  async onMicro(@Body() body: TrackControlDto) {
    await this.ConferenceService.onMicro(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("off/micro")
  @ApiOperation({ summary: "Unmute a participant microphone track" })
  @ApiBody({ type: TrackControlDto })
  @ApiResponse({
    status: 200,
    description: "Microphone track updated",
    schema: { example: { success: true } },
  })
  async offMicro(@Body() body: TrackControlDto) {
    await this.ConferenceService.offMicro(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("on/cam")
  @ApiOperation({ summary: "Mute a participant camera track" })
  @ApiBody({ type: TrackControlDto })
  @ApiResponse({
    status: 200,
    description: "Camera track updated",
    schema: { example: { success: true } },
  })
  async onCam(@Body() body: TrackControlDto) {
    await this.ConferenceService.onCam(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }

  @Post("off/cam")
  @ApiOperation({ summary: "Unmute a participant camera track" })
  @ApiBody({ type: TrackControlDto })
  @ApiResponse({
    status: 200,
    description: "Camera track updated",
    schema: { example: { success: true } },
  })
  async offCam(@Body() body: TrackControlDto) {
    await this.ConferenceService.offCam(
      body.conferenceName,
      body.callertName,
      body.targettName,
    )
    return { success: true }
  }
}
