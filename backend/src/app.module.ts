import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'nestjs-producer-client',
            brokers: ['localhost:9092'], // use broker:29092 if Nest runs in Docker
          },
          producer: {
            allowAutoTopicCreation: true,
          },
          consumer: {
            groupId: 'nestjs-producer-consumer',
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}