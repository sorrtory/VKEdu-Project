import { IsDateString, IsNotEmpty, IsString } from "class-validator"

export class SummaryEventDto {
  @IsString()
  @IsNotEmpty()
  type!: string

  @IsString()
  @IsNotEmpty()
  room_id!: string

  @IsString()
  @IsNotEmpty()
  text!: string

  @IsDateString()
  timestamp!: string
}
