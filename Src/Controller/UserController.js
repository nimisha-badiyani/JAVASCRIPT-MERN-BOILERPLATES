import { UserModel, TokenModel } from "../Models";
import {
  AWSUpload,
  Cloudinary,
  ErrorHandler,
  SendEmail,
  SendTextMessage,
  Security,
  SendToken,
  SuccessHandler,
  CheckMongoID,
} from "../Services";
import Joi from "joi";
import cloudinary from "cloudinary";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { FRONTEND_URL } from "../../Config";

const UserController = {
  // [ + ] REGISTRATION LOGIC
  async registerUser(req, res, next) {
    try {
      const UserRegistration = Joi.object({
        name: Joi.string().trim().min(3).max(30).required().messages({
          "string.base": `User Name should be a type of 'text'`,
          "string.empty": `User Name cannot be an empty field`,
          "string.min": `User Name should have a minimum length of {3}`,
          "any.required": `User Name is a required field`,
        }),
        email: Joi.string().email().trim().required().messages({
          "string.base": `User Email should be a type of 'text'`,
          "string.empty": `User Email cannot be an empty field`,
          "any.required": `User Email is a required field`,
        }),
        password: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9#?!@$%^&*-]{8,30}$"))
          .required(),
        // confirmPassword: Joi.ref("password"),
        // For Custom Message we are using this
        confirmPassword: Joi.string().required(),
        verified: Joi.boolean().default(true),
        role: Joi.string().default("user"),
        status: Joi.string().default("Active"),
        userIp: Joi.string().default("0.0.0.0"),
        userLocation: Joi.string().default("Some Location"),
      });

      const { error } = UserRegistration.validate(req.body);
      if (error) {
        return next(error);
      }
      let { name, email, password, confirmPassword, userLocation } = req.body;

      if (req.body.password) {
        if (req.body.password !== req.body.confirmPassword) {
          return next(
            ErrorHandler.unAuthorized(
              "Confirm Password & Password Must Be Same"
            )
          );
        }
      }

      try {
        const exist = await UserModel.exists({ email: req.body.email });
        if (exist) {
          return next(ErrorHandler.alreadyExist("This email is already taken"));
        }
      } catch (err) {
        return next(err);
      }
      let user = await UserModel.create({
        name,
        email,
        password,
        userLocation,
      });
      SendToken(user, 201, res, "Account Created Successfully");
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] LOGIN USER LOGIC
  async login(req, res, next) {
    try {
      const LoginSchema = Joi.object({
        email: Joi.string().email().trim().required().messages({
          "string.base": `User Email should be a type of 'text'`,
          "string.empty": `User Email cannot be an empty field`,
          "any.required": `User Email is a required field`,
        }),
        password: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9#?!@$%^&*-]{8,30}$"))
          .required(),
        userIp: Joi.string().default("0.0.0.0"),
        userLocation: Joi.string().default("Some Location"),
      });
      const { error } = LoginSchema.validate(req.body);
      if (error) {
        return next(error);
      }
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email: email }).select(
        "+password"
      );
      if (!user) {
        return next(
          new ErrorHandler.wrongCredentials("Invalid Email and password")
        );
      }

      const isPasswordMatched = await user.comparePassword(password);
      if (!isPasswordMatched) {
        return next(
          ErrorHandler.wrongCredentials("Invalid Email and password")
        );
      }

      if (user.status === "Deactivate") {
        let message = `To Reactivate Your Account Please Fill this form`;
        const sendActivateAccountInfo = await SendEmail({
          email: user.email,
          subject: `Reactivate Your Account`,
          templateName: "deactivateAccount",
          context: {
            username: user.name,
          },
        });
        if (!sendActivateAccountInfo) {
          return next(
            ErrorHandler.serverError(
              "Something Error Occurred Please Try After Some Time"
            )
          );
        }
        return next(
          ErrorHandler.notFound(
            "It Seem's You have deleted Your Account Please Check Your Mail For More Details"
          )
        );
      }

      if (user.status === "Blocked") {
        let message = `Administrator Have Blocked Your Account Because Some Inappropriate Activity Has Done From Your Account`;
        const sendActivateAccountInfo = await SendEmail({
          email: user.email,
          subject: `Reactivate Your Account`,
          templateName: "deactivateAccount",
          context: {
            username: user.username,
          },
        });
        if (!sendActivateAccountInfo) {
          return next(
            ErrorHandler.serverError(
              "Something Error Occurred Please Try After Some Time"
            )
          );
        }
        return next(
          ErrorHandler.notFound(
            "It Seem's Administrator have Blocked Your Account Please Check Your Mail For More Details"
          )
        );
      }

      // let message = `Someone Is Login From Your Account at User IP:- ${req.socket.remoteAddress} Location:"User Location Here" ${user.userLocation}`;
      let current = new Date();
      let currenttimeDate = `${current.toLocaleTimeString()} - ${current.toLocaleDateString()}`;
      const AccountLogin = await SendEmail({
        email: user.email,
        subject: `Someone Is Login From Your Account`,
        templateName: "loginAccount",
        context: {
          username: user.username,
          UserIP: `Ip:- ${req.socket.remoteAddress}`,
          userLocation: `Location:- ${user.userLocation}`,
          time: currenttimeDate,
        },
      });
      if (!AccountLogin) {
        return next(
          ErrorHandler.serverError(
            "Something Error Occurred Please Try After Some Time"
          )
        );
      }
      SendToken(user, 200, res, "Login Successfully");
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] LOGOUT LOGIC
  async logout(req, res, next) {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(200).json({
        success: true,
        message: "Successfully Logout",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error });
    }
  },

  // [ + ] Upload Profile Picture
  async uploadProfileImage(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      req.file.path = req.file.path.replace("\\", "/");
      let myCloud = await Cloudinary.UploadFile(
        req.file.path,
        `${user.id}/profile`
      );
      let fileSize = await Cloudinary.fileSizeConversion(req.file.size);
      user.profile_img.fileName = req.file.filename;
      user.profile_img.fileSize = fileSize;
      user.profile_img.public_id = myCloud.public_id;
      user.profile_img.url = myCloud.url;
      user.save();
      SuccessHandler(200, user, "User Profile Uploaded Successfully", res);
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] FORGOT PASSWORD USER LOGIC
  async forgotPassword(req, res, next) {
    const forgotPasswordSchema = Joi.object({
      email: Joi.string().email().trim().required().messages({
        "string.base": `User Email should be a type of 'text'`,
        "string.empty": `User Email cannot be an empty field`,
        "any.required": `User Email is a required field`,
      }),
      userIp: Joi.string().default("0.0.0.0"),
      userLocation: Joi.string().default("Some Location"),
    });
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) {
      return next(ErrorHandler.notFound("User Not Found"));
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `Your password reset token is:- ${resetPasswordUrl} \n\n If you Don't requested this email then ignore it\n\n `;

    try {
      let current = new Date();
      let currenttimeDate = `${current.toLocaleTimeString()} - ${current.toLocaleDateString()}`;
      const AccountLogin = await SendEmail({
        email: user.email,
        subject: `Reset Password Request from ${user.name}`,
        templateName: "resetPassword",
        context: {
          username: user.name,
          useremail: user.email,
          userId: user._id,
          url: resetPasswordUrl,
          UserIP: `${req.socket.remoteAddress}`,
          userLocation: `${user.userLocation}`,
          time: currenttimeDate,
        },
      });
      if (!AccountLogin) {
        return next(
          ErrorHandler.serverError(
            "Something Error Occurred Please Try After Some Time"
          )
        );
      }
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] RESET PASSWORD USER LOGIC
  async resetPassword(req, res, next) {
    try {
      const ResetSchema = Joi.object({
        password: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9#?!@$%^&*-]{8,30}$"))
          .required(),
        // confirmPassword: Joi.ref("password"),
        // For Custom Message we are using this
        confirmPassword: Joi.string().required(),
        userIp: Joi.string().default("0.0.0.0"),
        userLocation: Joi.string().default("Some Location"),
      });
      const { error } = ResetSchema.validate(req.body);
      if (error) {
        return next(error);
      }
      if (req.body.password || req.body.confirmPassword) {
        if (req.body.password !== req.body.confirmPassword) {
          return next(
            ErrorHandler.unAuthorized(
              "Confirm Password & Password Must Be Same"
            )
          );
        }
      }

      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
      const user = await UserModel.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select("+password");
      console.log(user);
      if (!user) {
        return next(
          ErrorHandler.wrongCredentials(
            "Reset password token is Invalid or has been expired"
          )
        );
      }
      if (req.body.password) {
        let newPassword = req.body.password;
        let result = await bcrypt.hash(newPassword, 10);
        let samePassword = await bcrypt.compare(result, user.password);
        if (samePassword) {
          return next(
            ErrorHandler.alreadyExist(
              "You Can't use old password, please enter new password"
            )
          );
        }
      }
      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      SuccessHandler(
        200,
        user,
        "Your Password is Reset Successfully.Now, Please Login",
        res
      );
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] GET USER DETAILS
  async userProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (user.status == "Deactivate") {
        next(
          new ErrorHandler(
            "It Seem's You have deleted Your Account Please Check Your Mail For More Details",
            422
          )
        );
        return SuccessHandler(200, "", "User Account Deactivate", res);
      }
      SuccessHandler(200, user, "User Details Display Successfully", res);
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] GET ALL USER DETAIL LOGIC
  async getAllUserDetails(req, res, next) {
    try {
      const users = await UserModel.find(
        { __v: 0 },
        { __v: 0, createdAt: 0 }
      ).sort({ createdAt: -1 });
      SuccessHandler(200, users, "User Details Display Successfully", res);
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] UPDATE USER PASSWORD

  async changePassword(req, res, next) {
    try {
      const UserValidation = Joi.object({
        oldPassword: Joi.string().required().messages({
          "string.base": `User Name should be a type of 'text'`,
          "string.empty": `User Name cannot be an empty field`,
          "string.min": `User Name should have a minimum length of {3}`,
          "any.required": `User Name is a required field`,
        }),
        newPassword: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
          .required(),
        confirmPassword: Joi.ref("password"),
      });
      const { error } = UserValidation.validate(req.body);
      if (error) {
        return next(error);
      }

      if (req.body.newPassword || req.body.confirmPassword) {
        if (req.body.newPassword !== req.body.confirmPassword) {
          return next(
            ErrorHandler.unAuthorized(
              "Confirm Password & Password Must Be Same"
            )
          );
        }
      }
      const user = await UserModel.findById(req.user.id).select("+password");
      let oldPasswordTest = await bcrypt.compare(
        req.body.newPassword,
        user.password
      );
      if (!oldPasswordTest) {
        return next(ErrorHandler.notFound("Old Password Is Incorrect"));
      }
      // if (req.body.newPassword) {
      //   let newPassword = req.body.newPassword;
      //   newPassword = await bcrypt.hash(newPassword, 10);
      //   let samePassword = await bcrypt.compare(newPassword, user.password);
      //   if (samePassword) {
      //     return next(
      //       ErrorHandler.alreadyExist(
      //         "You Can't use old password, please enter new password"
      //       )
      //     );
      //   }
      // }

      user.password = req.body.newPassword;
      user.save();
      SendToken(user, 200, res);
      SuccessHandler(200, user, "Password Change Successfully", res);
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] GET SINGLE USER LOGIC

  async getSingleUser(req, res, next) {
    try {
      const testId = CheckMongoID(req.params.id);
      if (!testId) {
        return next(ErrorHandler.wrongCredentials("Wrong MongoDB Id"));
      }
      const user = await UserModel.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler(`User does not exist with Id: ${req.params.id}`)
        );
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] UPDATE USER ROLE LOGIC

  async updateUserRole(req, res, next) {
    const testId = CheckMongoID(req.params.id);
    if (!testId) {
      return next(ErrorHandler.wrongCredentials("Wrong MongoDB Id"));
    }
    const UserValidation = Joi.object({
      name: Joi.string().trim().min(3).max(30).required().messages({
        "string.base": `User Name should be a type of 'text'`,
        "string.empty": `User Name cannot be an empty field`,
        "string.min": `User Name should have a minimum length of {3}`,
        "any.required": `User Name is a required field`,
      }),
      email: Joi.string().email().trim().required().messages({
        "string.base": `User Email should be a type of 'text'`,
        "string.empty": `User Email cannot be an empty field`,
        "any.required": `User Email is a required field`,
      }),
      role: Joi.string().required(),
    });
    const { error } = UserValidation.validate(req.body);
    if (error) {
      return next(error);
    }
    try {
      const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role || "user",
      };
      const userData = await UserModel.findById(req.params.id);
      if (userData.name !== req.body.name) {
        return next(new ErrorHandler("You Can't Change The User Name", 400));
      }
      if (userData.email !== req.body.email) {
        return next(new ErrorHandler("You Can't Change The User Email", 400));
      }
      if (userData.status != "Active") {
        return next(
          new ErrorHandler(
            "This user is not active user, you only change the active user role",
            400
          )
        );
      }
      if (userData.role == req.body.role) {
        return next(
          new ErrorHandler(
            "It's Seems Like You Are Not Changing the User Role",
            400
          )
        );
      }

      let updatedData = await UserModel.findByIdAndUpdate(
        req.params.id,
        newUserData,
        {
          new: true,
          runValidators: true,
          useFindAndModify: false,
        }
      );

      SuccessHandler(200, updatedData, "User Role Updated", res);
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] UPDATE USER DETAIL LOGIC

  async editUserprofile(req, res, next) {
    try {
      const testId = CheckMongoID(req.params.id);
      if (!testId) {
        return next(ErrorHandler.wrongCredentials("Wrong MongoDB Id"));
      }
      const UserValidation = Joi.object({
        name: Joi.string().trim().min(3).max(30).messages({
          "string.base": `User Name should be a type of 'text'`,
          "string.min": `User Name should have a minimum length of {3}`,
        }),
        email: Joi.string().email().trim().messages({
          "string.base": `User Email should be a type of 'text'`,
        }),
        profile_img: Joi.string(),
      });
      const { error } = UserValidation.validate(req.body);
      if (error) {
        return next(error);
      }
      if (req.body.email) {
        const userEmailCheck = await UserModel.exists({
          email: req.body.email,
        });
        if (userEmailCheck) {
          return next(new ErrorHandler("This email is already taken", 409));
        }
      }
      const newUserData = {
        name: req.body.name,
        email: req.body.email,
      };
      if (req.body.profile_img !== undefined && req.body.profile_img !== "") {
        const user = await UserModel.findById(req.user.id);
        const imageId = user.profile_img.public_id;
        await Cloudinary.RemoveFile(imageId);
        const myCloud = await Cloudinary.UploadFile(
          req.file.path,
          `${user.id}/profile`
        );

        newUserData.profile_img = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      const user = await UserModel.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      });

      res.status(200).json({
        success: true,
        user,
      });

      next();
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] DELETE USER LOGIC

  async deactivateAccount(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);

      if (!user) {
        return next(
          new ErrorHandler(`User does not exist with Id: ${req.user.id}`, 400)
        );
      }

      let userStatus = user.status;

      let DeactivatedUser = {
        status: "Deactivate",
      };

      let updatedUser = await UserModel.findByIdAndUpdate(
        req.params.id,
        DeactivatedUser,
        {
          new: true,
          runValidators: true,
          useFindAndModify: false,
        }
      );

      let message = `We are so sorry mail here after user delete account permenantly`;
      const afterDeleteMail = await SendEmail({
        email: user.email,
        subject: `Delete Account Permenantly`,
        message,
      });
      if (!afterDeleteMail) {
        return next(
          new ErrorHandler(
            "Something Error Occurred Please Try After Some Time",
            422
          )
        );
      }
      res.status(200).json({
        success: true,
        updatedUser,
        message: "User Account Removed Successfully",
      });
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] BLOCK USER  BY ADMIN LOGIC

  async blockUser(req, res, next) {
    try {
      const testId = CheckMongoID(req.params.id);
      if (!testId) {
        return next(ErrorHandler.wrongCredentials("Wrong MongoDB Id"));
      }
      const user = await UserModel.findById(req.params.id);

      if (!user) {
        return next(ErrorHandler.notFound(`User Not Found`));
      }

      let userStatus = user.status;

      let DeactivatedUser = {
        status: "Blocked",
      };

      let updatedUser = await UserModel.findByIdAndUpdate(
        req.params.id,
        DeactivatedUser,
        {
          new: true,
          runValidators: true,
          useFindAndModify: false,
        }
      );

      res.status(200).json({
        success: true,
        updatedUser,
        message: "User Blocked Successfully By Admin",
      });
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] Delete User - Admin

  async removeUser(req, res, next) {
    try {
      const testId = CheckMongoID(req.params.id);
      if (!testId) {
        return next(ErrorHandler.wrongCredentials("Wrong MongoDB Id"));
      }
      const user = await UserModel.findById(req.params.id);
      if (!user) {
        return next(
          new ErrorHandler(`User does not exist with Id: ${req.params.id}`, 400)
        );
      }

      await user.remove();

      res.status(200).json({
        success: true,
        message: "User Deleted Successfully",
      });
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },
};

export default UserController;
