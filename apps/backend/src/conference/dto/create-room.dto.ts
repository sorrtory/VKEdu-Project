import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class CreateRoomDto {
  @ApiProperty({
    description: "LiveKit room name",
    example: "math-lesson-1",
  })
  @IsString()
  @IsNotEmpty()
  roomName!: string
}
