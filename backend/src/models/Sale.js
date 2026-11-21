const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
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

    invoiceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const saleSchema = new mongoose.Schema(
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
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    // Challan from which this sale was created
    challan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challan",
      default: null,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },

    invoiceType: {
      type: String,
      enum: ["sale", "retail", "tax"],
      default: "sale",
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one product is required",
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

    transportAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoiceAmount: {
      type: Number,
      default: 0,
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

    paymentMode: {
      type: String,
      enum: ["cash", "bank", "online", "credit"],
      default: "credit",
    },

    paymentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingAmount: {
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

saleSchema.index(
  {
    company: 1,
    financialYear: 1,
    invoiceNumber: 1,
  },
  {
    unique: true,
  }
);

saleSchema.index({
  company: 1,
  invoiceDate: -1,
});

saleSchema.index({
  company: 1,
  account: 1,
});

saleSchema.index({
  company: 1,
  challan: 1,
});

const Sale = mongoose.model("Sale", saleSchema);

module.exports = Sale;