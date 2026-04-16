import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { ConferenceModule } from "./conference/conference.module"
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"
import { PrismaModule } from "./prisma/prisma.module"

// Check if Kafka should be enabled based on environment variables
function isEnabled(value?: string): boolean {
  return value === "1" || value === "true"
}

// Connect to Kafka if BACKEND_KAFKA_ENABLED = true 
// 
const isProduction = process.env.NODE_ENV === "production"
const kafkaEnabled =
  process.env.BACKEND_KAFKA_ENABLED != null
    ? isEnabled(process.env.BACKEND_KAFKA_ENABLED)
    : isProduction &&
      typeof process.env.BACKEND_KAFKA_HOST === "string" &&
      process.env.BACKEND_KAFKA_HOST.length > 0

const kafkaBrokers = kafkaEnabled
  ? [`${process.env.BACKEND_KAFKA_HOST}:${process.env.KAFKA_PORT ?? "29092"}`]
  : []

const kafkaClients = kafkaEnabled
  ? [
      ClientsModule.register([
        {
          name: "KAFKA_SERVICE",
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: process.env.KAFKA_CLIENT_ID || "nestjs-kafka-client",
              brokers: kafkaBrokers,
            },
            producer: {
              allowAutoTopicCreation: true,
            },
            consumer: {
              groupId:
                process.env.KAFKA_CONSUMER_GROUP || "nestjs-producer-consumer",
            },
          },
        },
      ]),
    ]
  : []

if (isProduction && !kafkaEnabled) {
  console.warn(
    "Warning: Kafka is not enabled in production. Set BACKEND_KAFKA_ENABLED=true and configure BACKEND_KAFKA_HOST if Kafka is required.",
  )
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.{NODE_ENV} takes precedence over .env
      envFilePath: [`../../.env.${process.env.NODE_ENV}`, "../../.env"],
      expandVariables: true,
    }),
    ConferenceModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    // spread kafkaClients (empty when disabled)
    ...kafkaClients,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
