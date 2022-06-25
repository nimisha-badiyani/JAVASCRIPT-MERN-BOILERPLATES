import express from "express";
let UserRoutes = express.Router();
import { UserController } from "../Controller";
import { UserAuth, Authorization } from "../Middleware";

// [ + ]After Login this url is used for user
UserRoutes.get("/profile", UserAuth, UserController.getUserDetails);
UserRoutes.put("/changePassword", UserAuth, UserController.updatePassword);
UserRoutes.put("/edit_profile", UserAuth, UserController.updateUserDetails);

// [ + ] Admin Credentials
UserRoutes.get(
  "/admin",
  UserAuth,
  Authorization("admin"),
  UserController.getAllUserDetails
);
UserRoutes.get(
  "/admin/user/:id",
  UserAuth,
  Authorization("admin"),
  UserController.getSingleUser
);
UserRoutes.put(
  "/admin/user/:id",
  UserAuth,
  Authorization("admin"),
  UserController.updateUserRole
);
UserRoutes.delete(
  "/admin/user/:id",
  UserAuth,
  Authorization("admin"),
  UserController.removeUser
);
export default UserRoutes;
