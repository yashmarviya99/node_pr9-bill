const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    financialYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    incomeAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    incomeNumber: {
      type: String,
      required: true,
      trim: true,
    },

    incomeDate: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentMode: {
      type: String,
      enum: [
        "cash",
        "bank",
        "upi",
        "cheque",
        "card",
        "other",
      ],
      default: "cash",
    },

    chequeNumber: {
      type: String,
      trim: true,
      default: "",
    },

    chequeDate: {
      type: Date,
      default: null,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    narration: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

incomeSchema.index(
  {
    company: 1,
    financialYear: 1,
    incomeNumber: 1,
  },
  {
    unique: true,
  }
);

incomeSchema.index({
  company: 1,
  financialYear: 1,
  incomeDate: 1,
});

incomeSchema.index({
  company: 1,
  account: 1,
  incomeDate: 1,
});

incomeSchema.index({
  company: 1,
  incomeAccount: 1,
  incomeDate: 1,
});

module.exports = mongoose.model(
  "Income",
  incomeSchema
);