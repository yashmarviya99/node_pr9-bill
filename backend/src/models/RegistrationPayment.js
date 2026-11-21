const mongoose = require("mongoose");

const registrationPaymentSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },

      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true,
      },

      paymentMethod: {
        type: String,
        enum: [
          "online",
          "card",
          "bank_transfer",
          "upi",
          "other",
        ],
        required: true,
      },

      transactionReference: {
        type: String,
        trim: true,
        default: "",
      },

      amount: {
        type: Number,
        min: 0,
        default: null,
      },

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "INR",
      },

      status: {
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

      submittedAt: {
        type: Date,
        default: null,
      },

      verifiedAt: {
        type: Date,
        default: null,
      },

      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      adminNote: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

registrationPaymentSchema.index({
  company: 1,
  status: 1,
});

registrationPaymentSchema.index({
  createdAt: -1,
});

const RegistrationPayment =
  mongoose.model(
    "RegistrationPayment",
    registrationPaymentSchema
  );

module.exports = RegistrationPayment;