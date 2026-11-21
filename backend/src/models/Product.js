const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
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

    productCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [
        200,
        "Product name cannot exceed 200 characters",
      ],
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    unit: {
      type: String,
      trim: true,
      default: "PCS",
    },

    hsnSac: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    gstRate: {
      type: Number,
      default: 0,
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100"],
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, "Purchase price cannot be negative"],
    },

    salePrice: {
      type: Number,
      default: 0,
      min: [0, "Sale price cannot be negative"],
    },

    openingStock: {
      type: Number,
      default: 0,
      min: [0, "Opening stock cannot be negative"],
    },

    minimumStock: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock cannot be negative"],
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

// Product code must be unique inside a company
productSchema.index(
  {
    company: 1,
    productCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      productCode: {
        $type: "string",
        $ne: "",
      },
    },
  }
);

productSchema.index({
  company: 1,
  name: 1,
});

productSchema.index({
  company: 1,
  category: 1,
});

const Product = mongoose.model(
  "Product",
  productSchema
);

module.exports = Product;