const mongoose = require("mongoose");

const saleReturnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    hsnSac: {
      type: String,
      trim: true,
      default: "",
    },

    uom: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    cgstPercent: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgstPercent: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    igstPercent: {
      type: Number,
      default: 0,
      min: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const saleReturnSchema = new mongoose.Schema(
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

    originalSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    returnNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    returnDate: {
      type: Date,
      required: true,
      index: true,
    },

    items: {
      type: [saleReturnItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          items.length > 0,
        message:
          "At least one product is required",
      },
    },

    productAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    returnAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    roundOff: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundMode: {
      type: String,
      enum: [
        "none",
        "cash",
        "bank",
        "online",
      ],
      default: "none",
    },

    refundAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    narration: {
      type: String,
      trim: true,
      default: "",
    },

    termsAndConditions: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

saleReturnSchema.index(
  {
    company: 1,
    financialYear: 1,
    returnNumber: 1,
  },
  {
    unique: true,
  }
);

saleReturnSchema.index({
  company: 1,
  returnDate: -1,
});

const SaleReturn = mongoose.model(
  "SaleReturn",
  saleReturnSchema
);

module.exports = SaleReturn;