let SuccessHandler = (statusCode, data, message, res) => {
  return res.status(statusCode).json({
    status: true,
    code: statusCode,
    data,
    message,
  });
};

export default SuccessHandler;
