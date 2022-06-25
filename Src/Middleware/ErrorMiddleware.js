import { DEBUG_MODE } from "../../Config";
import { ValidationError } from "joi";
import { ErrorHandler } from "../Services";

const ErrorMiddleware = (err, req, res, next) => {
  let statusCode = 500;
  let data = {
    message: "INTERNAL SERVER ERROR",
    // this is good for development not for production
    ...(DEBUG_MODE === "true" && { originalError: err.message }),
  };

  //   it only tell us the object we can get is of what object or class
  if (err instanceof ValidationError) {
    statusCode = 422;
    data = {
      message: err.message,
    };
  }

  if (err instanceof ErrorHandler) {
    statusCode = err.status;
    data = {
      message: err.message,
    };
  }
  return res.status(statusCode).json(data);
};

export default ErrorMiddleware;
