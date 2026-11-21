const mongoose = require("mongoose");

const invoiceSettingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    financialYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      default: null,
      index: true,
    },
    salePrefix: {
      type: String,
      default: "SALE-",
      trim: true,
    },
    saleStartingNumber: {
      type: Number,
      default: 1,
    },
    purchasePrefix: {
      type: String,
      default: "PUR-",
      trim: true,
    },
    purchaseStartingNumber: {
      type: Number,
      default: 1,
    },
    saleReturnPrefix: {
      type: String,
      default: "SR-",
      trim: true,
    },
    saleReturnStartingNumber: {
      type: Number,
      default: 1,
    },
    purchaseReturnPrefix: {
      type: String,
      default: "PR-",
      trim: true,
    },
    purchaseReturnStartingNumber: {
      type: Number,
      default: 1,
    },
    cashVoucherPrefix: {
      type: String,
      default: "C-",
      trim: true,
    },
    cashStartingNumber: {
      type: Number,
      default: 1,
    },
    bankVoucherPrefix: {
      type: String,
      default: "B-",
      trim: true,
    },
    bankStartingNumber: {
      type: Number,
      default: 1,
    },
    journalVoucherPrefix: {
      type: String,
      default: "J-",
      trim: true,
    },
    journalStartingNumber: {
      type: Number,
      default: 1,
    },
    defaultTermsAndConditions: {
      type: String,
      default: "Goods once sold will not be taken back or exchanged.",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSettingSchema.index({ company: 1, financialYear: 1 });

const InvoiceSetting = mongoose.model("InvoiceSetting", invoiceSettingSchema);

module.exports = InvoiceSetting;
