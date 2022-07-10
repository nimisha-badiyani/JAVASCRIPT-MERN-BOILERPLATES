import { ErrorHandler } from "../Services";

const AuthorizationMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role ${req.user.role} is not allowed to access this resources`,
          403
        )
      );
    }
    next();
  };
};

export default AuthorizationMiddleware;
