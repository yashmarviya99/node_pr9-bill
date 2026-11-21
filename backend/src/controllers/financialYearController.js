const mongoose = require("mongoose");

const FinancialYear = require("../models/FinancialYear");
const Company = require("../models/Company");

const {
  financialYearCreateSchema,
  financialYearUpdateSchema,
} = require("../validators/financialYearValidator");

// Create Financial Year
const createFinancialYear = async (req, res, next) => {
  try {
    const validatedData =
      financialYearCreateSchema.parse(req.body);

    const {
      companyId,
      name,
      startDate,
      endDate,
      isCurrent,
    } = validatedData;

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

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    if (isCurrent) {
      await FinancialYear.updateMany(
        {
          company: companyId,
        },
        {
          $set: {
            isCurrent: false,
          },
        }
      );
    }

    const financialYear = await FinancialYear.create({
      company: companyId,
      name,
      startDate: start,
      endDate: end,
      isCurrent,
    });

    res.status(201).json({
      success: true,
      message: "Financial year created successfully",
      financialYear,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This financial year already exists",
      });
    }

    next(error);
  }
};

// Get all Financial Years
const getFinancialYears = async (req, res, next) => {
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

    const financialYears = await FinancialYear.find({
      company: companyId,
    }).sort({
      startDate: -1,
    });

    res.status(200).json({
      success: true,
      count: financialYears.length,
      financialYears,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Financial Year
const getFinancialYearById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid financial year ID",
      });
    }

    const financialYear = await FinancialYear.findById(id);

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    const company = await Company.findOne({
      _id: financialYear.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this financial year",
      });
    }

    res.status(200).json({
      success: true,
      financialYear,
    });
  } catch (error) {
    next(error);
  }
};

// Update Financial Year
const updateFinancialYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid financial year ID",
      });
    }

    const validatedData =
      financialYearUpdateSchema.parse(req.body);

    const financialYear =
      await FinancialYear.findById(id);

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    const company = await Company.findOne({
      _id: financialYear.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this financial year",
      });
    }

    const start = validatedData.startDate
      ? new Date(validatedData.startDate)
      : financialYear.startDate;

    const end = validatedData.endDate
      ? new Date(validatedData.endDate)
      : financialYear.endDate;

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before end date",
      });
    }

    if (validatedData.isCurrent === true) {
      await FinancialYear.updateMany(
        {
          company: financialYear.company,
          _id: { $ne: financialYear._id },
        },
        {
          $set: {
            isCurrent: false,
          },
        }
      );
    }

    Object.assign(financialYear, validatedData);

    financialYear.startDate = start;
    financialYear.endDate = end;

    await financialYear.save();

    res.status(200).json({
      success: true,
      message: "Financial year updated successfully",
      financialYear,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This financial year already exists",
      });
    }

    next(error);
  }
};

// Delete Financial Year
const deleteFinancialYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid financial year ID",
      });
    }

    const financialYear =
      await FinancialYear.findById(id);

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    const company = await Company.findOne({
      _id: financialYear.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this financial year",
      });
    }

    await FinancialYear.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Financial year deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFinancialYear,
  getFinancialYears,
  getFinancialYearById,
  updateFinancialYear,
  deleteFinancialYear,
};