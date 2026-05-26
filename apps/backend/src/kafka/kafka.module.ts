import { Module } from "@nestjs/common"
import { ClientsModule, Transport } from "@nestjs/microservices"
// import { kafkaClientOptions } from "./kafka.options"
import { KafkaProducerService } from "./kafka-producer.service"
import { ConfigService } from "@nestjs/config"
import { KafkaConsumerController } from "./kafka-consumer.controller"
import { KafkaConsumerService } from "./kafka-consumer.service"
import { KafkaLoggingInterceptor } from "./kafka-logging.interceptor"
import { KafkaExceptionFilter } from "./kafka-exception.filter"
import { TranscriptGateway } from "./transcript.gateway"
import { ConferenceHistoryModule } from "../conference-history/conference-history.module"

@Module({
  // Register kafka producer
  imports: [
    ConferenceHistoryModule,
    ClientsModule.registerAsync([
      {
        name: "KAFKA_SERVICE",
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: config.getOrThrow("BACKEND_KAFKA_CLIENT_ID"),
              brokers: [
                `${config.getOrThrow("BACKEND_KAFKA_HOST")}:${config.getOrThrow("KAFKA_PORT")}`,
              ],
            },
            // We don't need a consumer here for request-response kafka.send
            producerOnlyMode: true,
          },
        }),
      },
    ]),
  ],
  // Register kafka business logic services
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaLoggingInterceptor,
    KafkaExceptionFilter,
    TranscriptGateway,
  ],
  // Register kafka consumer controller
  controllers: [KafkaConsumerController],
  // Register kafka producer service
  exports: [KafkaProducerService],
})
export class KafkaModule {}
