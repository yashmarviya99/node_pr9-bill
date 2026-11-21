const mongoose = require("mongoose");

const challanItemSchema = new mongoose.Schema(
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
      default: 0,
      min: 0,
    },

    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const challanSchema = new mongoose.Schema(
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

    challanNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    challanDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    challanType: {
      type: String,
      enum: [
        "delivery",
        "returnable",
        "job_work",
      ],
      default: "delivery",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    transporterName: {
      type: String,
      trim: true,
      default: "",
    },

    eWayBillNumber: {
      type: String,
      trim: true,
      default: "",
    },

    items: {
      type: [challanItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one challan item is required",
      },
    },

    totalQuantity: {
      type: Number,
      default: 0,
    },

    totalAmount: {
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

challanSchema.index(
  {
    company: 1,
    financialYear: 1,
    challanNumber: 1,
  },
  {
    unique: true,
  }
);

challanSchema.index({
  company: 1,
  customer: 1,
  challanDate: -1,
});

const Challan = mongoose.model(
  "Challan",
  challanSchema
);

module.exports = Challan;