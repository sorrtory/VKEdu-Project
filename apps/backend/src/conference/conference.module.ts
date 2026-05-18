import { Module } from "@nestjs/common"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { KafkaModule } from "../kafka/kafka.module"

@Module({
  imports: [KafkaModule],
  controllers: [ConferenceController],
  providers: [ConferenceService],
})
export class ConferenceModule {}
