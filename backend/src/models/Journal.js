const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
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

    debitAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    creditAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    journalNumber: {
      type: String,
      required: true,
      trim: true,
    },

    journalDate: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
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

journalSchema.index(
  {
    company: 1,
    financialYear: 1,
    journalNumber: 1,
  },
  {
    unique: true,
  }
);

journalSchema.index({
  company: 1,
  financialYear: 1,
  journalDate: 1,
});

journalSchema.index({
  company: 1,
  debitAccount: 1,
  journalDate: 1,
});

journalSchema.index({
  company: 1,
  creditAccount: 1,
  journalDate: 1,
});

module.exports = mongoose.model(
  "Journal",
  journalSchema
);