const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
      default: "",
    },

    ownerName: {
      type: String,
      trim: true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
      default: "",
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    mobileNumber: {
      type: String,
      trim: true,
      default: "",
    },

    secondMobileNumber: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    registrationStatus: {
      type: String,
      enum: [
        "pending_payment",
        "payment_pending_verification",
        "pending_activation",
        "active",
        "rejected",
      ],
      default: "pending_payment",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "submitted",
        "verified",
        "failed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    subscriptionStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "expired",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    registrationPaymentMethod: {
      type: String,
      enum: [
        "online",
        "card",
        "bank_transfer",
        "upi",
        "other",
      ],
      default: "online",
    },

    registrationPaymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    registrationPaymentReference: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    registrationPaymentSubmittedAt: {
      type: Date,
      default: null,
    },

    registrationPaymentVerifiedAt: {
      type: Date,
      default: null,
    },

    registrationPaymentRejectedAt: {
      type: Date,
      default: null,
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    // ─── OTP-based Password Reset ─────────────────────────
    resetOtp: {
      type: String,
      default: null,
      select: false,
    },

    resetOtpExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    resetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
