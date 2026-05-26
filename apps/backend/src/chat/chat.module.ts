import { Module } from "@nestjs/common"
import { KafkaModule } from "../kafka/kafka.module"
import { ChatGateway } from "./chat.gateway"
import { ConferenceHistoryModule } from "../conference-history/conference-history.module"

@Module({
  imports: [KafkaModule, ConferenceHistoryModule],
  providers: [ChatGateway],
})
export class ChatModule {}
