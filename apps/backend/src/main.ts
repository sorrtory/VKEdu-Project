process.env.KAFKAJS_NO_PARTITIONER_WARNING ??= "1"

import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app/app.module"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { ConfigService } from "@nestjs/config"
import { Kafka } from "kafkajs"

const BACKEND_KAFKA_TOPICS = [
  "test",
  "conference.chat",
  "conference.chat.ai.request",
  "conference.chat.ai.response",
  "conference.chat.file",
  "conference.boardcrop",
  "conference.transcript",
  "conference.summary.request",
  "conference.summary.response",
]

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Get config service instance
  const configService = app.get(ConfigService)

  // Connect data validation pipe globally with strict options:
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle("VK Edu API")
    .setDescription("API documentation for VK Edu backend")
    .setVersion("1.0")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, document)

  const kafkaBrokers = [
    `${configService.getOrThrow("BACKEND_KAFKA_HOST")}:${configService.getOrThrow("KAFKA_PORT")}`,
  ]
  await ensureKafkaTopics(
    configService.getOrThrow("BACKEND_KAFKA_CLIENT_ID"),
    kafkaBrokers,
    [
      ...BACKEND_KAFKA_TOPICS,
      configService.get<string>("KAFKA_TRANSCRIPT_TOPIC"),
      configService.get<string>("KAFKA_CHAT_TOPIC"),
    ],
  )

  // Connect kafka consumer
  console.log("Starting Kafka consumer...")
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.getOrThrow("BACKEND_KAFKA_CLIENT_ID"),
        brokers: kafkaBrokers,
      },
      consumer: {
        groupId: configService.getOrThrow("BACKEND_KAFKA_CONSUMER_GROUP_ID"),
        fromBeginning: false, // Start consuming new messages only
      },
    },
  })
  // Start the microservices
  await app.startAllMicroservices()

  // Start the server
  const port = configService.getOrThrow<number>("BACKEND_PORT")

  console.log(`Starting server on port ${port}...`)
  await app.listen(port, "0.0.0.0")
}
void bootstrap()

async function ensureKafkaTopics(
  clientId: string,
  brokers: string[],
  topics: Array<string | undefined>,
) {
  const topicNames = [...new Set(topics.filter(Boolean))] as string[]
  const kafka = new Kafka({ clientId: `${clientId}-admin`, brokers })
  const admin = kafka.admin()

  try {
    await admin.connect()
    const existingTopics = new Set(await admin.listTopics())
    const missingTopics = topicNames.filter(
      (topic) => !existingTopics.has(topic),
    )

    if (missingTopics.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missingTopics.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      })
      console.log(`Kafka topics created: ${missingTopics.join(", ")}`)
    }
  } finally {
    await admin.disconnect()
  }
}
