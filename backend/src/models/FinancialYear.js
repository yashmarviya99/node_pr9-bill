const mongoose = require("mongoose");

const financialYearSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Financial year name is required"],
      trim: true,
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    isCurrent: {
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

financialYearSchema.index(
  {
    company: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const FinancialYear = mongoose.model(
  "FinancialYear",
  financialYearSchema
);

module.exports = FinancialYear;