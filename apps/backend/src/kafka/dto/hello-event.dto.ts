import { IsString } from "class-validator"

export class HelloEventDto {
  @IsString()
  message!: string
}
