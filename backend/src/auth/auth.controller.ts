import { Controller, Post } from "@nestjs/common";

@Controller('auth')
export class AuthController {
    // constructor(private AuthService: AuthService) {}
    

    @Post('/register')
    async register(email: string, password: string) {

    }

    @Post('/login')
    async login(email: string, password: string) {


    }


    @Post('/logout')
    async logout() {


    }

    @Post('/refresh')
    async refresh() {


    }

}