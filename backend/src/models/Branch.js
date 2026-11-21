const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      minlength: [2, "Branch name must be at least 2 characters"],
      maxlength: [150, "Branch name cannot exceed 150 characters"],
    },

    code: {
      type: String,
      required: [true, "Branch code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "Branch code cannot exceed 20 characters"],
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

    isMainBranch: {
      type: Boolean,
      default: false,
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

branchSchema.index(
  { company: 1, code: 1 },
  { unique: true }
);

const Branch = mongoose.model("Branch", branchSchema);

module.exports = Branch;