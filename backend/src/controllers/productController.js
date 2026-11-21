const mongoose = require("mongoose");

const Product = require("../models/Product");
const Company = require("../models/Company");
const Branch = require("../models/Branch");

const {
  productCreateSchema,
  productUpdateSchema,
} = require("../validators/productValidator");

// Create Product
const createProduct = async (req, res, next) => {
  try {
    const validatedData =
      productCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      ...productData
    } = validatedData;

    // Validate company ID
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: companyId,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check branch if provided
    if (branchId) {
      if (
        !mongoose.Types.ObjectId.isValid(branchId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      const branch = await Branch.findOne({
        _id: branchId,
        company: companyId,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message:
            "Branch not found for this company",
        });
      }
    }

    const product = await Product.create({
      company: companyId,
      branch: branchId || null,

      ...productData,

      productCode: productData.productCode
        ? productData.productCode.toUpperCase()
        : "",

      hsnSac: productData.hsnSac
        ? productData.hsnSac.toUpperCase()
        : "",
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product code already exists",
      });
    }

    next(error);
  }
};

// Get all Products
const getProducts = async (req, res, next) => {
  try {
    const {
      companyId,
      branchId,
      category,
      search,
      isActive,
    } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId query parameter is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: companyId,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const filter = {
      company: companyId,
    };

    // Branch filter
    if (branchId) {
      if (
        !mongoose.Types.ObjectId.isValid(branchId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      filter.branch = branchId;
    }

    // Category filter
    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }

    // Active filter
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Search
    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          productCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          hsnSac: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const products = await Product.find(filter)
      .populate("branch", "name code")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Product
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id).populate(
      "branch",
      "name code"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: product.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this product",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Update Product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const validatedData =
      productUpdateSchema.parse(req.body);

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: product.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this product",
      });
    }

    // Validate branch
    if (validatedData.branchId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          validatedData.branchId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      const branch = await Branch.findOne({
        _id: validatedData.branchId,
        company: product.company,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message:
            "Branch not found for this company",
        });
      }
    }

    const updateData = {
      ...validatedData,
    };

    // branchId -> branch
    if (updateData.branchId !== undefined) {
      updateData.branch =
        updateData.branchId || null;

      delete updateData.branchId;
    }

    // Uppercase fields
    if (updateData.productCode) {
      updateData.productCode =
        updateData.productCode.toUpperCase();
    }

    if (updateData.hsnSac) {
      updateData.hsnSac =
        updateData.hsnSac.toUpperCase();
    }

    Object.assign(product, updateData);

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product code already exists",
      });
    }

    next(error);
  }
};

// Delete Product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: product.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this product",
      });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};