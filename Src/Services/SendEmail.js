import nodeMailer from "nodemailer";
import path from "path";
import hbs from "nodemailer-express-handlebars";
import {
  SMTP_MAIL,
  SMTP_SERVICE,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_PASS,
} from "../../Config";
import { ErrorHandler } from ".";
const sendEmail = async (options) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      service: SMTP_SERVICE,
      secure: false,
      requireTLS: true,
      auth: {
        user: SMTP_MAIL,
        pass: SMTP_PASS,
      },
    });
    const handlerbarsOption = {
      viewEngine: {
        extName: ".html",
        partialsDir: path.resolve("./Src/Templates"),
        defaultLayout: false,
      },
      viewPath: path.resolve("./Src/Templates"),
      extName: ".handlebars",
    };
    transporter.use("compile", hbs(handlerbarsOption));
    const mailOptions = {
      from: SMTP_MAIL,
      to: options.email,
      subject: options.subject,
      template: options.templateName,
      context: options.context,
    };
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    return ErrorHandler.serverError(error.message, 500);
  }
};
export default sendEmail;
