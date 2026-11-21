const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const Company = require("../models/Company");
const Branch = require("../models/Branch");

const {
  supplierCreateSchema,
  supplierUpdateSchema,
} = require("../validators/supplierValidator");

// Create Supplier
const createSupplier = async (req, res, next) => {
  try {
    const validatedData =
      supplierCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      ...supplierData
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

    const supplier = await Supplier.create({
      company: companyId,
      branch: branchId || null,

      ...supplierData,

      supplierCode: supplierData.supplierCode
        ? supplierData.supplierCode.toUpperCase()
        : "",

      gstNumber: supplierData.gstNumber
        ? supplierData.gstNumber.toUpperCase()
        : "",

      panNumber: supplierData.panNumber
        ? supplierData.panNumber.toUpperCase()
        : "",
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      supplier,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Supplier code already exists",
      });
    }

    next(error);
  }
};

// Get all Suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const {
      companyId,
      branchId,
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
          supplierCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          gstNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const suppliers = await Supplier.find(filter)
      .populate("branch", "name code")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Supplier
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const supplier = await Supplier.findById(id).populate(
      "branch",
      "name code"
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: supplier.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this supplier",
      });
    }

    res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    next(error);
  }
};

// Update Supplier
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const validatedData =
      supplierUpdateSchema.parse(req.body);

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: supplier.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this supplier",
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
        company: supplier.company,
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
    if (updateData.supplierCode) {
      updateData.supplierCode =
        updateData.supplierCode.toUpperCase();
    }

    if (updateData.gstNumber) {
      updateData.gstNumber =
        updateData.gstNumber.toUpperCase();
    }

    if (updateData.panNumber) {
      updateData.panNumber =
        updateData.panNumber.toUpperCase();
    }

    Object.assign(supplier, updateData);

    await supplier.save();

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Supplier code already exists",
      });
    }

    next(error);
  }
};

// Delete Supplier
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
    }

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: supplier.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this supplier",
      });
    }

    await Supplier.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};