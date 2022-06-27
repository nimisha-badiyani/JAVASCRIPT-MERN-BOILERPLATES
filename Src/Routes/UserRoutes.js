import express from "express";
let UserRoutes = express.Router();
import { UserController } from "../Controller";
import { AuthenticationMiddleware, AuthorizationMiddleware } from "../Middleware";

// [ + ]After Login this url is used for user
UserRoutes.get("/profile", AuthenticationMiddleware, UserController.getUserDetails);
UserRoutes.put("/changePassword", AuthenticationMiddleware, UserController.updatePassword);
UserRoutes.put("/edit_profile", AuthenticationMiddleware, UserController.updateUserDetails);

// [ + ] Admin Credentials
UserRoutes.get(
  "/admin",
  AuthenticationMiddleware,
  AuthorizationMiddleware("admin"),
  UserController.getAllUserDetails
);
UserRoutes.get(
  "/admin/user/:id",
  AuthenticationMiddleware,
  AuthorizationMiddleware("admin"),
  UserController.getSingleUser
);
UserRoutes.put(
  "/admin/user/:id",
  AuthenticationMiddleware,
  AuthorizationMiddleware("admin"),
  UserController.updateUserRole
);
// UserRoutes.delete(
//   "/admin/user/:id",
//   AuthenticationMiddleware,
//   AuthorizationMiddleware("admin"),
//   UserController.removeUser
// );
export default UserRoutes;
