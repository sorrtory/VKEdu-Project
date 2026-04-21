import { Module } from '@nestjs/common';
import { ConferenceController } from './conference.controller.js';
import { ConferenceService } from './conference.service.js';


@Module({
    imports: [],
    controllers: [ConferenceController],
    providers: [ConferenceService],
})
export class ConferenceModule {}
