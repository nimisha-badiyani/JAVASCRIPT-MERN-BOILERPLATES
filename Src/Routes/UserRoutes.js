import express from "express";
let UserRoutes = express.Router();
import { UserController } from "../Controller";
import {
  AuthenticationMiddleware,
  AuthorizationMiddleware,
  Upload,
} from "../Middleware";

// [ + ]After Login this url is used for user
UserRoutes.get(
  "/profile_img",
  AuthenticationMiddleware,
  UserController.userprofile_img
);
UserRoutes.put(
  "/changePassword",
  AuthenticationMiddleware,
  UserController.changePassword
);
UserRoutes.put(
  "/edit_profile_img",
  AuthenticationMiddleware,
  Upload.single("profile_img"),
  UserController.editUserprofile_img
);
UserRoutes.put(
  "/deactivate",
  AuthenticationMiddleware,
  UserController.deactivateAccount
);

// [ + ] Admin Credentials
UserRoutes.get(
  "/admin/user",
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

UserRoutes.put(
  "/admin/user/block/:id",
  AuthenticationMiddleware,
  AuthorizationMiddleware("admin"),
  UserController.blockUser
);
UserRoutes.delete(
  "/admin/user/:id",
  AuthenticationMiddleware,
  AuthorizationMiddleware("admin"),
  UserController.removeUser
);
export default UserRoutes;
