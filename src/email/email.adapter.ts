import { MailerService } from "@nest-modules/mailer"
import { HttpException, HttpStatus, Injectable } from "@nestjs/common"
import nodemailer from "nodemailer"

@Injectable()
export class EmailAdapter  {

    constructor (private mailerService: MailerService) {}
    async sendEmailConfirmation (email: string, message: string, subject: string): Promise<object> {



      try {
        return await this.mailerService.sendMail({
          from: 'Evgeniy <jenbka999@gmail.com>',
          to: email,
          subject: subject,
          html: message
      })
      } catch (error) {
        throw new HttpException(
          `Ошибка работы почты: ${JSON.stringify(error)}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    //     return this.mailerService.sendMail({
    //     from: 'Evgeniy <jenbka999@gmail.com>',
    //     to: email,
    //     subject: subject,
    //     html: message
    // }).catch((e) => {
    //   throw new HttpException(
    //     `Ошибка работы почты: ${JSON.stringify(e)}`,
    //     HttpStatus.UNPROCESSABLE_ENTITY,
    //   );
    // });
    }
} 


// try {
//   await this.mailerService.sendMail({
//     from: 'Evgeniy <jenbka999@gmail.com>',
//     to: email,
//     subject: subject,
//     html: message
// })
// } catch (error) {
//   throw new HttpException(
//     `Ошибка работы почты: ${JSON.stringify(e)}`,
//     HttpStatus.UNPROCESSABLE_ENTITY,
//   );
// }
