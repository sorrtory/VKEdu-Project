import { Module } from "@nestjs/common"
import { KafkaModule } from "../kafka/kafka.module"
import { ChatGateway } from "./chat.gateway"

@Module({
  imports: [KafkaModule],
  providers: [ChatGateway],
})
export class ChatModule {}
