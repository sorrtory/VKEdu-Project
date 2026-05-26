process.env.KAFKAJS_NO_PARTITIONER_WARNING ??= "1"

import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app/app.module"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { ConfigService } from "@nestjs/config"
import { Kafka } from "kafkajs"

const KAFKA_ADMIN_RETRY_ATTEMPTS = 20
const KAFKA_ADMIN_RETRY_DELAY_MS = 3000

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

  const kafkaBrokers = getKafkaBrokers(configService)
  await ensureKafkaTopicsWithRetry(
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

function getKafkaBrokers(configService: ConfigService): string[] {
  const bootstrapServers = configService.get<string>("KAFKA_BOOTSTRAP_SERVERS")

  if (bootstrapServers) {
    return bootstrapServers
      .split(",")
      .map((broker) => broker.trim())
      .filter(Boolean)
  }

  return [
    `${configService.getOrThrow("BACKEND_KAFKA_HOST")}:${configService.getOrThrow("KAFKA_PORT")}`,
  ]
}

async function ensureKafkaTopicsWithRetry(
  clientId: string,
  brokers: string[],
  topics: Array<string | undefined>,
) {
  for (let attempt = 1; attempt <= KAFKA_ADMIN_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await ensureKafkaTopics(clientId, brokers, topics)
      return
    } catch (error) {
      if (attempt === KAFKA_ADMIN_RETRY_ATTEMPTS) {
        throw error
      }

      console.warn(
        `Kafka is not ready yet (${attempt}/${KAFKA_ADMIN_RETRY_ATTEMPTS}); retrying in ${KAFKA_ADMIN_RETRY_DELAY_MS}ms`,
        error,
      )
      await delay(KAFKA_ADMIN_RETRY_DELAY_MS)
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
