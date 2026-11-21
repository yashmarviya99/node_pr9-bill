const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");

const Account = require("../models/Account");
const Product = require("../models/Product");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getEndOfDay = (value) => {
  const date = parseDate(value);

  if (!date) return null;

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

const sameId = (first, second) => {
  if (!first || !second) return false;

  return (
    first.toString() ===
    second.toString()
  );
};

const checkCompanyAccess = async (
  companyId,
  userId
) => {
  if (
    !companyId ||
    !isValidObjectId(companyId)
  ) {
    return null;
  }

  return Company.findOne({
    _id: companyId,
    owner: userId,
  });
};

const getFinancialYear = async (
  companyId,
  financialYearId
) => {
  if (financialYearId) {
    if (
      !isValidObjectId(
        financialYearId
      )
    ) {
      return null;
    }

    return FinancialYear.findOne({
      _id: financialYearId,
      company: companyId,
    });
  }

  return FinancialYear.findOne({
    company: companyId,
    isActive: true,
  }).sort({
    startDate: -1,
  });
};

const validateDateRangeAgainstFinancialYear = (
  fromDate,
  toDate,
  financialYear
) => {
  if (!financialYear) {
    return null;
  }

  const startDate =
    financialYear.startDate
      ? new Date(financialYear.startDate)
      : null;

  const endDate =
    financialYear.endDate
      ? new Date(financialYear.endDate)
      : null;

  if (
    fromDate &&
    startDate &&
    fromDate < startDate
  ) {
    return "From date is outside the selected financial year";
  }

  if (
    toDate &&
    endDate &&
    toDate > endDate
  ) {
    return "To date is outside the selected financial year";
  }

  return null;
};

/* =========================================================
   SALES REPORT
========================================================= */

const buildSaleFilter = ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
  accountId,
  productId,
  search,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  if (accountId) {
    filter.account = accountId;
  }

  if (fromDate || toDate) {
    filter.invoiceDate = {};

    if (fromDate) {
      filter.invoiceDate.$gte =
        fromDate;
    }

    if (toDate) {
      filter.invoiceDate.$lte =
        toDate;
    }
  }

  if (productId) {
    filter["items.product"] =
      productId;
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

  return filter;
};

const buildSaleReturnFilter = ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
  accountId,
  productId,
  search,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  if (accountId) {
    filter.account = accountId;
  }

  if (fromDate || toDate) {
    filter.returnDate = {};

    if (fromDate) {
      filter.returnDate.$gte =
        fromDate;
    }

    if (toDate) {
      filter.returnDate.$lte =
        toDate;
    }
  }

  if (productId) {
    filter["items.product"] =
      productId;
  }

  if (search) {
    filter.$or = [
      {
        returnNumber: {
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

  return filter;
};

const calculateSaleQuantity = (
  sale
) => {
  return round2(
    (sale.items || []).reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    )
  );
};

const calculateSaleReturnQuantity = (
  saleReturn
) => {
  return round2(
    (saleReturn.items || []).reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    )
  );
};

const getSalePayment = (
  sale
) => {
  return round2(
    sale.paidAmount ??
      sale.paymentAmount ??
      0
  );
};

const getSaleRemaining = (
  sale
) => {
  if (
    sale.remainingAmount !==
    undefined
  ) {
    return round2(
      sale.remainingAmount
    );
  }

  return round2(
    Number(sale.totalAmount || 0) -
      getSalePayment(sale)
  );
};

const getSaleReturnAmount = (
  saleReturn
) => {
  return round2(
    saleReturn.totalAmount ??
      saleReturn.returnAmount ??
      0
  );
};

const normalizeProductId = (
  product
) => {
  const rawProductId =
    product?._id || product;

  return rawProductId
    ? rawProductId.toString()
    : null;
};

const buildProductSummary = (
  sales,
  saleReturns
) => {
  const productMap =
    new Map();

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const productId =
        normalizeProductId(
          item.product
        );

      const key =
        productId ||
        `name:${item.productName}`;

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId:
            productId || null,
          productName:
            item.productName ||
            "Product",
          quantity: 0,
          sellingAmount: 0,
          saleReturnQuantity: 0,
          saleReturnAmount: 0,
          netQuantity: 0,
          netAmount: 0,
        });
      }

      const row =
        productMap.get(key);

      row.quantity = round2(
        row.quantity +
          Number(item.quantity || 0)
      );

      row.sellingAmount =
        round2(
          row.sellingAmount +
            Number(
              item.invoiceAmount ??
                item.taxableAmount ??
                item.amount ??
                0
            )
        );

      row.netQuantity =
        round2(
          row.quantity -
            row.saleReturnQuantity
        );

      row.netAmount =
        round2(
          row.sellingAmount -
            row.saleReturnAmount
        );
    }
  }

  for (const saleReturn of saleReturns) {
    for (const item of saleReturn.items || []) {
      const productId =
        normalizeProductId(
          item.product
        );

      const key =
        productId ||
        `name:${item.productName}`;

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId:
            productId || null,
          productName:
            item.productName ||
            "Product",
          quantity: 0,
          sellingAmount: 0,
          saleReturnQuantity: 0,
          saleReturnAmount: 0,
          netQuantity: 0,
          netAmount: 0,
        });
      }

      const row =
        productMap.get(key);

      row.saleReturnQuantity =
        round2(
          row.saleReturnQuantity +
            Number(item.quantity || 0)
        );

      row.saleReturnAmount =
        round2(
          row.saleReturnAmount +
            Number(
              item.returnAmount ??
                item.amount ??
                0
            )
        );

      row.netQuantity =
        round2(
          row.quantity -
            row.saleReturnQuantity
        );

      row.netAmount =
        round2(
          row.sellingAmount -
            row.saleReturnAmount
        );
    }
  }

  return Array.from(
    productMap.values()
  );
};

