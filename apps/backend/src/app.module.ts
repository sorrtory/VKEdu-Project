import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConferenceModule } from './conference/conference.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { join } from 'path';

// Make Kafka client registration optional. If no KAFKA_BROKERS env var is present
// Kafka-related features will be disabled and the service will be undefined.
const kafkaEnabled =
  typeof process.env.KAFKA_BROKERS === 'string' &&
  process.env.KAFKA_BROKERS.length > 0;
const kafkaClients = kafkaEnabled
  ? [
      ClientsModule.register([
        {
          name: 'KAFKA_SERVICE',
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'nestjs-producer-client',
              brokers: (process.env.KAFKA_BROKERS ?? 'broker:9092').split(','),
            },
            producer: {
              allowAutoTopicCreation: true,
            },
            consumer: {
              groupId:
                process.env.KAFKA_CONSUMER_GROUP || 'nestjs-producer-consumer',
            },
          },
        },
      ]),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load env file based on NODE_ENV (e.g. .env.dev or .env.prod),
      // falling back to the root .env if the specific file isn't present.
      envFilePath: [
        join(__dirname, '..', '..', `.env.${process.env.NODE_ENV}`),
        join(__dirname, '..', '..', '.env'),
      ],
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
