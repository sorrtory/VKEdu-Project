import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app/app.module"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { ConfigService } from "@nestjs/config"

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

  // Connect kafka consumer
  console.log("Starting Kafka consumer...")
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.getOrThrow("BACKEND_KAFKA_CLIENT_ID"),
        brokers: [
          `${configService.getOrThrow("BACKEND_KAFKA_HOST")}:${configService.getOrThrow("KAFKA_PORT")}`,
        ],
      },
      consumer: {
        groupId: configService.getOrThrow("BACKEND_KAFKA_CONSUMER_GROUP_ID"),
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