const getSalesReport = async (
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
      accountId,
      productId,
      search = "",
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
      !isValidObjectId(
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
      await checkCompanyAccess(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found",
      });
    }

    if (
      branchId &&
      !isValidObjectId(branchId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid branch ID",
      });
    }

    if (
      accountId &&
      !isValidObjectId(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid account ID",
      });
    }

    if (
      productId &&
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid product ID",
      });
    }

    const financialYear =
      await getFinancialYear(
        companyId,
        financialYearId
      );

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message:
          "Financial year not found",
      });
    }

    const parsedFromDate =
      parseDate(fromDate);

    const parsedToDate =
      getEndOfDay(toDate);

    if (
      fromDate &&
      !parsedFromDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fromDate",
      });
    }

    if (
      toDate &&
      !parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid toDate",
      });
    }

    if (
      parsedFromDate &&
      parsedToDate &&
      parsedFromDate >
        parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "From date cannot be greater than To date",
      });
    }

    const dateRangeError =
      validateDateRangeAgainstFinancialYear(
        parsedFromDate,
        parsedToDate,
        financialYear
      );

    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message:
          dateRangeError,
      });
    }

    const saleFilter =
      buildSaleFilter({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        fromDate:
          parsedFromDate,
        toDate:
          parsedToDate,
        accountId,
        productId,
        search: search.trim(),
      });

    const saleReturnFilter =
      buildSaleReturnFilter({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        fromDate:
          parsedFromDate,
        toDate:
          parsedToDate,
        accountId,
        productId,
        search: search.trim(),
      });

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      sales,
      saleReturns,
    ] = await Promise.all([
      Sale.find(saleFilter)
        .populate(
          "account",
          "name accountType"
        )
        .populate(
          "customer",
          "name phone email"
        )
        .populate(
          "items.product",
          "name"
        )
        .populate(
          "paymentAccount",
          "name accountType"
        )
        .sort({
          invoiceDate: -1,
          createdAt: -1,
        }),

      SaleReturn.find(
        saleReturnFilter
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
          "items.product",
          "name"
        )
        .populate(
          "refundAccount",
          "name accountType"
        )
        .sort({
          returnDate: -1,
          createdAt: -1,
        }),
    ]);

    const total =
      sales.length;

    const paginatedSales =
      sales.slice(
        skip,
        skip + limitNumber
      );

    const summary = {
      totalInvoices:
        sales.length,

      totalQuantity:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              calculateSaleQuantity(
                sale
              ),
            0
          )
        ),

      grossSales:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.totalAmount || 0
              ),
            0
          )
        ),

      totalDiscount:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.discountAmount || 0
              ),
            0
          )
        ),

      totalTaxable:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.taxableAmount || 0
              ),
            0
          )
        ),

      totalCGST:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.cgstAmount || 0
              ),
            0
          )
        ),

      totalSGST:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.sgstAmount || 0
              ),
            0
          )
        ),

      totalIGST:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.igstAmount || 0
              ),
            0
          )
        ),

      totalTransport:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.transportAmount || 0
              ),
            0
          )
        ),

      totalLabour:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.labourAmount || 0
              ),
            0
          )
        ),

      totalRoundOff:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              Number(
                sale.roundOff || 0
              ),
            0
          )
        ),

      totalPaid:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              getSalePayment(sale),
            0
          )
        ),

      totalRemaining:
        round2(
          sales.reduce(
            (sum, sale) =>
              sum +
              getSaleRemaining(sale),
            0
          )
        ),

      totalSaleReturns:
        round2(
          saleReturns.reduce(
            (sum, item) =>
              sum +
              getSaleReturnAmount(
                item
              ),
            0
          )
        ),

      totalSaleReturnQuantity:
        round2(
          saleReturns.reduce(
            (sum, item) =>
              sum +
              calculateSaleReturnQuantity(
                item
              ),
            0
          )
        ),

      totalRefund:
        round2(
          saleReturns.reduce(
            (sum, item) =>
              sum +
              Number(
                item.refundAmount || 0
              ),
            0
          )
        ),
    };

    summary.netSales =
      round2(
        summary.grossSales -
          summary.totalSaleReturns
      );

    summary.netQuantity =
      round2(
        summary.totalQuantity -
          summary.totalSaleReturnQuantity
      );

    const productSummary =
      buildProductSummary(
        sales,
        saleReturns
      );

    return res.status(200).json({
      success: true,
      message:
        "Sales report fetched successfully",

      filters: {
        companyId,
        branchId:
          branchId || null,
        financialYearId:
          financialYear._id,
        financialYear:
          financialYear.name ||
          financialYear.year ||
          "",
        fromDate:
          fromDate || null,
        toDate:
          toDate || null,
        accountId:
          accountId || null,
        productId:
          productId || null,
        search:
          search.trim(),
      },

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

      summary,

      sales:
        paginatedSales,

      saleReturns,

      productSummary,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PURCHASE REPORT
========================================================= */

const buildPurchaseFilter = ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
  accountId,
  productId,
  search,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  if (accountId) {
    filter.account = accountId;
  }

  if (fromDate || toDate) {
    filter.invoiceDate = {};

    if (fromDate) {
      filter.invoiceDate.$gte =
        fromDate;
    }

    if (toDate) {
      filter.invoiceDate.$lte =
        toDate;
    }
  }

  if (productId) {
    filter["items.product"] =
      productId;
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

  return filter;
};

const buildPurchaseReturnFilter = ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
  accountId,
  productId,
  search,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  if (accountId) {
    filter.account = accountId;
  }

  if (fromDate || toDate) {
    filter.returnDate = {};

    if (fromDate) {
      filter.returnDate.$gte =
        fromDate;
    }

    if (toDate) {
      filter.returnDate.$lte =
        toDate;
    }
  }

  if (productId) {
    filter["items.product"] =
      productId;
  }

  if (search) {
    filter.$or = [
      {
        returnNumber: {
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

  return filter;
};

const calculatePurchaseQuantity = (
  purchase
) => {
  return round2(
    (purchase.items || []).reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    )
  );
};

const calculatePurchaseReturnQuantity = (
  purchaseReturn
) => {
  return round2(
    (purchaseReturn.items || []).reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    )
  );
};

const getPurchasePayment = (
  purchase
) => {
  return round2(
    purchase.paidAmount ??
      purchase.paymentAmount ??
      0
  );
};

const getPurchaseRemaining = (
  purchase
) => {
  if (
    purchase.remainingAmount !==
    undefined
  ) {
    return round2(
      purchase.remainingAmount
    );
  }

  return round2(
    Number(
      purchase.totalAmount || 0
    ) -
      getPurchasePayment(
        purchase
      )
  );
};

const getPurchaseReturnAmount = (
  purchaseReturn
) => {
  return round2(
    purchaseReturn.totalAmount ??
      purchaseReturn.returnAmount ??
      0
  );
};

const buildPurchaseProductSummary = (
  purchases,
  purchaseReturns
) => {
  const productMap =
    new Map();

  for (const purchase of purchases) {
    for (const item of purchase.items || []) {
      const productId =
        normalizeProductId(
          item.product
        );

      const key =
        productId ||
        `name:${item.productName}`;

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId:
            productId || null,

          productName:
            item.productName ||
            "Product",

          quantity: 0,

          purchaseAmount: 0,

          purchaseReturnQuantity: 0,

          purchaseReturnAmount: 0,

          netQuantity: 0,

          netAmount: 0,
        });
      }

      const row =
        productMap.get(key);

      row.quantity =
        round2(
          row.quantity +
            Number(
              item.quantity || 0
            )
        );

      row.purchaseAmount =
        round2(
          row.purchaseAmount +
            Number(
              item.invoiceAmount ??
                item.taxableAmount ??
                item.amount ??
                0
            )
        );

      row.netQuantity =
        round2(
          row.quantity -
            row.purchaseReturnQuantity
        );

      row.netAmount =
        round2(
          row.purchaseAmount -
            row.purchaseReturnAmount
        );
    }
  }

  for (const purchaseReturn of purchaseReturns) {
    for (const item of purchaseReturn.items || []) {
      const productId =
        normalizeProductId(
          item.product
        );

      const key =
        productId ||
        `name:${item.productName}`;

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId:
            productId || null,

          productName:
            item.productName ||
            "Product",

          quantity: 0,

          purchaseAmount: 0,

          purchaseReturnQuantity: 0,

          purchaseReturnAmount: 0,

          netQuantity: 0,

          netAmount: 0,
        });
      }

      const row =
        productMap.get(key);

      row.purchaseReturnQuantity =
        round2(
          row.purchaseReturnQuantity +
            Number(
              item.quantity || 0
            )
        );

      row.purchaseReturnAmount =
        round2(
          row.purchaseReturnAmount +
            Number(
              item.returnAmount ??
                item.amount ??
                0
            )
        );

      row.netQuantity =
        round2(
          row.quantity -
            row.purchaseReturnQuantity
        );

      row.netAmount =
        round2(
          row.purchaseAmount -
            row.purchaseReturnAmount
        );
    }
  }

  return Array.from(
    productMap.values()
  );
};

