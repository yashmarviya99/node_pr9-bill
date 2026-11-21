const mongoose = require("mongoose");

const Branch = require("../models/Branch");
const Company = require("../models/Company");

const {
  branchCreateSchema,
  branchUpdateSchema,
} = require("../validators/branchValidator");

// Create Branch
const createBranch = async (req, res, next) => {
  try {
    const validatedData = branchCreateSchema.parse(req.body);

    const { companyId, ...branchData } = validatedData;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

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

    if (branchData.isMainBranch) {
      await Branch.updateMany(
        {
          company: companyId,
        },
        {
          $set: {
            isMainBranch: false,
          },
        }
      );
    }

    const branch = await Branch.create({
      company: companyId,
      ...branchData,
      code: branchData.code.toUpperCase(),
    });

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Branch code already exists in this company",
      });
    }

    next(error);
  }
};

// Get all branches
const getBranches = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId query parameter is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

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

    const branches = await Branch.find({
      company: companyId,
    }).sort({
      isMainBranch: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: branches.length,
      branches,
    });
  } catch (error) {
    next(error);
  }
};

// Get single branch
const getBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const company = await Company.findOne({
      _id: branch.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this branch",
      });
    }

    res.status(200).json({
      success: true,
      branch,
    });
  } catch (error) {
    next(error);
  }
};

// Update Branch
const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const validatedData = branchUpdateSchema.parse(req.body);

    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const company = await Company.findOne({
      _id: branch.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this branch",
      });
    }

    if (validatedData.isMainBranch === true) {
      await Branch.updateMany(
        {
          company: branch.company,
          _id: { $ne: branch._id },
        },
        {
          $set: {
            isMainBranch: false,
          },
        }
      );
    }

    if (validatedData.code) {
      validatedData.code = validatedData.code.toUpperCase();
    }

    Object.assign(branch, validatedData);

    await branch.save();

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      branch,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Branch code already exists in this company",
      });
    }

    next(error);
  }
};

// Delete Branch
const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const company = await Company.findOne({
      _id: branch.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this branch",
      });
    }

    await Branch.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};