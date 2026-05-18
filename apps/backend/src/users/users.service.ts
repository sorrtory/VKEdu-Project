import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreateUserDto } from "./dto/create-user.dto"
import * as bcrypt from "bcrypt"
import { UpdateUserDto } from "./dto/update-user.dto"
import { Prisma } from "../generated/prisma/client"
import { UserDto } from "./dto/user.dto"

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { userId: id } })
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    })

    return users.map((user) => UserDto.fromModel(user))
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.findByIdOrThrow(id)
    return UserDto.fromModel(user)
  }

  async create(data: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10)
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          nickname: data.nickname,
        },
      })

      return UserDto.fromModel(user)
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<UserDto> {
    await this.findByIdOrThrow(id)

    try {
      const passwordHash = data.password
        ? await bcrypt.hash(data.password, 10)
        : undefined

      const user = await this.prisma.user.update({
        where: { userId: id },
        data: {
          email: data.email,
          nickname: data.nickname,
          ...(passwordHash ? { passwordHash } : {}),
        },
      })

      return UserDto.fromModel(user)
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async remove(id: string): Promise<UserDto> {
    await this.findByIdOrThrow(id)

    const user = await this.prisma.user.delete({
      where: { userId: id },
    })

    return UserDto.fromModel(user)
  }

  private async findByIdOrThrow(id: string) {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`)
    }

    return user
  }

  private handleKnownRequestError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("User with this email already exists")
    }

    throw error
  }
}
