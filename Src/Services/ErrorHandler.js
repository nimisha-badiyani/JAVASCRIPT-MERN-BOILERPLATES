import consola from "consola";
class ErrorHandler extends Error {
  constructor(msg, status) {
    super();
    this.status = status;
    this.message = msg;
  }
  //   here we are creating static method because we dont need to create object to call a class it call automatically
  static alreadyExist(message) {
    consola.error(message);
    return new ErrorHandler(message, 409);
  }
  static notFound(message = "404 Not Found") {
    consola.error(message);
    return new ErrorHandler(message, 404);
  }

  static wrongCredentials(message) {
    consola.error(message);
    return new ErrorHandler((message = "username or password is wrong"), 401);
  }
  // default message or value given to function
  static unAuthorized(message = "unAuthorized") {
    consola.error(message);
    return new ErrorHandler(message, 401);
  }
  static serverError(message = "Internal Server Error") {
    consola.error(message);
    return new ErrorHandler(message, 500);
  }
}
export default ErrorHandler;