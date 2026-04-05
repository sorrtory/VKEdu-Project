import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LivekitController } from './livekit.controller';
import { ConferenceModule } from './conference/conference.module';
import { ConferenceController } from './conference/conference.controller';
import { ConferenceService } from './conference/conference.service';

@Module({
  imports: [
    ConferenceModule,
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
  providers: [AppService, ConferenceService],
})
export class AppModule {}
