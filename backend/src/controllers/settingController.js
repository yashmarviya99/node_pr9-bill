const mongoose = require("mongoose");
const InvoiceSetting = require("../models/InvoiceSetting");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");
const Account = require("../models/Account");
const Product = require("../models/Product");
const Stock = require("../models/Stock");

// Get settings for company & financial year
const getInvoiceSettings = async (req, res, next) => {
  try {
    const { companyId, financialYearId } = req.query;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid companyId is required" });
    }

    const company = await Company.findOne({ _id: companyId, owner: req.user.userId });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    let settings = await InvoiceSetting.findOne({
      company: companyId,
      ...(financialYearId && mongoose.Types.ObjectId.isValid(financialYearId)
        ? { financialYear: financialYearId }
        : {}),
    });

    if (!settings) {
      // create defaults
      settings = await InvoiceSetting.create({
        company: companyId,
        financialYear: financialYearId || null,
      });
    }

    return res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// Save or update settings
const saveInvoiceSettings = async (req, res, next) => {
  try {
    const { companyId, financialYearId, ...settingsData } = req.body;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid companyId is required" });
    }

    const company = await Company.findOne({ _id: companyId, owner: req.user.userId });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    let settings = await InvoiceSetting.findOne({
      company: companyId,
      ...(financialYearId && mongoose.Types.ObjectId.isValid(financialYearId)
        ? { financialYear: financialYearId }
        : {}),
    });

    if (settings) {
      Object.assign(settings, settingsData);
      await settings.save();
    } else {
      settings = await InvoiceSetting.create({
        company: companyId,
        financialYear: financialYearId || null,
        ...settingsData,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice settings saved successfully",
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// Access Control: Complete Financial Year & Carry Forward Balances
const completeFinancialYearAndCarryForward = async (req, res, next) => {
  try {
    const { companyId, currentFinancialYearId, nextFinancialYearName, nextStartDate, nextEndDate } = req.body;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid companyId is required" });
    }

    if (!currentFinancialYearId || !mongoose.Types.ObjectId.isValid(currentFinancialYearId)) {
      return res.status(400).json({ success: false, message: "Valid currentFinancialYearId is required" });
    }

    const company = await Company.findOne({ _id: companyId, owner: req.user.userId });
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const currentFY = await FinancialYear.findById(currentFinancialYearId);
    if (!currentFY) {
      return res.status(404).json({ success: false, message: "Current financial year not found" });
    }

    // Mark current FY as not current (closed)
    currentFY.isCurrent = false;
    await currentFY.save();

    // Create or find next financial year
    let nextFY = await FinancialYear.findOne({ company: companyId, name: nextFinancialYearName });
    if (!nextFY) {
      nextFY = await FinancialYear.create({
        company: companyId,
        name: nextFinancialYearName,
        startDate: new Date(nextStartDate),
        endDate: new Date(nextEndDate),
        isCurrent: true,
        isActive: true,
      });
    } else {
      nextFY.isCurrent = true;
      await nextFY.save();
    }

    // Carry forward stock balances for products
    const currentStocks = await Stock.find({ company: companyId, financialYear: currentFinancialYearId });
    for (const stock of currentStocks) {
      const existingNextStock = await Stock.findOne({
        company: companyId,
        financialYear: nextFY._id,
        product: stock.product,
      });

      if (!existingNextStock) {
        await Stock.create({
          company: companyId,
          branch: stock.branch,
          financialYear: nextFY._id,
          product: stock.product,
          quantity: stock.quantity,
          lastTransactionType: "opening",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Financial year ${currentFY.name} closed successfully. Data carried forward to ${nextFY.name}.`,
      closedFinancialYear: currentFY,
      newFinancialYear: nextFY,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoiceSettings,
  saveInvoiceSettings,
  completeFinancialYearAndCarryForward,
};
