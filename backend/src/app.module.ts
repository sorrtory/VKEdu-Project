import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LivekitController } from './livekit.controller';
import { ConferenceModule } from './conference/conference.module';

@Module({
  imports: [
    ConferenceModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'nestjs-producer-client',
            brokers: ['broker:9092'], // use broker:29092 if Nest runs in Docker
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
  controllers: [AppController, LivekitController],
  providers: [AppService],
})
export class AppModule {}
