import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: "user",
  },
  token: { type: String, required: true },
  otp: { type: String },
  createdAt: { type: Date, default: Date.now }, // 20 minutes
  expiresAt: { type: Date, expires: 1200 },
});

let TokenModel = mongoose.model("TokenVerification", TokenSchema);

export default TokenModel;
