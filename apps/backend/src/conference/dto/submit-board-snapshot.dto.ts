import { IsString, IsNotEmpty } from "class-validator"

export class SubmitBoardSnapshotDto {
  @IsNotEmpty()
  @IsString()
  conferenceId!: string

  @IsNotEmpty()
  @IsString()
  imageBase64!: string
}
