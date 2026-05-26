import { Module } from "@nestjs/common"
import { ConferenceController } from "./conference.controller"
import { ConferenceService } from "./conference.service"
import { KafkaModule } from "../kafka/kafka.module"
import { StorageModule } from "../storage/storage.module"
import { ConferenceHistoryModule } from "../conference-history/conference-history.module"

@Module({
  imports: [KafkaModule, StorageModule, ConferenceHistoryModule],
  controllers: [ConferenceController],
  providers: [ConferenceService],
})
export class ConferenceModule {}
