import { Body, Controller, Post } from "@nestjs/common";
import { ConferenceService } from "./conference.service.js";


@Controller('conference')
export class ConferenceController {
  constructor (private ConferenceService: ConferenceService) {}

  @Post('create')
  async createConference(@Body() body: {conferenceName: string}) {
    await this.ConferenceService.createConference(body.conferenceName);
    return {success: true};
  }

  @Post('token')
  async generateToken(@Body() body: {conferenceName: string, participantName: string}) {
    const result = await this.ConferenceService.generateToken(body.conferenceName, body.participantName, true);
    return result;
  }

  @Post('on/micro')
  async onMicro(@Body() body: {conferenceName: string, callertName: string, targettName: string}) {
    await this.ConferenceService.onMicro(body.conferenceName, body.callertName, body.targettName);
    return {success: true};
  }

  @Post('on/cam')
  async onCam(@Body() body: {conferenceName: string, callertName: string, targettName: string}) {
    await this.ConferenceService.onCam(body.conferenceName, body.callertName, body.targettName);
    return {success: true};
  }

    @Post('off/micro')
  async offMicro(@Body() body: {conferenceName: string, callertName: string, targettName: string}) {
    await this.ConferenceService.offMicro(body.conferenceName, body.callertName, body.targettName);
    return {success: true};
  }

  @Post('off/cam')
  async offCam(@Body() body: {conferenceName: string, callertName: string, targettName: string}) {
    await this.ConferenceService.offCam(body.conferenceName, body.callertName, body.targettName);
    return {success: true};
  }

  
}

