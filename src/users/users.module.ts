import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BlogsModule } from "src/bloggers/bloggers.module";
import { usersSchema } from "src/db";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";



@Module({
    imports: [BlogsModule, MongooseModule.forFeature([
    {name: 'Users', schema: usersSchema},
    //{name: 'RegistrationData', schema: registrationDataSchema}, 
    //{name: 'AuthData', schema: authDataSchema},
    //{name: 'CodeConfirm', schema: codeConfirmSchema},
    //{name: 'EmailSend', schema: emailSendSchema},
    //{name: 'RefreshToken', schema: refreshTokenSchema},
  ])],
    controllers: [UsersController],
    providers: [UsersService, UsersRepository, 
      //EmailService, EmailManager, EmailAdapter
    ],
    exports: [UsersService]
  })
  export class UsersModule {}