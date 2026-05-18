import { Module } from "@nestjs/common"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { KafkaModule } from "../kafka/kafka.module"
import { StorageModule } from "../storage/storage.module"

@Module({
  imports: [KafkaModule, StorageModule],
  controllers: [ConferenceController],
  providers: [ConferenceService],
})
export class ConferenceModule {}
