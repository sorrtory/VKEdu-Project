import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    send: jest.fn().mockResolvedValue({
      success: true,
      message: 'Image sent to Kafka',
      filename: 'unit-test.png',
    }),
  } as Partial<AppService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('send', () => {
    it('should call AppService.send and return its result', async () => {
      const fakeImage = {
        originalname: 'unit-test.png',
        mimetype: 'image/png',
        size: 10,
        buffer: Buffer.from('data'),
      } as Express.Multer.File;

      const res = await appController.send(fakeImage, { meta: 'x' });
      expect(res).toEqual({
        success: true,
        message: 'Image sent to Kafka',
        filename: 'unit-test.png',
      });
      expect(mockAppService.send).toHaveBeenCalled();
    });
  });
});
