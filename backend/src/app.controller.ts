import { Controller, Get, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('send')
  @UseInterceptors(FileInterceptor('file'))
  async send(
    @UploadedFile() image: Express.Multer.File,
    @Body() body: any,
  ): Promise<object> {
    return this.appService.send(image, body);
  }
}
