import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('VK Edu API')
    .setDescription('API documentation for VK Edu backend')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.BACKEND_PORT) || 3000;
  // Bind to 0.0.0.0 so the server is reachable from other Docker containers
  // and external hosts when running in a containerized environment.
  await app.listen(port, '0.0.0.0');
}
bootstrap();
