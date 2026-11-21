const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

    /*
     * Party / Supplier / Customer Account
     */
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    /*
     * Cash / Bank account from which
     * payment is made.
     */
    paymentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    /*
     * Payment number / voucher number
     */
    paymentNumber: {
      type: String,
      required: true,
      trim: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
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

/*
 * Prevent duplicate payment number
 * inside the same company and financial year.
 */
paymentSchema.index(
  {
    company: 1,
    financialYear: 1,
    paymentNumber: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful indexes for Cash Book,
 * Bank Book and Ledger.
 */
paymentSchema.index({
  company: 1,
  financialYear: 1,
  paymentDate: 1,
});

paymentSchema.index({
  company: 1,
  paymentAccount: 1,
  paymentDate: 1,
});

paymentSchema.index({
  company: 1,
  account: 1,
  paymentDate: 1,
});

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);

module.exports = Payment;