const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Account = require("../models/Account");
const Company = require("../models/Company");

// Job In: Add a new employee and create account
const jobIn = async (req, res, next) => {
  try {
    const {
      companyId,
      branchId,
      name,
      contactMobile,
      contactEmail,
      address,
      designation,
      salary,
      joiningDate,
      notes,
    } = req.body;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid companyId is required" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Employee name is required" });
    }

    if (!contactMobile || !contactMobile.trim()) {
      return res.status(400).json({ success: false, message: "Contact mobile is required" });
    }

    const company = await Company.findOne({ _id: companyId, owner: req.user.userId });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Auto-generate employee code
    const count = await Employee.countDocuments({ company: companyId });
    const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;

    // Create an employee expense/payable account in Ledger / Account
    const employeeAccount = await Account.create({
      company: companyId,
      branch: branchId || null,
      accountCode: employeeCode,
      name: `${name.trim()} (Salary A/c)`,
      accountType: "expense",
      contactPerson: name.trim(),
      phone: contactMobile.trim(),
      email: contactEmail ? contactEmail.trim().toLowerCase() : "",
      address: address ? address.trim() : "",
      openingBalance: 0,
      openingBalanceType: "debit",
      description: `Employee account for ${name.trim()}`,
      isActive: true,
    });

    const employee = await Employee.create({
      company: companyId,
      branch: branchId || null,
      employeeCode,
      name: name.trim(),
      contactMobile: contactMobile.trim(),
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : "",
      address: address ? address.trim() : "",
      designation: designation ? designation.trim() : "Staff",
      salary: Number(salary || 0),
      jobStatus: "active",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      account: employeeAccount._id,
      notes: notes ? notes.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Employee added successfully and employee account created",
      employee,
    });
  } catch (error) {
    next(error);
  }
};

// Job Out: Mark employee as leaving / closed
const jobOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { leavingDate, leavingReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const company = await Company.findOne({ _id: employee.company, owner: req.user.userId });
    if (!company) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this employee" });
    }

    employee.jobStatus = "inactive";
    employee.leavingDate = leavingDate ? new Date(leavingDate) : new Date();
    employee.leavingReason = leavingReason ? leavingReason.trim() : "Resigned / Released";

    await employee.save();

    // Deactivate linked account
    if (employee.account) {
      await Account.findByIdAndUpdate(employee.account, { isActive: false });
    }

    return res.status(200).json({
      success: true,
      message: "Employee marked as closed / inactive successfully",
      employee,
    });
  } catch (error) {
    next(error);
  }
};

// Get Employee Details / list
const getEmployees = async (req, res, next) => {
  try {
    const { companyId, branchId, search = "", jobStatus, page = 1, limit = 50 } = req.query;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid companyId is required" });
    }

    const company = await Company.findOne({ _id: companyId, owner: req.user.userId });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const query = { company: companyId };
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      query.branch = branchId;
    }
    if (jobStatus) {
      query.jobStatus = jobStatus;
    }
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { contactMobile: regex }, { designation: regex }, { employeeCode: regex }];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate("account", "name accountCode")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      success: true,
      employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(id).populate("account");
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const company = await Company.findOne({ _id: employee.company, owner: req.user.userId });
    if (!company) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.status(200).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const company = await Company.findOne({ _id: employee.company, owner: req.user.userId });
    if (!company) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { name, contactMobile, contactEmail, address, designation, salary, notes, jobStatus } = req.body;
    if (name) employee.name = name.trim();
    if (contactMobile) employee.contactMobile = contactMobile.trim();
    if (contactEmail !== undefined) employee.contactEmail = contactEmail.trim().toLowerCase();
    if (address !== undefined) employee.address = address.trim();
    if (designation !== undefined) employee.designation = designation.trim();
    if (salary !== undefined) employee.salary = Number(salary || 0);
    if (notes !== undefined) employee.notes = notes.trim();
    if (jobStatus) employee.jobStatus = jobStatus;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const company = await Company.findOne({ _id: employee.company, owner: req.user.userId });
    if (!company) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Employee.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  jobIn,
  jobOut,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
