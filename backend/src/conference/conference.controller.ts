import { Body, Controller, Post } from "@nestjs/common";
import { ConferenceService } from "./conference.service";

@Controller('conference')
export class ConferenceController {
    constructor(private ConferenceService: ConferenceService) {}

  @Post('token')
  async getToken(@Body() body: { roomName: string; participantName: string }) {
    const token = await this.ConferenceService.generateToken(
      body.roomName,
      body.participantName
    );
    return { token };
  }

  @Post('room')
  async createRoom(@Body() body: { roomName: string }) {
    await this.ConferenceService.createRoom(body.roomName);
    return { success: true };
  }
}