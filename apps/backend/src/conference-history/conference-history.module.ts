import { Module } from "@nestjs/common"
import { ConferenceHistoryService } from "./conference-history.service"

@Module({
  providers: [ConferenceHistoryService],
  exports: [ConferenceHistoryService],
})
export class ConferenceHistoryModule {}
