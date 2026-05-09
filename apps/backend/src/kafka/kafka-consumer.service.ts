import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { HelloEventDto } from "./dto/hello-event.dto"

@Injectable()
export class KafkaConsumerService {
  constructor(private readonly prisma: PrismaService) {}

  async hello(message: HelloEventDto) {
    console.log("Received message in service:", message.message)
    // * Call Prisma here
    // await this.prisma.userEvent.create({
    //   data: {
    //     userId: message.userId,
    //     type: "USER_CREATED",
    //     payload: message,
    //   },
    // })
  }
}
