const mongoose = require("mongoose");

const quotationItemSchema = new mongoose.Schema(
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
      default: "PCS",
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

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const quotationSchema = new mongoose.Schema(
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

    quotationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    quotationDate: {
      type: Date,
      required: true,
      index: true,
    },

    validUntil: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
      ],
      default: "draft",
      index: true,
    },

    taxType: {
      type: String,
      enum: ["cgst_sgst", "igst"],
      default: "cgst_sgst",
    },

    items: {
      type: [quotationItemSchema],
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

    roundOff: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
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

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

quotationSchema.index(
  {
    company: 1,
    financialYear: 1,
    quotationNumber: 1,
  },
  {
    unique: true,
  }
);

quotationSchema.index({
  company: 1,
  quotationDate: -1,
});

const Quotation = mongoose.model(
  "Quotation",
  quotationSchema
);

module.exports = Quotation;