import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }
  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  getHello(): string {
    return 'Hello World!';
  }

  async send(image: Express.Multer.File, body: any): Promise<object> {
    if (!image) {
      throw new BadRequestException('file is required');
    }

    const payload = {
      filename: image.originalname,
      mimetype: image.mimetype,
      size: image.size,
      data: image.buffer.toString('base64'),
      ...body,
      uploadedAt: new Date().toISOString(),
    };

    await lastValueFrom(this.kafkaClient.emit('boardEvent', payload));

    return {
      success: true,
      message: 'Image sent to Kafka',
      filename: image.originalname,
    };
  }
}
