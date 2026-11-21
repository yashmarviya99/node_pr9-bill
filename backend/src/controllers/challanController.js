const mongoose = require("mongoose");

const Challan = require("../models/Challan");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Sale = require("../models/Sale");

const {
  challanCreateSchema,
} = require("../validators/challanValidator");

const {
  generateChallanPdf,
} = require("../templates/challan/challanPdf");

/* =========================================================
   CREATE CHALLAN
========================================================= */

const createChallan = async (
  req,
  res,
  next
) => {
  try {
    const data =
      challanCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      customerId,
      challanNumber,
      challanDate,
      challanType,
      referenceNumber,
      vehicleNumber,
      transporterName,
      eWayBillNumber,
      items,
      narration,
      termsAndConditions,
    } = data;

    if (
      !mongoose.Types.ObjectId.isValid(
        companyId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        financialYearId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid financial year ID",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        accountId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const company = await Company.findOne({
      _id: companyId,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    if (
      branchId &&
      !mongoose.Types.ObjectId.isValid(
        branchId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID",
      });
    }

    if (
      customerId &&
      !mongoose.Types.ObjectId.isValid(
        customerId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (branchId) {
      const branch = await Branch.findOne({
        _id: branchId,
        company: companyId,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        });
      }
    }

    const financialYear =
      await FinancialYear.findOne({
        _id: financialYearId,
        company: companyId,
      });

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message:
          "Financial year not found",
      });
    }

    const parsedChallanDate =
      new Date(challanDate);

    if (
      Number.isNaN(
        parsedChallanDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid challan date",
      });
    }

    if (
      financialYear.startDate &&
      parsedChallanDate <
        new Date(financialYear.startDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Challan date is before financial year start date",
      });
    }

    if (
      financialYear.endDate &&
      parsedChallanDate >
        new Date(financialYear.endDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Challan date is after financial year end date",
      });
    }

    const duplicateChallan =
      await Challan.findOne({
        company: companyId,
        financialYear: financialYearId,
        challanNumber:
          challanNumber.toUpperCase(),
      });

    if (duplicateChallan) {
      return res.status(409).json({
        success: false,
        message:
          "Challan number already exists",
      });
    }

    const account =
      await Account.findOne({
        _id: accountId,
        company: companyId,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    let customer = null;

    if (customerId) {
      customer =
        await Customer.findOne({
          _id: customerId,
          company: companyId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
    }

    const productIds = [
      ...new Set(
        items.map(
          (item) => item.productId
        )
      ),
    ];

    const products = await Product.find({
      _id: { $in: productIds },
      company: companyId,
    });

    const productMap = new Map();

    for (const product of products) {
      productMap.set(
        product._id.toString(),
        product
      );
    }

    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found`,
        });
      }
    }

    const challanItems = [];

    let totalQuantity = 0;
    let totalAmount = 0;

    for (const item of items) {
      const product =
        productMap.get(
          item.productId
        );

      const quantity =
        Number(item.quantity);

      const rate =
        Number(item.rate || 0);

      const amount =
        quantity * rate;

      totalQuantity += quantity;
      totalAmount += amount;

      challanItems.push({
        product: product._id,
        productName:
          product.name || "",
        description:
          product.description || "",
        hsnSac:
          product.hsnSac || "",
        uom:
          product.uom || "",
        quantity,
        rate,
        amount,
      });
    }

    const challan =
      await Challan.create({
        company: companyId,
        branch: branchId || null,
        financialYear:
          financialYearId,
        account: accountId,
        customer: customerId || null,
        challanNumber:
          challanNumber.toUpperCase(),
        challanDate:
          parsedChallanDate,
        challanType,
        referenceNumber,
        vehicleNumber,
        transporterName,
        eWayBillNumber,
        items: challanItems,
        totalQuantity,
        totalAmount,
        narration,
        termsAndConditions,
      });

    /*
     * Challan is only a delivery document.
     * It does NOT change stock.
     * Stock is decreased only when the actual Sale is created.
     */

    const populatedChallan =
      await Challan.findById(
        challan._id
      )
        .populate(
          "company",
          "name"
        )
        .populate(
          "branch",
          "name"
        )
        .populate(
          "financialYear",
          "name startDate endDate"
        )
        .populate(
          "account",
          "name accountType accountCode"
        )
        .populate(
          "customer",
          "name phone email"
        )
        .populate(
          "items.product",
          "name sku hsnSac uom"
        );

    return res.status(201).json({
      success: true,
      message:
        "Challan created successfully",
      data: populatedChallan,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET CHALLANS
========================================================= */

const getChallans = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      customerId,
      challanType,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    if (
      !companyId ||
      !mongoose.Types.ObjectId.isValid(
        companyId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid companyId is required",
      });
    }

    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const filter = {
      company: companyId,
      isActive: true,
    };

    if (
      branchId &&
      mongoose.Types.ObjectId.isValid(
        branchId
      )
    ) {
      filter.branch = branchId;
    }

    if (
      financialYearId &&
      mongoose.Types.ObjectId.isValid(
        financialYearId
      )
    ) {
      filter.financialYear =
        financialYearId;
    }

    if (
      customerId &&
      mongoose.Types.ObjectId.isValid(
        customerId
      )
    ) {
      filter.customer = customerId;
    }

    if (challanType) {
      filter.challanType =
        challanType;
    }

    if (fromDate || toDate) {
      filter.challanDate = {};

      if (fromDate) {
        filter.challanDate.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        const endDate =
          new Date(toDate);

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.challanDate.$lte =
          endDate;
      }
    }

    if (search) {
      filter.challanNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const pageNumber =
      Math.max(Number(page), 1);

    const limitNumber =
      Math.min(
        Math.max(Number(limit), 1),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [challans, total] =
      await Promise.all([
        Challan.find(filter)
          .populate(
            "customer",
            "name phone email"
          )
          .populate(
            "account",
            "name accountType accountCode"
          )
          .populate(
            "items.product",
            "name sku hsnSac uom"
          )
          .sort({
            challanDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber),

        Challan.countDocuments(
          filter
        ),
      ]);

    return res.status(200).json({
      success: true,
      data: challans,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages:
          Math.ceil(
            total /
              limitNumber
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET CHALLAN BY ID
========================================================= */

const getChallanById = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid challan ID",
      });
    }

    const challan =
      await Challan.findById(id)
        .populate(
          "company",
          "name"
        )
        .populate(
          "branch",
          "name"
        )
        .populate(
          "financialYear",
          "name startDate endDate"
        )
        .populate(
          "account",
          "name accountType accountCode"
        )
        .populate(
          "customer",
          "name phone email address"
        )
        .populate(
          "items.product",
          "name sku hsnSac uom"
        );

    if (!challan) {
      return res.status(404).json({
        success: false,
        message:
          "Challan not found",
      });
    }

    const company =
      await Company.findOne({
        _id: challan.company._id,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET CHALLAN PDF
========================================================= */

const getChallanPdf = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid challan ID",
      });
    }

    /*
     * Fetch complete challan data
     * required for PDF generation.
     */

    const challan =
      await Challan.findById(id)
        .populate(
          "company"
        )
        .populate(
          "branch"
        )
        .populate(
          "financialYear"
        )
        .populate(
          "account"
        )
        .populate(
          "customer"
        )
        .populate(
          "items.product"
        );

    if (!challan) {
      return res.status(404).json({
        success: false,
        message:
          "Challan not found",
      });
    }

    /*
     * Verify company ownership.
     */

    const companyId =
      challan.company?._id ||
      challan.company;

    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied",
      });
    }

    /*
     * Safe filename.
     */

    const challanNumber =
      String(
        challan.challanNumber ||
          id
      ).replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );

    /*
     * PDF response headers.
     */

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="challan-${challanNumber}.pdf"`
    );

    /*
     * Generate PDF.
     */

    return generateChallanPdf(
      challan,
      res
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE CHALLAN
========================================================= */

const deleteChallan = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
    }

    const challan = await Challan.findById(id);

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Challan not found",
      });
    }

    const company = await Company.findOne({
      _id: challan.company,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const linkedSale = await Sale.findOne({
      challan: challan._id,
      company: challan.company,
      isActive: true,
    });

    if (linkedSale) {
      return res.status(409).json({
        success: false,
        message:
          "This challan is already linked to a sale and cannot be deleted",
      });
    }

    await Challan.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Challan deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChallan,
  getChallans,
  getChallanById,
  getChallanPdf,
  deleteChallan,
};