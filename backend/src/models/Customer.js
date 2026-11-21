const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
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

    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [150, "Customer name cannot exceed 150 characters"],
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: [0, "Opening balance cannot be negative"],
    },

    openingBalanceType: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },

    creditDays: {
      type: Number,
      default: 0,
      min: [0, "Credit days cannot be negative"],
    },

    isActive: {
      type: Boolean,
      default: true,
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

customerSchema.index(
  {
    company: 1,
    customerCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      customerCode: {
        $type: "string",
        $ne: "",
      },
    },
  }
);

customerSchema.index({
  company: 1,
  name: 1,
});

customerSchema.index({
  company: 1,
  phone: 1,
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;