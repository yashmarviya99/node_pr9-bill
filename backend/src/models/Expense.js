const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
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

    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    expenseNumber: {
      type: String,
      required: true,
      trim: true,
    },

    expenseDate: {
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

expenseSchema.index(
  {
    company: 1,
    financialYear: 1,
    expenseNumber: 1,
  },
  {
    unique: true,
  }
);

expenseSchema.index({
  company: 1,
  financialYear: 1,
  expenseDate: 1,
});

expenseSchema.index({
  company: 1,
  account: 1,
  expenseDate: 1,
});

expenseSchema.index({
  company: 1,
  expenseAccount: 1,
  expenseDate: 1,
});

module.exports = mongoose.model(
  "Expense",
  expenseSchema
);