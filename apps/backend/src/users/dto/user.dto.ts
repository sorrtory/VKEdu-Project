export class UserDto {
  id: number;
  email: string;
  name?: string | null;
  createdAt: Date;
}
