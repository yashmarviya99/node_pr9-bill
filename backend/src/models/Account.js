const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
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

    accountCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [
        150,
        "Account name cannot exceed 150 characters",
      ],
    },

    accountType: {
      type: String,
      enum: [
        "cash",
        "bank",
        "customer",
        "supplier",
        "income",
        "expense",
        "capital",
        "other",
      ],
      required: [true, "Account type is required"],
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

    address: {
      type: String,
      trim: true,
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

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    description: {
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

// Account code unique within company
accountSchema.index(
  {
    company: 1,
    accountCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      accountCode: {
        $type: "string",
        $ne: "",
      },
    },
  }
);

accountSchema.index({
  company: 1,
  name: 1,
});

accountSchema.index({
  company: 1,
  accountType: 1,
});

const Account = mongoose.model(
  "Account",
  accountSchema
);

module.exports = Account;