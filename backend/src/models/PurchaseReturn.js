const mongoose = require("mongoose");

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      trim: true,
      default: "",
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
      default: 0,
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
    },

    taxableAmount: {
      type: Number,
      default: 0,
    },

    gstRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    cgstPercent: {
      type: Number,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
    },

    sgstPercent: {
      type: Number,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
    },

    igstPercent: {
      type: Number,
      default: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
    },

    returnAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const purchaseReturnSchema = new mongoose.Schema(
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
    },

    financialYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },

    originalPurchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      index: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
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
      default: Date.now,
    },

    items: {
      type: [purchaseReturnItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one return item is required",
      },
    },

    productAmount: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
    },

    igstAmount: {
      type: Number,
      default: 0,
    },

    returnAmount: {
      type: Number,
      default: 0,
    },

    roundOff: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    adjustmentMode: {
      type: String,
      enum: [
        "none",
        "cash",
        "bank",
        "online",
        "supplier_credit",
      ],
      default: "none",
    },

    adjustmentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    adjustmentAmount: {
      type: Number,
      default: 0,
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

purchaseReturnSchema.index(
  {
    company: 1,
    financialYear: 1,
    returnNumber: 1,
  },
  {
    unique: true,
  }
);

purchaseReturnSchema.index({
  company: 1,
  supplier: 1,
  returnDate: -1,
});

const PurchaseReturn = mongoose.model(
  "PurchaseReturn",
  purchaseReturnSchema
);

module.exports = PurchaseReturn;