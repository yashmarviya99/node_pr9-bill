const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Stock = require("../models/Stock");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");
const Challan = require("../models/Challan");

const {
  generateSaleInvoicePdf,
} = require("../templates/sale/saleInvoicePdf");

const {
  saleCreateSchema,
} = require("../validators/saleValidator");

const round2 = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

// Generate invoice number
const generateInvoiceNumber = async (
  companyId,
  financialYearId
) => {
  const lastSale = await Sale.findOne({
    company: companyId,
    financialYear: financialYearId,
  }).sort({
    createdAt: -1,
  }).select("invoiceNumber");

  let nextNumber = 1;

  if (
    lastSale &&
    lastSale.invoiceNumber
  ) {
    const match =
      lastSale.invoiceNumber.match(
        /(\d+)$/
      );

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  return `SALE-${String(nextNumber).padStart(
    5,
    "0"
  )}`;
};

// Create Sale
const createSale = async (
  req,
  res,
  next
) => {
  try {
    const validatedData =
      saleCreateSchema.parse(req.body);

    const {
      companyId,
      branchId,
      financialYearId,
      accountId,
      customerId,
      challanId,
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

    // Validate IDs
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

    if (customerId) {
      ids.push({
        name: "customerId",
        value: customerId,
      });
    }

    if (challanId) {
      ids.push({
        name: "challanId",
        value: challanId,
      });
    }

    if (paymentAccountId) {
      ids.push({
        name: "paymentAccountId",
        value: paymentAccountId,
      });
    }

    for (const idItem of ids) {
      if (
        !mongoose.Types.ObjectId.isValid(
          idItem.value
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${idItem.name}`,
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

    // Check financial year
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

    const saleDate =
      new Date(invoiceDate);

    if (
      Number.isNaN(
        saleDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid invoice date",
      });
    }

    // Financial year date validation
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
        saleDate < startDate ||
        saleDate > endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invoice date must belong to the selected financial year",
        });
      }
    }

    // Check account
    const account =
      await Account.findOne({
        _id: accountId,
        company: companyId,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          "Account not found for this company",
      });
    }

    // Check customer
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
          message:
            "Customer not found for this company",
        });
      }
    }

    // Check challan
    let challan = null;

    if (challanId) {
      challan =
        await Challan.findOne({
          _id: challanId,
          company: companyId,
          isActive: true,
        });

      if (!challan) {
        return res.status(404).json({
          success: false,
          message:
            "Challan not found for this company",
        });
      }

      // One Challan -> One Sale
      const existingSale =
        await Sale.findOne({
          challan: challanId,
          isActive: true,
        });

      if (existingSale) {
        return res.status(409).json({
          success: false,
          message:
            "This challan has already been converted into a sale",
        });
      }
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

    // Build sale items
    const saleItems = [];

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

      const amount =
        round2(
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
        gstRate / 2;

      const sgstPercent =
        gstRate / 2;

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

      saleItems.push({
        product:
          product._id,

        productName:
          product.name,

        description:
          item.description ||
          product.description ||
          "",

        hsnSac:
          product.hsnSac || "",

        uom:
          product.unit || "",

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
          totalIgstAmount +
          Number(
            transportAmount || 0
          ) +
          Number(
            labourAmount || 0
          )
      );

    const calculatedTotal =
      round2(
        invoiceAmount +
          Number(roundOff || 0)
      );

    const paidAmount =
      round2(
        Number(
          paymentAmount || 0
        )
      );

    const remainingAmount =
      round2(
        Math.max(
          calculatedTotal -
            paidAmount,
          0
        )
      );

    const invoiceNumber =
      await generateInvoiceNumber(
        companyId,
        financialYearId
      );

    const sale =
      await Sale.create({
        company:
          companyId,

        branch:
          branchId || null,

        financialYear:
          financialYearId,

        account:
          accountId,

        customer:
          customerId || null,

        challan:
          challanId || null,

        invoiceNumber,

        invoiceDate:

          saleDate,

        invoiceType:
          invoiceType || "sale",

        items:
          saleItems,

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

    /*
     * =====================================================
     * STOCK MOVEMENT
     * =====================================================
     *
     * Normal Sale:
     *   Stock decreases.
     *
     * Challan Sale:
     *   NO stock movement.
     *
     * Because Challan already decreased stock.
     */
    if (!challanId) {
      for (const item of saleItems) {
        let stock =
          await Stock.findOne({
            company: companyId,
            branch:
              branchId || null,
            financialYear:
              financialYearId,
            product:
              item.product,
          });

        if (!stock) {
          const product =
            await Product.findById(
              item.product
            );

          stock =
            await Stock.create({
              company: companyId,
              branch:
                branchId || null,
              financialYear:
                financialYearId,
              product:
                item.product,
              quantity: Number(
                product.openingStock ||
                  0
              ),
              lastTransactionType:
                "opening",
            });
        }

        stock.quantity =
          round2(
            stock.quantity -
              item.quantity
          );

        stock.lastTransactionType =
          "sale";

        stock.lastTransaction =
          sale._id;

        await stock.save();
      }
    }

    const populatedSale =
      await Sale.findById(
        sale._id
      )
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "customer",
          "name phone email"
        )
        .populate(
          "challan",
          "challanNumber challanDate"
        )
        .populate(
          "items.product",
          "name"
        )
        .populate(
          "paymentAccount",
          "name accountType bankName accountNumber ifscCode address"
        );

    res.status(201).json({
      success: true,
      message:
        challanId
          ? "Sale created from challan successfully. Stock was not decreased again."
          : "Sale invoice created successfully",
      sale:
        populatedSale,
    });
  } catch (error) {
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Invoice number already exists",
      });
    }

    next(error);
  }
};

// Get all sales
const getSales = async (
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
      company:
        companyId,
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

      filter.branch =
        branchId;
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

    if (fromDate) {
      const start =
        new Date(fromDate);

      if (
        Number.isNaN(
          start.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid from date",
        });
      }

      filter.invoiceDate =
        filter.invoiceDate || {};

      filter.invoiceDate.$gte =
        start;
    }

    if (toDate) {
      const end =
        new Date(toDate);

      if (
        Number.isNaN(
          end.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid to date",
        });
      }

      end.setHours(
        23,
        59,
        59,
        999
      );

      filter.invoiceDate =
        filter.invoiceDate || {};

      filter.invoiceDate.$lte =
        end;
    }

    if (
      fromDate &&
      toDate
    ) {
      const start =
        new Date(fromDate);

      const end =
        new Date(toDate);

      if (start > end) {
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
            $regex:
              search,
            $options:
              "i",
          },
        },
        {
          narration: {
            $regex:
              search,
            $options:
              "i",
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
      sales,
      total,
    ] =
      await Promise.all([
        Sale.find(filter)
          .populate(
            "account",
            "name accountType"
          )
          .populate(
            "customer",
            "name phone"
          )
          .sort({
            invoiceDate:
              -1,
            createdAt:
              -1,
          })
          .skip(skip)
          .limit(
            limitNumber
          ),

        Sale.countDocuments(
          filter
        ),
      ]);

    res.status(200).json({
      success: true,
      count:
        sales.length,
      total,
      page:
        pageNumber,
      limit:
        limitNumber,
      totalPages:
        Math.ceil(
          total /
            limitNumber
        ),
      sales,
    });
  } catch (error) {
    next(error);
  }
};

// Get single sale
const getSaleById = async (
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
          "Invalid sale ID",
      });
    }

    const sale =
      await Sale.findById(id)
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "customer",
          "name phone email address"
        )
        .populate(
          "challan",
          "challanNumber challanDate"
        )
        .populate(
          "items.product",
          "name"
        )
        .populate(
          "paymentAccount",
          "name accountType bankName accountNumber ifscCode address"
        );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found",
      });
    }

    const company =
      await Company.findOne({
        _id: sale.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this sale",
      });
    }

    res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    next(error);
  }
};

// Generate sale invoice PDF
const getSaleInvoicePdf = async (
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
          "Invalid sale ID",
      });
    }

    const sale =
      await Sale.findById(id)
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "customer",
          "name phone email address state gstNumber"
        )
        .populate(
          "branch",
          "branchName"
        )
        .populate(
          "items.product",
          "name description hsnSac unit gstRate"
        )
        .populate(
          "paymentAccount",
          "name accountType bankName accountNumber ifscCode address"
        );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found",
      });
    }

    const company =
      await Company.findOne({
        _id: sale.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this sale",
      });
    }

    /*
     * Bank details are stored in Account,
     * not in Company.
     *
     * Priority:
     * 1. Sale paymentAccount if it is a bank account
     * 2. First active bank account of the company
     */
    let bankAccount = null;

    if (
      sale.paymentAccount &&
      sale.paymentAccount.accountType ===
        "bank"
    ) {
      bankAccount =
        sale.paymentAccount;
    } else {
      bankAccount =
        await Account.findOne({
          company:
            sale.company,
          accountType:
            "bank",
          isActive:
            true,
        }).select(
          "name accountType bankName accountNumber ifscCode address"
        );
    }

    const pdfSale =
      sale.toObject();

    pdfSale.company =
      company.toObject();

    pdfSale.bankAccount =
      bankAccount
        ? bankAccount.toObject
          ? bankAccount.toObject()
          : bankAccount
        : null;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sale.invoiceNumber || "sale-invoice"}.pdf"`
    );

    generateSaleInvoicePdf(
      pdfSale,
      res
    );
  } catch (error) {
    next(error);
  }
};

// Delete sale
const deleteSale = async (
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
          "Invalid sale ID",
      });
    }

    const sale =
      await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found",
      });
    }

    const company =
      await Company.findOne({
        _id: sale.company,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to delete this sale",
      });
    }

    // Restore stock
    for (const item of sale.items) {
      let stock =
        await Stock.findOne({
          company:
            sale.company,
          branch:
            sale.branch ||
            null,
          financialYear:
            sale.financialYear,
          product:
            item.product,
        });

      if (!stock) {
        stock =
          await Stock.create({
            company:
              sale.company,
            branch:
              sale.branch ||
              null,
            financialYear:
              sale.financialYear,
            product:
              item.product,
            quantity:
              0,
          });
      }

      stock.quantity =
        round2(
          stock.quantity +
            item.quantity
        );

      stock.lastTransactionType =
        "sale_return";

      stock.lastTransaction =
        null;

      await stock.save();
    }

    await Sale.findByIdAndDelete(
      id
    );

    res.status(200).json({
      success: true,
      message:
        "Sale deleted and stock restored successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  getSaleInvoicePdf,
  deleteSale,
};