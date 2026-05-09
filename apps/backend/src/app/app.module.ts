import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { ConfigModule } from "@nestjs/config"
import { ConferenceModule } from "../conference/conference.module"
import { AuthModule } from "../auth/auth.module"
import { UsersModule } from "../users/users.module"

@Module({
  controllers: [AppController],
  imports: [
    // Load config
    ConfigModule.forRoot({
      isGlobal: true,
      // .env.{NODE_ENV} takes precedence over .env
      envFilePath: [`../../.env.${process.env.NODE_ENV}`, "../../.env"],
      expandVariables: true,
    }),
    // LiveKit conference management
    ConferenceModule,
    // Authentication
    AuthModule,
    // Users management
    UsersModule,
  ],
})
export class AppModule {}
