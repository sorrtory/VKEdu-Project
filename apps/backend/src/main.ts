import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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

  const port = Number(process.env.BACKEND_PORT)
  if (!port) throw new Error("BACKEND_PORT is not set")

  // Bind to 0.0.0.0 so the server is reachable from other Docker containers
  // and external hosts when running in a containerized environment.
  await app.listen(port, "0.0.0.0")
}
void bootstrap()
