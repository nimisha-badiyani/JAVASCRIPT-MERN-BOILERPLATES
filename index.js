// Package & Files Calling
import express from "express";
const app = express();
import { PORT, CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET } from "./Config";
import { AuthenticationRoutes, UserRoutes } from "./Src/Routes";
import "./Src/Database";
import cors from "cors";
import { ErrorMiddleware } from "./Src/Middleware";
import cookieParser from "cookie-parser";
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
  })
);
import consola from "consola";
import cloudinary from "cloudinary";
import bodyParser from "body-parser";

app.use(bodyParser.urlencoded({ extended: true }));

// todo: All Routes Declare Here
app.use("/api/v1/auth", AuthenticationRoutes);
app.use("/api/v1/", UserRoutes);

//* Middleware for Error
app.use(ErrorMiddleware);
// ? when we declare any undefine variable then this error occur so we can handle this error here
process.on("uncaughtException", (error) => {
  consola.error(
    `Shutting down the server due to uncaught exception:${error.message}`
  );
  process.exit(1);
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET,
});

let server = app.listen(PORT, () => {
  console.log("\n\n\n\n\n");
  consola.success(`Server Connected at http://localhost:${PORT}`);
});

// * unhandled promise rejection: it occur when we are put incorrect mongodb string in short it accept all mongodb connection errors
//  * when we are handling this error we dont need to put catch block in database connection file
process.on("unhandledRejection", (error) => {
  consola.error(
    `Shutting down the server due to unhandled promise rejection: ${error.message}`
  );
  server.close(() => {
    process.exit(1);
  });
});
