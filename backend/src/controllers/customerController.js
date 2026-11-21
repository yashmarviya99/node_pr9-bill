const mongoose = require("mongoose");

const Customer = require("../models/Customer");
const Company = require("../models/Company");
const Branch = require("../models/Branch");

const {
  customerCreateSchema,
  customerUpdateSchema,
} = require("../validators/customerValidator");

// Create Customer
const createCustomer = async (req, res, next) => {
  try {
    const validatedData = customerCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      ...customerData
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
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
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
          message: "Branch not found for this company",
        });
      }
    }

    const customer = await Customer.create({
      company: companyId,
      branch: branchId || null,
      ...customerData,
      customerCode: customerData.customerCode
        ? customerData.customerCode.toUpperCase()
        : "",
      gstNumber: customerData.gstNumber
        ? customerData.gstNumber.toUpperCase()
        : "",
      panNumber: customerData.panNumber
        ? customerData.panNumber.toUpperCase()
        : "",
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Customer code already exists",
      });
    }

    next(error);
  }
};

// Get all Customers
const getCustomers = async (req, res, next) => {
  try {
    const { companyId, branchId, search, isActive } = req.query;

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

    const filter = {
      company: companyId,
    };

    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID",
        });
      }

      filter.branch = branchId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          customerCode: {
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

    const customers = await Customer.find(filter)
      .populate("branch", "name code")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Customer
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id).populate(
      "branch",
      "name code"
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const company = await Company.findOne({
      _id: customer.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this customer",
      });
    }

    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    next(error);
  }
};

// Update Customer
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const validatedData =
      customerUpdateSchema.parse(req.body);

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const company = await Company.findOne({
      _id: customer.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this customer",
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
        company: customer.company,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found for this company",
        });
      }
    }

    const updateData = {
      ...validatedData,
    };

    if (updateData.branchId !== undefined) {
      updateData.branch = updateData.branchId || null;
      delete updateData.branchId;
    }

    if (updateData.customerCode) {
      updateData.customerCode =
        updateData.customerCode.toUpperCase();
    }

    if (updateData.gstNumber) {
      updateData.gstNumber =
        updateData.gstNumber.toUpperCase();
    }

    if (updateData.panNumber) {
      updateData.panNumber =
        updateData.panNumber.toUpperCase();
    }

    Object.assign(customer, updateData);

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Customer code already exists",
      });
    }

    next(error);
  }
};

// Delete Customer
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const company = await Company.findOne({
      _id: customer.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this customer",
      });
    }

    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};