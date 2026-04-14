import { UUID } from "crypto";
import { User } from "./user.entity";
import * as bcrypt from 'bcrypt';

export class UserService {

    async findByEmail(email: string): Promise<User> {

    }

    async findById(id: UUID): Promise<User> {

    }

    async create(email: string, password: string) {

        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.genHash(password, salt);

        this.userRepo.create({
            email, hash
        })
    }
}