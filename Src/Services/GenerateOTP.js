import otpGenerator from "otp-generator";
const GenerateOTP = (length, config) => {
  const otpConfig = {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  };
  const result = otpGenerator.generate(length || 3, config || otpConfig);
  const result2 = otpGenerator.generate(length || 3, config || otpConfig);
  return `${result}${result2}`;
};
export default GenerateOTP;
