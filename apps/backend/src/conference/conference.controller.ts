import { Body, Controller, Post } from "@nestjs/common"
import { ConferenceService } from "./conference.service"
import { IsNotEmpty, IsString } from "class-validator"
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from "@nestjs/swagger"

class TokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomName!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  participantName!: string
}

class RoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomName!: string
}

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
  async getToken(@Body() body: TokenDto) {
    const token = await this.ConferenceService.generateToken(
      body.roomName,
      body.participantName,
    )
    return { token }
  }

  @Post("room")
  @ApiOperation({ summary: "Create a LiveKit room" })
  @ApiResponse({
    status: 200,
    description: "Room created",
    schema: { example: { success: true } },
  })
  async createRoom(@Body() body: RoomDto) {
    await this.ConferenceService.createRoom(body.roomName)
    return { success: true }
  }
}
