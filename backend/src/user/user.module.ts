import { UserService } from "./user.service";
import { Module } from '@nestjs/common';


@Module({
    imports: [],
    providers: [UserService],

})
export class UserModule {}