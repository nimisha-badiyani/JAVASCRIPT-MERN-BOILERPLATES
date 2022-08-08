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
  "/profile",
  AuthenticationMiddleware,
  UserController.userProfile
);
UserRoutes.put(
  "/changePassword",
  AuthenticationMiddleware,
  UserController.changePassword
);
UserRoutes.post(
  "/profile_image",
  AuthenticationMiddleware,
  Upload.single("profile_img"),
  UserController.uploadProfileImage
);

UserRoutes.put(
  "/edit_profile/:id",
  AuthenticationMiddleware,
  Upload.single("profile_img"),
  UserController.editUserprofile
);
UserRoutes.put(
  "/deactivate/:id",
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
