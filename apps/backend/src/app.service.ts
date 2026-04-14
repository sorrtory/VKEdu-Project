import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { SendImageDto } from './app/dto/send-image.dto.js';

export interface BoardEventPayload {
  filename: string;
  mimetype: string;
  size: number;
  data: string; // base64
  uploadedAt: string; // ISO timestamp
  [key: string]: unknown;
}

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Optional()
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient?: ClientKafka,
  ) {}

  async onModuleInit() {
    if (this.kafkaClient) {
      await this.kafkaClient.connect();
    }
  }
  async onModuleDestroy() {
    if (this.kafkaClient) {
      await this.kafkaClient.close();
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async send(image: Express.Multer.File, body: SendImageDto): Promise<object> {
    if (!image) {
      throw new BadRequestException('file is required');
    }

    const payload: BoardEventPayload = {
      filename: image.originalname,
      mimetype: image.mimetype,
      size: image.size,
      data: image.buffer.toString('base64'),
      ...body,
      uploadedAt: new Date().toISOString(),
    };

    if (!this.kafkaClient) {
      throw new ServiceUnavailableException(
        'Kafka is not configured; feature disabled',
      );
    }

    await lastValueFrom(this.kafkaClient.emit('boardEvent', payload));

    return {
      success: true,
      message: 'Image sent to Kafka',
      filename: image.originalname,
    };
  }
}