const getPurchaseReport = async (
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
      accountId,
      productId,
      search = "",
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
      !isValidObjectId(
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
      await checkCompanyAccess(
        companyId,
        req.user.userId
      );

    if (!company) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found",
      });
    }

    if (
      branchId &&
      !isValidObjectId(branchId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid branch ID",
      });
    }

    if (
      accountId &&
      !isValidObjectId(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid account ID",
      });
    }

    if (
      productId &&
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid product ID",
      });
    }

    const financialYear =
      await getFinancialYear(
        companyId,
        financialYearId
      );

    if (!financialYear) {
      return res.status(404).json({
        success: false,
        message:
          "Financial year not found",
      });
    }

    const parsedFromDate =
      parseDate(fromDate);

    const parsedToDate =
      getEndOfDay(toDate);

    if (
      fromDate &&
      !parsedFromDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fromDate",
      });
    }

    if (
      toDate &&
      !parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid toDate",
      });
    }

    if (
      parsedFromDate &&
      parsedToDate &&
      parsedFromDate >
        parsedToDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "From date cannot be greater than To date",
      });
    }

    const dateRangeError =
      validateDateRangeAgainstFinancialYear(
        parsedFromDate,
        parsedToDate,
        financialYear
      );

    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message:
          dateRangeError,
      });
    }

    const purchaseFilter =
      buildPurchaseFilter({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        fromDate:
          parsedFromDate,
        toDate:
          parsedToDate,
        accountId,
        productId,
        search:
          search.trim(),
      });

    const purchaseReturnFilter =
      buildPurchaseReturnFilter({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        fromDate:
          parsedFromDate,
        toDate:
          parsedToDate,
        accountId,
        productId,
        search:
          search.trim(),
      });

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [
      purchases,
      purchaseReturns,
    ] = await Promise.all([
      Purchase.find(
        purchaseFilter
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
        )
        .sort({
          invoiceDate: -1,
          createdAt: -1,
        }),

      PurchaseReturn.find(
        purchaseReturnFilter
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
          "adjustmentAccount",
          "name accountType"
        )
        .sort({
          returnDate: -1,
          createdAt: -1,
        }),
    ]);

    const total =
      purchases.length;

    const paginatedPurchases =
      purchases.slice(
        skip,
        skip + limitNumber
      );

    const summary = {
      totalInvoices:
        purchases.length,

      totalQuantity:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              calculatePurchaseQuantity(
                purchase
              ),
            0
          )
        ),

      grossPurchases:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.totalAmount || 0
              ),
            0
          )
        ),

      totalDiscount:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.discountAmount || 0
              ),
            0
          )
        ),

      totalTaxable:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.taxableAmount || 0
              ),
            0
          )
        ),

      totalCGST:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.cgstAmount || 0
              ),
            0
          )
        ),

      totalSGST:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.sgstAmount || 0
              ),
            0
          )
        ),

      totalIGST:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.igstAmount || 0
              ),
            0
          )
        ),

      totalTransport:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.transportAmount || 0
              ),
            0
          )
        ),

      totalLabour:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.labourAmount || 0
              ),
            0
          )
        ),

      totalRoundOff:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              Number(
                purchase.roundOff || 0
              ),
            0
          )
        ),

      totalPaid:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              getPurchasePayment(
                purchase
              ),
            0
          )
        ),

      totalRemaining:
        round2(
          purchases.reduce(
            (sum, purchase) =>
              sum +
              getPurchaseRemaining(
                purchase
              ),
            0
          )
        ),

      totalPurchaseReturns:
        round2(
          purchaseReturns.reduce(
            (sum, purchaseReturn) =>
              sum +
              getPurchaseReturnAmount(
                purchaseReturn
              ),
            0
          )
        ),

      totalPurchaseReturnQuantity:
        round2(
          purchaseReturns.reduce(
            (sum, purchaseReturn) =>
              sum +
              calculatePurchaseReturnQuantity(
                purchaseReturn
              ),
            0
          )
        ),

      totalAdjustment:
        round2(
          purchaseReturns.reduce(
            (sum, purchaseReturn) =>
              sum +
              Number(
                purchaseReturn.adjustmentAmount ||
                  0
              ),
            0
          )
        ),
    };

    summary.netPurchases =
      round2(
        summary.grossPurchases -
          summary.totalPurchaseReturns
      );

    summary.netQuantity =
      round2(
        summary.totalQuantity -
          summary.totalPurchaseReturnQuantity
      );

    const productSummary =
      buildPurchaseProductSummary(
        purchases,
        purchaseReturns
      );

    return res.status(200).json({
      success: true,

      message:
        "Purchase report fetched successfully",

      filters: {
        companyId,

        branchId:
          branchId || null,

        financialYearId:
          financialYear._id,

        financialYear:
          financialYear.name ||
          financialYear.year ||
          "",

        fromDate:
          fromDate || null,

        toDate:
          toDate || null,

        accountId:
          accountId || null,

        productId:
          productId || null,

        search:
          search.trim(),
      },

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

      summary,

      purchases:
        paginatedPurchases,

      purchaseReturns,

      productSummary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
};