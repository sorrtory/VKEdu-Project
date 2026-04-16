import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger"
import { FileInterceptor } from "@nestjs/platform-express"
import { AppService } from "./app.service"
import { SendImageDto } from "./app/dto/send-image.dto"

@Controller()
@ApiTags("App")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Root hello" })
  @ApiResponse({ status: 200, description: "Returns Hello World string" })
  getHello(): string {
    return this.appService.getHello()
  }

  @Post("send")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Send an image to Kafka" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Image file and optional metadata",
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        metadata: { type: "string" },
      },
    },
  })
  async send(
    @UploadedFile() image: Express.Multer.File,
    @Body() body: SendImageDto,
  ): Promise<object> {
    return this.appService.send(image, body)
  }
}
