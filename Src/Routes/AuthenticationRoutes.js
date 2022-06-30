import express from "express";
let AuthenticationRoutes = express.Router();
import { UserController } from "../Controller";
import { Upload } from "../Middleware";

// [ + ] User Routes
// AuthenticationRoutes.post("/test",UserController.testing)
AuthenticationRoutes.post(
  "/register",
  Upload.single("profile_img"),
  UserController.registerUser
);
AuthenticationRoutes.post(
  "/users/:id/verify/:token",
  UserController.verifyEmail
);
AuthenticationRoutes.post("/login", UserController.login);
AuthenticationRoutes.post("/password/forgot", UserController.forgotPassword);
AuthenticationRoutes.put(
  "/password/reset/:token",
  UserController.resetPassword
);
AuthenticationRoutes.get("/logout", UserController.logout);
export default AuthenticationRoutes;
