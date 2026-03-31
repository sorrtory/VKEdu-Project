import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConferenceModule } from './conference/conference.module';
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
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    ConferenceModule,
    // spread kafkaClients (empty when disabled)
    ...kafkaClients,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
