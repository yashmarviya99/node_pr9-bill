const mongoose = require("mongoose");

const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");

const {
  accountCreateSchema,
  accountUpdateSchema,
} = require("../validators/accountValidator");

// Create Account
const createAccount = async (req, res, next) => {
  try {
    const validatedData =
      accountCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      ...accountData
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

    // Bank-specific validation
    if (
      accountData.accountType === "bank" &&
      !accountData.bankName
    ) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required for bank account",
      });
    }

    const account = await Account.create({
      company: companyId,
      branch: branchId || null,

      ...accountData,

      accountCode: accountData.accountCode
        ? accountData.accountCode.toUpperCase()
        : "",

      ifscCode: accountData.ifscCode
        ? accountData.ifscCode.toUpperCase()
        : "",
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists",
      });
    }

    next(error);
  }
};

// Get all Accounts
const getAccounts = async (req, res, next) => {
  try {
    const {
      companyId,
      branchId,
      accountType,
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

    // Account type filter
    if (accountType) {
      const allowedTypes = [
        "cash",
        "bank",
        "customer",
        "supplier",
        "income",
        "expense",
        "capital",
        "other",
      ];

      if (!allowedTypes.includes(accountType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type",
        });
      }

      filter.accountType = accountType;
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
          accountCode: {
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
      ];
    }

    const accounts = await Account.find(filter)
      .populate("branch", "name code")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Account
const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findById(id).populate(
      "branch",
      "name code"
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: account.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this account",
      });
    }

    res.status(200).json({
      success: true,
      account,
    });
  } catch (error) {
    next(error);
  }
};

// Update Account
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const validatedData =
      accountUpdateSchema.parse(req.body);

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: account.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this account",
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
        company: account.company,
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
    if (updateData.accountCode) {
      updateData.accountCode =
        updateData.accountCode.toUpperCase();
    }

    if (updateData.ifscCode) {
      updateData.ifscCode =
        updateData.ifscCode.toUpperCase();
    }

    // Bank validation
    const finalAccountType =
      updateData.accountType ||
      account.accountType;

    if (
      finalAccountType === "bank" &&
      updateData.bankName === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required for bank account",
      });
    }

    Object.assign(account, updateData);

    await account.save();

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      account,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Account code already exists",
      });
    }

    next(error);
  }
};

// Delete Account
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check company ownership
    const company = await Company.findOne({
      _id: account.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this account",
      });
    }

    await Account.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};