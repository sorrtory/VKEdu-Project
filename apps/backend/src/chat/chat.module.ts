import { Module } from "@nestjs/common"
import { KafkaModule } from "../kafka/kafka.module"
import { ConferenceHistoryModule } from "../conference/conference-history.module"
import { ChatGateway } from "./chat.gateway"

@Module({
  imports: [KafkaModule, ConferenceHistoryModule],
  providers: [ChatGateway],
})
export class ChatModule {}
