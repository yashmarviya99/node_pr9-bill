const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
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

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastTransactionType: {
      type: String,
      enum: [
        "opening",
        "purchase",
        "sale",
        "sale_return",
        "purchase_return",
        "adjustment",
      ],
      default: "opening",
    },

    lastTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

stockSchema.index(
  {
    company: 1,
    branch: 1,
    financialYear: 1,
    product: 1,
  },
  {
    unique: true,
  }
);

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
