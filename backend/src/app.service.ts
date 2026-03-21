import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  getHello(): string {
    return 'Hello World!';
  }

  async send(image: Express.Multer.File, body: any): Promise<object> {
    const payload = {
      filename: image.originalname,
      mimetype: image.mimetype,
      size: image.size,
      data: image.buffer.toString('base64'), // encode image as base64
      ...body,
    };

    await this.kafkaClient.emit('image-topic', payload);

    return {
      success: true,
      message: 'Image sent to Kafka',
      filename: image.originalname,
    };
  }
}
