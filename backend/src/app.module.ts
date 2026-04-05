import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LivekitController } from './livekit.controller';
import { ConferenceController } from './conference/conference.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['broker:29092'], // your broker address
          },
          producer: {},
        },
      },
    ]),
  ],
  controllers: [AppController, LivekitController, ConferenceController],
  providers: [AppService],
})
export class AppModule {}
