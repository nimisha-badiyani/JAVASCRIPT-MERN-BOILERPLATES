import express from "express";
let AuthenticationRoutes = express.Router();
import { UserController } from "../Controller";
import { Upload } from "../Middleware";

// [ + ] User Routes
AuthenticationRoutes.post("/register", UserController.registerUser);
AuthenticationRoutes.post("/users/verify", UserController.verifyEmail);
AuthenticationRoutes.post("/login", UserController.login);
AuthenticationRoutes.post(
  "/resendVerifyEmail",
  UserController.resendVerifyEmail
);
AuthenticationRoutes.post("/password/forgot", UserController.forgotPassword);
AuthenticationRoutes.put(
  "/password/reset/:token",
  UserController.resetPassword
);
AuthenticationRoutes.get("/logout", UserController.logout);
export default AuthenticationRoutes;
