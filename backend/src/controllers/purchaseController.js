const mongoose = require("mongoose");

const Purchase = require("../models/Purchase");
const Stock = require("../models/Stock");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const {
  purchaseCreateSchema,
} = require("../validators/purchaseValidator");

const {
  generatePurchaseInvoicePdf,
} = require("../templates/purchase/purchaseInvoicePdf");

const round2 = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

// ======================================================
// Create Purchase
// ======================================================

const createPurchase = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      purchaseCreateSchema.parse(
        req.body
      );

    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      supplierId,
      invoiceNumber,
      invoiceDate,
      invoiceType,
      items,
      transportAmount,
      labourAmount,
      roundOff,
      paymentMode,
      paymentAccountId,
      paymentAmount,
      narration,
      termsAndConditions,
    } = validatedData;

    // Validate ObjectIds
    const ids = [
      {
        name: "companyId",
        value: companyId,
      },
      {
        name: "financialYearId",
        value: financialYearId,
      },
      {
        name: "accountId",
        value: accountId,
      },
    ];

    if (branchId) {
      ids.push({
        name: "branchId",
        value: branchId,
      });
    }

    if (supplierId) {
      ids.push({
        name: "supplierId",
        value: supplierId,
      });
    }

    if (paymentAccountId) {
      ids.push({
        name: "paymentAccountId",
        value: paymentAccountId,
      });
    }

    for (const item of ids) {
      if (
        !mongoose.Types.ObjectId.isValid(
          item.value
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${item.name}`,
        });
      }
    }

    // Check company ownership
    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check branch
    if (branchId) {
      const branch =
        await Branch.findOne({
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

    // Check Financial Year
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

    const purchaseDate =
      new Date(invoiceDate);

    if (
      Number.isNaN(
        purchaseDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid invoice date",
      });
    }

    // Financial year validation
    if (
      financialYear.startDate &&
      financialYear.endDate
    ) {
      const startDate =
        new Date(
          financialYear.startDate
        );

      const endDate =
        new Date(
          financialYear.endDate
        );

      if (
        purchaseDate < startDate ||
        purchaseDate > endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Change the Financial Year",
        });
      }
    }

    // Check duplicate invoice number
    const existingPurchase =
      await Purchase.findOne({
        company: companyId,
        financialYear:
          financialYearId,
        invoiceNumber:
          invoiceNumber.toUpperCase(),
      });

    if (existingPurchase) {
      return res.status(409).json({
        success: false,
        message:
          "Purchase invoice number already exists",
      });
    }

    // Check Supplier
    let supplier = null;

    if (supplierId) {
      supplier =
        await Supplier.findOne({
          _id: supplierId,
          company: companyId,
        });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Supplier not found for this company",
        });
      }
    }

    // Check supplier account
    const account =
      await Account.findOne({
        _id: accountId,
        company: companyId,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          "Supplier account not found",
      });
    }

    // Check payment account
    let paymentAccount = null;

    if (paymentAccountId) {
      paymentAccount =
        await Account.findOne({
          _id: paymentAccountId,
          company: companyId,
        });

      if (!paymentAccount) {
        return res.status(404).json({
          success: false,
          message:
            "Payment account not found",
        });
      }
    }

    // Payment validation
    if (
      paymentMode !== "credit" &&
      paymentAmount > 0 &&
      !paymentAccountId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment account is required for cash, bank or online payment",
      });
    }

    // Build purchase items
    const purchaseItems = [];

    let productAmount = 0;
    let totalDiscountAmount = 0;
    let taxableAmount = 0;

    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalIgstAmount = 0;

    for (const item of items) {
      if (
        !mongoose.Types.ObjectId.isValid(
          item.productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const product =
        await Product.findOne({
          _id: item.productId,
          company: companyId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found for this company",
        });
      }

      const quantity =
        Number(item.quantity);

      const rate =
        Number(item.rate);

      const discountPercent =
        Number(
          item.discountPercent || 0
        );

      const gstRate =
        item.gstRate !== undefined
          ? Number(item.gstRate)
          : Number(
              product.gstRate || 0
            );

      const amount = round2(
        quantity * rate
      );

      const discountAmount =
        round2(
          (amount *
            discountPercent) /
            100
        );

      const itemTaxableAmount =
        round2(
          amount -
            discountAmount
        );

      const cgstPercent =
        round2(gstRate / 2);

      const sgstPercent =
        round2(gstRate / 2);

      const cgstAmount =
        round2(
          (itemTaxableAmount *
            cgstPercent) /
            100
        );

      const sgstAmount =
        round2(
          (itemTaxableAmount *
            sgstPercent) /
            100
        );

      const igstPercent = 0;

      const igstAmount = 0;

      const itemInvoiceAmount =
        round2(
          itemTaxableAmount +
            cgstAmount +
            sgstAmount +
            igstAmount
        );

      purchaseItems.push({
        product: product._id,

        productName:
          product.name ||
          "Product",

        description:
          item.description ||
          product.description ||
          "",

        hsnSac:
          product.hsnSac ||
          product.hsnCode ||
          "",

        uom:
          product.uom ||
          product.unit ||
          "",

        quantity,

        rate,

        amount,

        discountPercent,

        discountAmount,

        taxableAmount:
          itemTaxableAmount,

        gstRate,

        cgstPercent,

        cgstAmount,

        sgstPercent,

        sgstAmount,

        igstPercent,

        igstAmount,

        invoiceAmount:
          itemInvoiceAmount,
      });

      productAmount += amount;

      totalDiscountAmount +=
        discountAmount;

      taxableAmount +=
        itemTaxableAmount;

      totalCgstAmount +=
        cgstAmount;

      totalSgstAmount +=
        sgstAmount;

      totalIgstAmount +=
        igstAmount;
    }

    productAmount =
      round2(productAmount);

    totalDiscountAmount =
      round2(totalDiscountAmount);

    taxableAmount =
      round2(taxableAmount);

    totalCgstAmount =
      round2(totalCgstAmount);

    totalSgstAmount =
      round2(totalSgstAmount);

    totalIgstAmount =
      round2(totalIgstAmount);

    const invoiceAmount =
      round2(
        taxableAmount +
          totalCgstAmount +
          totalSgstAmount +
          totalIgstAmount
      );

    const totalBeforeRoundOff =
      round2(
        invoiceAmount +
          transportAmount +
          labourAmount
      );

    const calculatedTotal =
      round2(
        totalBeforeRoundOff +
          roundOff
      );

    const paidAmount =
      round2(
        Math.min(
          paymentAmount,
          calculatedTotal
        )
      );

    const remainingAmount =
      round2(
        calculatedTotal -
          paidAmount
      );

    // Create Purchase
    const purchase =
      await Purchase.create({
        company: companyId,

        branch:
          branchId || null,

        financialYear:
          financialYearId,

        account: accountId,

        supplier:
          supplierId || null,

        invoiceNumber:
          invoiceNumber.toUpperCase(),

        invoiceDate:
          purchaseDate,

        invoiceType,

        items: purchaseItems,

        productAmount,

        discountAmount:
          totalDiscountAmount,

        taxableAmount,

        cgstAmount:
          totalCgstAmount,

        sgstAmount:
          totalSgstAmount,

        igstAmount:
          totalIgstAmount,

        transportAmount,

        labourAmount,

        invoiceAmount,

        roundOff,

        totalAmount:
          calculatedTotal,

        paymentMode,

        paymentAccount:
          paymentAccountId ||
          null,

        paymentAmount,

        paidAmount,

        remainingAmount,

        narration,

        termsAndConditions,
      });

    // Increase stock
    for (const item of purchaseItems) {
      let stock =
        await Stock.findOne({
          company: companyId,

          branch:
            branchId || null,

          financialYear:
            financialYearId,

          product: item.product,
        });

      if (!stock) {
        stock =
          await Stock.create({
            company: companyId,

            branch:
              branchId || null,

            financialYear:
              financialYearId,

            product: item.product,

            quantity: 0,

            lastTransactionType:
              "opening",
          });
      }

      stock.quantity =
        round2(
          Number(
            stock.quantity || 0
          ) +
            item.quantity
        );

      stock.lastTransactionType =
        "purchase";

      /*
       * Stock model from Step 9 uses
       * lastTransaction as a Sale ref.
       * We keep it null for Purchase
       * because this field is currently
       * designed for Sale.
       */
      stock.lastTransaction =
        null;

      await stock.save();
    }

    const populatedPurchase =
      await Purchase.findById(
        purchase._id
      )
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "supplier",
          "name phone email"
        )
        .populate(
          "items.product",
          "name"
        )
        .populate(
          "paymentAccount",
          "name accountType"
        );

    res.status(201).json({
      success: true,
      message:
        "Purchase invoice created successfully",
      purchase:
        populatedPurchase,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Purchase invoice number already exists",
      });
    }

    next(error);
  }
};

// ======================================================
// Get all Purchases
// ======================================================

const getPurchases = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId query parameter is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        companyId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid company ID",
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
          "Company not found",
      });
    }

    const filter = {
      company: companyId,
      isActive: true,
    };

    if (branchId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          branchId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid branch ID",
        });
      }

      filter.branch = branchId;
    }

    if (financialYearId) {
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

      filter.financialYear =
        financialYearId;
    }

    if (fromDate || toDate) {
      filter.invoiceDate = {};

      if (fromDate) {
        filter.invoiceDate.$gte =
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

        filter.invoiceDate.$lte =
          endDate;
      }

      if (
        fromDate &&
        toDate &&
        new Date(fromDate) >
          new Date(toDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "From date cannot be greater than To date",
        });
      }
    }

    if (search) {
      filter.$or = [
        {
          invoiceNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          narration: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const pageNumber =
      Math.max(
        Number(page),
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit),
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      purchases,
      total,
    ] = await Promise.all([
      Purchase.find(filter)
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "supplier",
          "name phone"
        )
        .sort({
          invoiceDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Purchase.countDocuments(
        filter
      ),
    ]);

    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(
        total / limitNumber
      ),
      purchases,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get single Purchase
// ======================================================

const getPurchaseById = async (
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
          "Invalid purchase ID",
      });
    }

    const purchase =
      await Purchase.findById(
        id
      )
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "supplier",
          "name phone email address"
        )
        .populate(
          "items.product",
          "name"
        )
        .populate(
          "paymentAccount",
          "name accountType"
        );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found",
      });
    }

    const company =
      await Company.findOne({
        _id: purchase.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this purchase",
      });
    }

    res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Purchase PDF
// ======================================================

const getPurchaseInvoicePdf = async (
  req,
  res,
  next
) => {
  try {
    const { id } =
      req.params;

    // Validate Purchase ID
    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase ID",
      });
    }

    /*
     * Get Purchase with all required
     * information for PDF.
     */
    const purchase =
      await Purchase.findById(
        id
      )
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "supplier",
          "name phone email address city state pincode gstNumber"
        )
        .populate(
          "branch",
          "branchName address city state pincode mobile phone email gstNumber"
        )
        .populate(
          "items.product",
          "name description hsnSac hsnCode unit uom gstRate"
        )
        .populate(
          "paymentAccount",
          "name accountType bankName accountNumber ifscCode address"
        );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found",
      });
    }

    // Check company ownership
    const company =
      await Company.findOne({
        _id: purchase.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this purchase",
      });
    }

    /*
     * --------------------------------------------------
     * Find Bank Account
     * --------------------------------------------------
     *
     * Priority:
     *
     * 1. Purchase payment account
     *    if it is a bank account.
     *
     * 2. First active bank account
     *    of the company.
     */

    let bankAccount = null;

    if (
      purchase.paymentAccount &&
      purchase.paymentAccount.accountType ===
        "bank"
    ) {
      bankAccount =
        purchase.paymentAccount;
    } else {
      bankAccount =
        await Account.findOne({
          company:
            purchase.company,

          accountType:
            "bank",

          isActive:
            true,
        }).select(
          "name accountType bankName accountNumber ifscCode address"
        );
    }

    /*
     * Convert Mongoose document
     * into normal JavaScript object.
     */
    const pdfPurchase =
      purchase.toObject();

    /*
     * Add Company information.
     */
    pdfPurchase.company =
      company.toObject();

    /*
     * Add Bank information.
     */
    pdfPurchase.bankAccount =
      bankAccount
        ? bankAccount.toObject()
        : null;

    /*
     * PDF Response Headers
     */
    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${purchase.invoiceNumber || "purchase-invoice"}.pdf"`
    );

    /*
     * Generate PDF
     */
    generatePurchaseInvoicePdf(
      pdfPurchase,
      res
    );
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Purchase
// ======================================================

const deletePurchase = async (
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
          "Invalid purchase ID",
      });
    }

    const purchase =
      await Purchase.findById(
        id
      );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found",
      });
    }

    const company =
      await Company.findOne({
        _id: purchase.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this purchase",
      });
    }

    // Reduce stock back
    for (const item of purchase.items) {
      const stock =
        await Stock.findOne({
          company:
            purchase.company,

          branch:
            purchase.branch ||
            null,

          financialYear:
            purchase.financialYear,

          product: item.product,
        });

      if (stock) {
        const newQuantity =
          round2(
            Number(
              stock.quantity || 0
            ) -
              item.quantity
          );

        if (newQuantity < 0) {
          return res.status(400).json({
            success: false,
            message:
              `Cannot delete purchase because stock for ${item.productName} would become negative`,
          });
        }

        stock.quantity =
          newQuantity;

        stock.lastTransactionType =
          "purchase_return";

        stock.lastTransaction =
          null;

        await stock.save();
      }
    }

    await Purchase.findByIdAndDelete(
      id
    );

    res.status(200).json({
      success: true,
      message:
        "Purchase deleted and stock adjusted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Exports
// ======================================================

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getPurchaseInvoicePdf,
  deletePurchase,
};