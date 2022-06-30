import { UserModel, TokenModel } from "../Models";
import {
  AWSUpload,
  Cloudinary,
  ErrorHandler,
  SendEmail,
  SendTextMessage,
  Security,
  SendToken,
} from "../Services";
import Joi from "joi";
import cloudinary from "cloudinary";
const UserController = {
  // [ + ] REGISTRATION LOGIC
  async registerUser(req, res, next) {
    try {
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
        password: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
          .required(),
        confirmPassword: Joi.ref("password"),
        profile_img: Joi.object(),
        verified: Joi.boolean().default(true),
        role: Joi.string().default("user"),
        status: Joi.string().default("Active"),
        userIp: Joi.string().default("0.0.0.0"),
        userLocation: Joi.string().default("Some Location"),
      });

      const { error } = UserValidation.validate(req.body);
      if (error) {
        return next(error);
      }
      let { name, email, password, confirmPassword, userLocation } = req.body;
      let user;
      if (req.file.path) {
        req.file.path = req.file.path.replace("\\", "/");
        let myCloud = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "user_profile_img",
        });

        // check if user in database already
        try {
          const exist = await UserModel.exists({ email: req.body.email });
          if (exist) {
            return next(
              ErrorHandler.alreadyExist("This email is already taken")
            );
          }
        } catch (err) {
          return next(err);
        }
        user = await UserModel.create({
          name,
          email,
          password,
          profile_img: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          userLocation,
        });
      }
      SendToken(user, 201, res, "Account Created Successfully");
    } catch (error) {
      return next(ErrorHandler.serverError(error));
    }
  },

  // [ + ] VERIFICATION EMAIL LOGIC
  async verifyEmail(req, res, next) {
    try {
      const user = await UserModel.findOne({ _id: req.params.id });
      if (!user) {
        return next(new ErrorHandler("Invalid Verification Link", 400));
      }

      const token = await TokenModel.findOne({
        userId: user._id,
        token: req.params.token,
      });
      if (!token) {
        return next(new ErrorHandler("Invalid Verification Link", 400));
      }

      await UserModel.findByIdAndUpdate(
        req.params.id,
        {
          verified: true,
        },
        { new: true, runValidators: true, useFindAndModify: false }
      );
      await token.remove();

      res.status(200).send({
        success: true,
        message: "Email Verification Successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  },

  // [ + ] LOGIN USER LOGIC
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please Enter Email & Password", 400));
      }
      const user = await UserModel.findOne({ email: email }).select(
        "+password"
      );
      if (!user) {
        return next(new ErrorHandler("Invalid Email and password", 400));
      }

      if (!user.verified) {
        return next(new ErrorHandler("please verify your email address", 400));
      }

      const isPasswordMatched = await user.comparePassword(password);
      if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email and password", 400));
      }

      if (user.status === "Deactivate") {
        let message = `To Reactivate Your Account Please Fill this form`;
        const sendActivateAccountInfo = await SendEmail({
          email: user.email,
          subject: `Reactivate Your Account`,
          message,
        });
        if (!sendActivateAccountInfo) {
          return next(
            new ErrorHandler(
              "Something Error Occurred Please Try After Some Time",
              422
            )
          );
        }
        return next(
          new ErrorHandler(
            "It Seem's You have deleted Your Account Please Check Your Mail For More Details",
            422
          )
        );
      }

      if (user.status === "Blocked") {
        let message = `Administrator Have Blocked Your Account Because Some Inappropriate Activity Has Done From Your Account`;
        const sendActivateAccountInfo = await SendEmail({
          email: user.email,
          subject: `Terms & Conditions`,
          message,
        });
        if (!sendActivateAccountInfo) {
          return next(
            new ErrorHandler(
              "Something Error Occurred Please Try After Some Time",
              422
            )
          );
        }
        return next(
          new ErrorHandler(
            "It Seem's Administrator have Blocked Your Account Please Check Your Mail For More Details",
            422
          )
        );
      }

      const token = user.getJWTToken();
      let message = `Someone Is Login From Your Account at User IP:- ${req.socket.remoteAddress} Location:"User Location Here" ${user.userLocation}`;

      const AccountLogin = await SendEmail({
        email: user.email,
        subject: `Login From Your Account`,
        message,
      });
      if (!AccountLogin) {
        return next(
          new ErrorHandler(
            "Something Error Occurred Please Try After Some Time",
            422
          )
        );
      }
      SendToken(user, 200, res);
    } catch (error) {
      return next(new ErrorHandler(error, 500));
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

  // [ + ] FORGOT PASSWORD USER LOGIC
  async forgotPassword(req, res, next) {
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user) {
      return next(new ErrorHandler("User Not Found", 404));
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `Your password reset token is:- ${resetPasswordUrl} \n\n If you Don't requested this email then ignore it\n\n `;

    try {
      await SendEmail({
        email: user.email,
        subject: `Password Recovery Email`,
        message,
      });
      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler(error.message, 500));
    }
  },

  // [ + ] RESET PASSWORD USER LOGIC
  async resetPassword(req, res, next) {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");
      const user = await UserModel.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },

        // [ + ]
      });
      if (!user) {
        return next(
          new ErrorHandler(
            "Reset password token is Invalid or has been expired",
            404
          )
        );
      }

      if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password doesn't match", 400));
      }
      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      SendToken(user, 200, res);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // [ + ] GET USER DETAILS
  async userprofile_img(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (user.status == "Deactivate") {
        return next(
          new ErrorHandler(
            "It Seem's You have deleted Your Account Please Check Your Mail For More Details",
            422
          )
        );
      }
      SuccessHandler(200, user, "User Details Display Successfully", res);
    } catch (error) {
      return new ErrorHandler(error, 500);
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
      return new ErrorHandler(error, 500);
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

      const user = await UserModel.findById(req.user.id).select("+password");
      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );
      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old Password Is Incorrect", 400));
      }
      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password Doesn't match", 400));
      }
      user.password = req.body.newPassword;
      user.save();
      SendToken(user, 200, res);
      SuccessHandler(200, user, "Password Change Successfully", res);
    } catch (error) {
      return new ErrorHandler(error, 500);
    }
  },

  // [ + ] GET SINGLE USER LOGIC

  async getSingleUser(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        res.status(422).json({
          success: false,
          code: 422,
          data: "",
          message: `${req.params.id} is not valid MongoDB ID`,
        });
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
      return new ErrorHandler(error, 500);
    }
  },

  // [ + ] UPDATE USER ROLE LOGIC

  async updateUserRole(req, res, next) {
    if (!isValidObjectId(req.params.id)) {
      res.status(422).json({
        success: false,
        code: 422,
        data: "",
        message: `${req.params.id} is not valid MongoDB ID`,
      });
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
      return new ErrorHandler(error, 500);
    }
  },

  // [ + ] UPDATE USER DETAIL LOGIC

  async editUserprofile_img(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        res.status(422).json({
          success: false,
          code: 422,
          data: "",
          message: `${req.params.id} is not valid MongoDB ID`,
        });
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
        await cloudinary.v2.uploader.destroy(imageId);
        const myCloud = await cloudinary.v2.uploader.upload(
          req.body.profile_img,
          {
            folder: "profile_imgs",
            width: 150,
            crop: "scale",
          }
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
      return new ErrorHandler(error, 500);
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
      return new ErrorHandler(error, 500);
    }
  },

  // [ > ] BLOCK USER  BY ADMIN LOGIC

  async blockUser(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        res.status(422).json({
          success: false,
          code: 422,
          data: "",
          message: `${req.params.id} is not valid MongoDB ID`,
        });
      }
      const user = await UserModel.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler(`User does not exist with Id: ${req.params.id}`, 400)
        );
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
      return new ErrorHandler(error, 500);
    }
  },

  // [ > ] Delete User - Admin

  async removeUser(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        res.status(422).json({
          success: false,
          code: 422,
          data: "",
          message: `${req.params.id} is not valid MongoDB ID`,
        });
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
      return new ErrorHandler(error, 500);
    }
  },
};

export default UserController;
