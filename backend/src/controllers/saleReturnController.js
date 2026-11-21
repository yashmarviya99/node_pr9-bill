const mongoose = require("mongoose");

const SaleReturn = require("../models/SaleReturn");
const Sale = require("../models/Sale");
const Stock = require("../models/Stock");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const {
  saleReturnCreateSchema,
} = require("../validators/saleReturnValidator");

const {
  generateSaleReturnPdf,
} = require("../templates/saleReturn/saleReturnPdf");

/* =========================================================
   CREATE SALE RETURN
========================================================= */

const createSaleReturn = async (req, res, next) => {
  try {
    const parsed =
      saleReturnCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      financialYearId,
      originalSaleId,
      accountId,
      customerId,
      returnNumber,
      returnDate,
      items,
      refundMode,
      refundAccountId,
      narration,
      roundOff,
    } = parsed;

    /* -----------------------------------------------------
       Validate ObjectIds
    ----------------------------------------------------- */

    const ids = [
      companyId,
      branchId,
      financialYearId,
      originalSaleId,
      accountId,
      customerId,
      refundAccountId,
    ].filter(Boolean);

    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ObjectId: ${id}`,
        });
      }
    }

    /* -----------------------------------------------------
       Company
    ----------------------------------------------------- */

    const company = await Company.findOne({
      _id: companyId,
      owner: req.user.userId,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company not found or access denied",
      });
    }

    /* -----------------------------------------------------
       Branch
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Financial Year
    ----------------------------------------------------- */

    const financialYear =
      await FinancialYear.findOne({
        _id: financialYearId,
        company: companyId,
      });

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found",
      });
    }

    /* -----------------------------------------------------
       Return Date
    ----------------------------------------------------- */

    const selectedReturnDate =
      new Date(returnDate);

    if (
      Number.isNaN(
        selectedReturnDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid return date",
      });
    }

    /* -----------------------------------------------------
       Duplicate Return Number
    ----------------------------------------------------- */

    const existingReturn =
      await SaleReturn.findOne({
        company: companyId,
        financialYear: financialYearId,
        returnNumber,
        isActive: true,
      });

    if (existingReturn) {
      return res.status(409).json({
        success: false,
        message:
          "Sale return number already exists",
      });
    }

    /* -----------------------------------------------------
       Original Sale
    ----------------------------------------------------- */

    const originalSale =
      await Sale.findOne({
        _id: originalSaleId,
        company: companyId,
        financialYear: financialYearId,
        isActive: true,
      });

    if (!originalSale) {
      return res.status(404).json({
        success: false,
        message:
          "Original sale not found",
      });
    }

    /* -----------------------------------------------------
       Account
    ----------------------------------------------------- */

    const account =
      await Account.findOne({
        _id: accountId,
        company: companyId,
        isActive: true,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    /* -----------------------------------------------------
       Customer
    ----------------------------------------------------- */

    const customer =
      await Customer.findOne({
        _id: customerId,
        company: companyId,
        isActive: true,
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    /* -----------------------------------------------------
       Refund Account
    ----------------------------------------------------- */

    let refundAccount = null;

    if (refundAccountId) {
      refundAccount =
        await Account.findOne({
          _id: refundAccountId,
          company: companyId,
          isActive: true,
        });

      if (!refundAccount) {
        return res.status(404).json({
          success: false,
          message:
            "Refund account not found",
        });
      }
    }

    /* -----------------------------------------------------
       Already Returned Quantity
    ----------------------------------------------------- */

    const previousReturns =
      await SaleReturn.find({
        originalSale: originalSaleId,
        isActive: true,
      });

    const returnedQuantityMap = {};

    previousReturns.forEach((saleReturn) => {
      saleReturn.items.forEach((item) => {
        const productId =
          item.product.toString();

        returnedQuantityMap[productId] =
          (returnedQuantityMap[productId] || 0) +
          Number(item.quantity || 0);
      });
    });

    /* -----------------------------------------------------
       Original Sale Product Map
    ----------------------------------------------------- */

    const originalSaleMap = {};

    originalSale.items.forEach((item) => {
      originalSaleMap[
        item.product.toString()
      ] = item;
    });

    /* -----------------------------------------------------
       Calculate Return Items
    ----------------------------------------------------- */

    let productAmount = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const processedItems = [];

    for (const item of items) {
      const productId =
        item.productId.toString();

      const originalItem =
        originalSaleMap[productId];

      if (!originalItem) {
        return res.status(400).json({
          success: false,
          message:
            "Product was not found in original sale",
        });
      }

      const alreadyReturned =
        returnedQuantityMap[productId] || 0;

      const availableQuantity =
        Number(originalItem.quantity || 0) -
        alreadyReturned;

      if (
        Number(item.quantity) >
        availableQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Return quantity for product ${productId} cannot exceed available sale quantity`,
        });
      }

      const quantity =
        Number(item.quantity || 0);

      const rate =
        Number(
          item.rate ??
            originalItem.rate ??
            0
        );

      const discountPercent =
        Number(
          item.discountPercent || 0
        );

      const gstRate =
        Number(
          item.gstRate ??
            originalItem.gstRate ??
            0
        );

      const grossAmount =
        quantity * rate;

      const itemDiscount =
        (grossAmount *
          discountPercent) /
        100;

      const itemTaxable =
        grossAmount - itemDiscount;

      const itemGst =
        (itemTaxable * gstRate) /
        100;

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      if (
        originalSale.taxType ===
        "cgst_sgst"
      ) {
        itemCgst = itemGst / 2;
        itemSgst = itemGst / 2;
      } else if (
        originalSale.taxType === "igst"
      ) {
        itemIgst = itemGst;
      }

      const itemReturnAmount =
        itemTaxable + itemGst;

      productAmount += grossAmount;
      discountAmount += itemDiscount;
      taxableAmount += itemTaxable;
      cgstAmount += itemCgst;
      sgstAmount += itemSgst;
      igstAmount += itemIgst;

      processedItems.push({
        product: productId,
        quantity,
        rate,
        discountPercent,
        discountAmount: itemDiscount,
        taxableAmount: itemTaxable,
        gstRate,
        cgstAmount: itemCgst,
        sgstAmount: itemSgst,
        igstAmount: itemIgst,
        returnAmount: itemReturnAmount,
      });
    }

    /* -----------------------------------------------------
       Total
    ----------------------------------------------------- */

    const calculatedTotal =
      taxableAmount +
      cgstAmount +
      sgstAmount +
      igstAmount;

    const finalRoundOff =
      Number(roundOff || 0);

    const totalAmount =
      calculatedTotal +
      finalRoundOff;

    /* -----------------------------------------------------
       Create Sale Return
    ----------------------------------------------------- */

    const saleReturn =
      await SaleReturn.create({
        company: companyId,
        branch: branchId || null,
        financialYear: financialYearId,
        originalSale: originalSaleId,
        account: accountId,
        customer: customerId,
        returnNumber,
        returnDate: selectedReturnDate,
        taxType: originalSale.taxType,
        items: processedItems,
        productAmount,
        discountAmount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        roundOff: finalRoundOff,
        returnAmount: totalAmount,
        totalAmount,
        refundMode,
        refundAccount:
          refundAccountId || null,
        narration,
        isActive: true,
      });

    /* -----------------------------------------------------
       Increase Stock
    ----------------------------------------------------- */

    for (const item of processedItems) {
      const stock =
        await Stock.findOne({
          company: companyId,
          branch: branchId || null,
          financialYear: financialYearId,
          product: item.product,
        });

      if (stock) {
        stock.quantity +=
          Number(item.quantity || 0);

        stock.lastTransactionType =
          "sale_return";

        stock.lastTransaction = null;

        await stock.save();
      } else {
        await Stock.create({
          company: companyId,
          branch: branchId || null,
          financialYear: financialYearId,
          product: item.product,
          quantity: Number(
            item.quantity || 0
          ),
          lastTransactionType:
            "sale_return",
          lastTransaction: null,
        });
      }
    }

    /* -----------------------------------------------------
       Populate
    ----------------------------------------------------- */

    const populatedSaleReturn =
      await SaleReturn.findById(
        saleReturn._id
      )
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate("originalSale")
        .populate("account")
        .populate("customer")
        .populate("refundAccount")
        .populate("items.product");

    return res.status(201).json({
      success: true,
      message:
        "Sale return created successfully",
      data: populatedSaleReturn,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET SALE RETURNS
========================================================= */

const getSaleReturns = async (
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
      page = 1,
      limit = 50,
      search,
    } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const filter = {
      company: companyId,
      isActive: true,
    };

    if (branchId) {
      filter.branch = branchId;
    }

    if (financialYearId) {
      filter.financialYear =
        financialYearId;
    }

    if (customerId) {
      filter.customer = customerId;
    }

    if (search) {
      filter.returnNumber = {
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

    const [
      saleReturns,
      total,
    ] = await Promise.all([
      SaleReturn.find(filter)
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate("originalSale")
        .populate("account")
        .populate("customer")
        .populate("refundAccount")
        .populate("items.product")
        .sort({
          returnDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      SaleReturn.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: saleReturns,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages:
          Math.ceil(
            total / limitNumber
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET SALE RETURN BY ID
========================================================= */

const getSaleReturnById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale return id",
      });
    }

    const saleReturn =
      await SaleReturn.findById(id)
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate("originalSale")
        .populate("account")
        .populate("customer")
        .populate("refundAccount")
        .populate("items.product");

    if (!saleReturn) {
      return res.status(404).json({
        success: false,
        message:
          "Sale return not found",
      });
    }

    const companyId =
      saleReturn.company?._id ||
      saleReturn.company;

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

    return res.status(200).json({
      success: true,
      data: saleReturn,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SALE RETURN PDF
========================================================= */

const getSaleReturnPdf = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale return id",
      });
    }

    const saleReturn =
      await SaleReturn.findById(id)
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate("originalSale")
        .populate("account")
        .populate("customer")
        .populate("refundAccount")
        .populate("items.product");

    if (!saleReturn) {
      return res.status(404).json({
        success: false,
        message:
          "Sale return not found",
      });
    }

    const companyId =
      saleReturn.company?._id ||
      saleReturn.company;

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

    const returnNumber =
      String(
        saleReturn.returnNumber || id
      ).replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="sale-return-${returnNumber}.pdf"`
    );

    return generateSaleReturnPdf(
      saleReturn,
      res
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE SALE RETURN
========================================================= */

const deleteSaleReturn = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale return id",
      });
    }

    const saleReturn =
      await SaleReturn.findById(id);

    if (!saleReturn) {
      return res.status(404).json({
        success: false,
        message:
          "Sale return not found",
      });
    }

    const company =
      await Company.findOne({
        _id: saleReturn.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied",
      });
    }

    /* -----------------------------------------------------
       Restore Stock
    ----------------------------------------------------- */

    for (const item of saleReturn.items) {
      const stock =
        await Stock.findOne({
          company: saleReturn.company,
          branch:
            saleReturn.branch || null,
          financialYear:
            saleReturn.financialYear,
          product: item.product,
        });

      if (stock) {
        stock.quantity -=
          Number(item.quantity || 0);

        if (stock.quantity < 0) {
          stock.quantity = 0;
        }

        stock.lastTransactionType =
          "sale";

        stock.lastTransaction = null;

        await stock.save();
      }
    }

    await SaleReturn.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Sale return deleted and stock restored successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSaleReturn,
  getSaleReturns,
  getSaleReturnById,
  getSaleReturnPdf,
  deleteSaleReturn,
};