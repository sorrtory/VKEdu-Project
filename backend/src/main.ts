import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Для MVP разрешаем CORS со всех источников, чтобы фронтенд мог
  // напрямую запрашивать токены и другие данные с бэкенда.
  app.enableCors({ origin: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
