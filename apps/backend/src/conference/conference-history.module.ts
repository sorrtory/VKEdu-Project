import { Module } from "@nestjs/common"
import { PrismaModule } from "../prisma/prisma.module"
import { ConferenceHistoryService } from "./conference-history.service"

@Module({
  imports: [PrismaModule],
  providers: [ConferenceHistoryService],
  exports: [ConferenceHistoryService],
})
export class ConferenceHistoryModule {}
