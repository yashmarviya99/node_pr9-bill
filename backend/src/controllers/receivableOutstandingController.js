const mongoose = require("mongoose");

const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const SaleReturn = require("../models/SaleReturn");
const Receipt = require("../models/Receipt");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

const getStartOfDay = (date) => {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
};

const getEndOfDay = (date) => {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
};

const sameId = (first, second) => {
  if (!first || !second) return false;

  return first.toString() === second.toString();
};

const checkCompanyAccess = async (companyId, userId) => {
  if (!isValidObjectId(companyId)) {
    return null;
  }

  return Company.findOne({
    _id: companyId,
    owner: userId,
    isActive: true,
  }).lean();
};

const getFinancialYear = async ({
  companyId,
  financialYearId,
}) => {
  if (
    financialYearId &&
    isValidObjectId(financialYearId)
  ) {
    return FinancialYear.findOne({
      _id: financialYearId,
      company: companyId,
      isActive: true,
    }).lean();
  }

  return FinancialYear.findOne({
    company: companyId,
    isCurrent: true,
    isActive: true,
  }).lean();
};

const validateDateRange = ({
  fromDate,
  toDate,
  financialYear,
}) => {
  let from = fromDate
    ? getStartOfDay(fromDate)
    : null;

  let to = toDate
    ? getEndOfDay(toDate)
    : null;

  if (from && to && from > to) {
    return {
      error: "From date cannot be greater than To date",
    };
  }

  if (financialYear) {
    const fyStart = getStartOfDay(
      financialYear.startDate
    );

    const fyEnd = getEndOfDay(
      financialYear.endDate
    );

    if (from && from < fyStart) {
      return {
        error:
          "From date cannot be before financial year start date",
      };
    }

    if (to && to > fyEnd) {
      return {
        error:
          "To date cannot be after financial year end date",
      };
    }
  }

  return {
    fromDate: from,
    toDate: to,
  };
};

const getCustomerOpeningBalance = (customer) => {
  const openingBalance = round2(
    customer.openingBalance || 0
  );

  if (customer.openingBalanceType === "credit") {
    return round2(-openingBalance);
  }

  return openingBalance;
};

const getSaleAmount = (sale) => {
  if (Number.isFinite(Number(sale.totalAmount))) {
    return round2(sale.totalAmount);
  }

  if (Number.isFinite(Number(sale.invoiceAmount))) {
    return round2(sale.invoiceAmount);
  }

  return 0;
};

const getSaleReturnAmount = (saleReturn) => {
  if (
    Number.isFinite(
      Number(saleReturn.totalAmount)
    )
  ) {
    return round2(saleReturn.totalAmount);
  }

  if (
    Number.isFinite(
      Number(saleReturn.returnAmount)
    )
  ) {
    return round2(saleReturn.returnAmount);
  }

  return 0;
};

const getReceiptAmount = (receipt) => {
  return round2(receipt.amount || 0);
};

const buildCustomerFilter = ({
  companyId,
  branchId,
  customerId,
  search,
}) => {
  const filter = {
    company: companyId,
    isActive: true,
  };

  if (
    branchId &&
    isValidObjectId(branchId)
  ) {
    filter.$or = [
      {
        branch: branchId,
      },
      {
        branch: null,
      },
    ];
  }

  if (
    customerId &&
    isValidObjectId(customerId)
  ) {
    filter._id = customerId;
  }

  if (search) {
    const searchRegex = new RegExp(
      search,
      "i"
    );

    filter.$and = [
      {
        $or: [
          {
            name: searchRegex,
          },
          {
            customerCode: searchRegex,
          },
          {
            phone: searchRegex,
          },
          {
            email: searchRegex,
          },
          {
            gstNumber: searchRegex,
          },
        ],
      },
    ];
  }

  return filter;
};

const buildTransactionFilter = ({
  companyId,
  branchId,
  financialYearId,
  dateField,
  fromDate,
  toDate,
  customerId,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (
    branchId &&
    isValidObjectId(branchId)
  ) {
    filter.$or = [
      {
        branch: branchId,
      },
      {
        branch: null,
      },
    ];
  }

  if (
    customerId &&
    isValidObjectId(customerId)
  ) {
    filter.customer = customerId;
  }

  if (fromDate || toDate) {
    filter[dateField] = {};

    if (fromDate) {
      filter[dateField].$gte =
        fromDate;
    }

    if (toDate) {
      filter[dateField].$lte =
        toDate;
    }
  }

  return filter;
};

const loadCustomerTransactions = async ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
  customerIds,
}) => {
  if (!customerIds.length) {
    return {
      sales: [],
      saleReturns: [],
      receipts: [],
    };
  }

  const customerObjectIds =
    customerIds.map(
      (id) =>
        new mongoose.Types.ObjectId(id)
    );

  const baseSaleFilter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
    customer: {
      $in: customerObjectIds,
    },
  };

  const baseSaleReturnFilter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
    customer: {
      $in: customerObjectIds,
    },
  };

  const baseReceiptFilter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
    customer: {
      $in: customerObjectIds,
    },
  };

  if (
    branchId &&
    isValidObjectId(branchId)
  ) {
    baseSaleFilter.$or = [
      {
        branch: branchId,
      },
      {
        branch: null,
      },
    ];

    baseSaleReturnFilter.$or = [
      {
        branch: branchId,
      },
      {
        branch: null,
      },
    ];

    baseReceiptFilter.$or = [
      {
        branch: branchId,
      },
      {
        branch: null,
      },
    ];
  }

  const saleDateFilter = {};

  if (fromDate) {
    saleDateFilter.$gte =
      fromDate;
  }

  if (toDate) {
    saleDateFilter.$lte =
      toDate;
  }

  const saleReturnDateFilter = {};

  if (fromDate) {
    saleReturnDateFilter.$gte =
      fromDate;
  }

  if (toDate) {
    saleReturnDateFilter.$lte =
      toDate;
  }

  const receiptDateFilter = {};

  if (fromDate) {
    receiptDateFilter.$gte =
      fromDate;
  }

  if (toDate) {
    receiptDateFilter.$lte =
      toDate;
  }

  if (
    fromDate ||
    toDate
  ) {
    baseSaleFilter.invoiceDate =
      saleDateFilter;

    baseSaleReturnFilter.returnDate =
      saleReturnDateFilter;

    baseReceiptFilter.receiptDate =
      receiptDateFilter;
  }

  const [
    sales,
    saleReturns,
    receipts,
  ] = await Promise.all([
    Sale.find(baseSaleFilter)
      .select(
        "_id customer account invoiceNumber invoiceDate totalAmount invoiceAmount paidAmount paymentAmount remainingAmount"
      )
      .lean(),

    SaleReturn.find(
      baseSaleReturnFilter
    )
      .select(
        "_id customer account originalSale returnNumber returnDate totalAmount returnAmount refundAmount"
      )
      .lean(),

    Receipt.find(baseReceiptFilter)
      .select(
        "_id customer account receiptAccount receiptNumber receiptDate amount paymentMode"
      )
      .lean(),
  ]);

  return {
    sales,
    saleReturns,
    receipts,
  };
};

const calculateCustomerOutstanding = ({
  customer,
  sales,
  saleReturns,
  receipts,
}) => {
  const customerId =
    customer._id.toString();

  const customerSales =
    sales.filter((sale) =>
      sameId(
        sale.customer,
        customerId
      )
    );

  const customerSaleReturns =
    saleReturns.filter(
      (saleReturn) =>
        sameId(
          saleReturn.customer,
          customerId
        )
    );

  const customerReceipts =
    receipts.filter((receipt) =>
      sameId(
        receipt.customer,
        customerId
      )
    );

  const openingBalance =
    getCustomerOpeningBalance(
      customer
    );

  const salesAmount =
    round2(
      customerSales.reduce(
        (total, sale) =>
          total +
          getSaleAmount(sale),
        0
      )
    );

  const saleReturnAmount =
    round2(
      customerSaleReturns.reduce(
        (total, saleReturn) =>
          total +
          getSaleReturnAmount(
            saleReturn
          ),
        0
      )
    );

  const receiptAmount =
    round2(
      customerReceipts.reduce(
        (total, receipt) =>
          total +
          getReceiptAmount(receipt),
        0
      )
    );

  const debitAmount =
    round2(
      openingBalance +
        salesAmount
    );

  const creditAmount =
    round2(
      saleReturnAmount +
        receiptAmount
    );

  const balance =
    round2(
      debitAmount -
        creditAmount
    );

  return {
    customerId: customer._id,
    customerCode:
      customer.customerCode || "",
    customerName:
      customer.name || "",
    contactPerson:
      customer.contactPerson || "",
    phone:
      customer.phone || "",
    email:
      customer.email || "",
    gstNumber:
      customer.gstNumber || "",

    openingBalance,

    salesAmount,

    saleReturnAmount,

    receiptAmount,

    debitAmount,

    creditAmount,

    outstandingAmount:
      balance > 0
        ? balance
        : 0,

    advanceAmount:
      balance < 0
        ? round2(Math.abs(balance))
        : 0,

    netBalance: balance,

    totalSalesInvoices:
      customerSales.length,

    totalSaleReturns:
      customerSaleReturns.length,

    totalReceipts:
      customerReceipts.length,

    status:
      balance > 0
        ? "receivable"
        : balance < 0
        ? "advance"
        : "settled",
  };
};

const getReceivableOutstanding =
  async (req, res) => {
    try {
      const {
        companyId,
        branchId,
        financialYearId,
        fromDate: fromDateQuery,
        toDate: toDateQuery,
        customerId,
        search = "",
        includeZeroBalance = "false",
        page = 1,
        limit = 50,
      } = req.query;

      if (
        !companyId ||
        !isValidObjectId(companyId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid companyId is required",
        });
      }

      const company =
        await checkCompanyAccess(
          companyId,
          req.user.userId
        );

      if (!company) {
        return res.status(403).json({
          success: false,
          message:
            "Company not found or access denied",
        });
      }

      if (
        branchId &&
        !isValidObjectId(branchId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid branchId",
        });
      }

      if (
        customerId &&
        !isValidObjectId(customerId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customerId",
        });
      }

      const financialYear =
        await getFinancialYear({
          companyId,
          financialYearId,
        });

      if (!financialYear) {
        return res.status(404).json({
          success: false,
          message:
            "Financial year not found",
        });
      }

      const parsedFromDate =
        parseDate(fromDateQuery);

      const parsedToDate =
        parseDate(toDateQuery);

      if (
        fromDateQuery &&
        !parsedFromDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fromDate",
        });
      }

      if (
        toDateQuery &&
        !parsedToDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid toDate",
        });
      }

      const dateValidation =
        validateDateRange({
          fromDate:
            parsedFromDate,
          toDate:
            parsedToDate,
          financialYear,
        });

      if (dateValidation.error) {
        return res.status(400).json({
          success: false,
          message:
            dateValidation.error,
        });
      }

      const safePage =
        Math.max(
          Number(page) || 1,
          1
        );

      const safeLimit =
        Math.min(
          Math.max(
            Number(limit) || 50,
            1
          ),
          100
        );

      const customerFilter =
        buildCustomerFilter({
          companyId,
          branchId,
          customerId,
          search:
            String(search).trim(),
        });

      const customers =
        await Customer.find(
          customerFilter
        )
          .sort({
            name: 1,
          })
          .lean();

      const customerIds =
        customers.map((customer) =>
          customer._id.toString()
        );

      const {
        sales,
        saleReturns,
        receipts,
      } =
        await loadCustomerTransactions({
          companyId,
          branchId,
          financialYearId:
            financialYear._id,
          fromDate:
            dateValidation.fromDate,
          toDate:
            dateValidation.toDate,
          customerIds,
        });

      const rows =
        customers.map((customer) =>
          calculateCustomerOutstanding({
            customer,
            sales,
            saleReturns,
            receipts,
          })
        );

      const shouldIncludeZero =
        String(
          includeZeroBalance
        ).toLowerCase() ===
        "true";

      const filteredRows =
        shouldIncludeZero
          ? rows
          : rows.filter(
              (row) =>
                row.outstandingAmount >
                  0 ||
                row.advanceAmount > 0
            );

      const total =
        filteredRows.length;

      const totalPages =
        Math.ceil(
          total / safeLimit
        );

      const skip =
        (safePage - 1) *
        safeLimit;

      const paginatedRows =
        filteredRows.slice(
          skip,
          skip + safeLimit
        );

      const summary =
        filteredRows.reduce(
          (result, row) => {
            result.totalCustomers += 1;

            result.totalOpeningBalance =
              round2(
                result.totalOpeningBalance +
                  row.openingBalance
              );

            result.totalSales =
              round2(
                result.totalSales +
                  row.salesAmount
              );

            result.totalSaleReturns =
              round2(
                result.totalSaleReturns +
                  row.saleReturnAmount
              );

            result.totalReceipts =
              round2(
                result.totalReceipts +
                  row.receiptAmount
              );

            result.totalDebit =
              round2(
                result.totalDebit +
                  row.debitAmount
              );

            result.totalCredit =
              round2(
                result.totalCredit +
                  row.creditAmount
              );

            result.totalReceivable =
              round2(
                result.totalReceivable +
                  row.outstandingAmount
              );

            result.totalAdvance =
              round2(
                result.totalAdvance +
                  row.advanceAmount
              );

            result.receivableCustomers +=
              row.status ===
              "receivable"
                ? 1
                : 0;

            result.advanceCustomers +=
              row.status ===
              "advance"
                ? 1
                : 0;

            result.settledCustomers +=
              row.status ===
              "settled"
                ? 1
                : 0;

            return result;
          },
          {
            totalCustomers: 0,
            totalOpeningBalance: 0,
            totalSales: 0,
            totalSaleReturns: 0,
            totalReceipts: 0,
            totalDebit: 0,
            totalCredit: 0,
            totalReceivable: 0,
            totalAdvance: 0,
            receivableCustomers: 0,
            advanceCustomers: 0,
            settledCustomers: 0,
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Receivable outstanding report fetched successfully",

        filters: {
          companyId,
          branchId:
            branchId || null,
          financialYearId:
            financialYear._id,
          financialYear:
            financialYear.name,
          fromDate:
            dateValidation.fromDate,
          toDate:
            dateValidation.toDate,
          customerId:
            customerId || null,
          search:
            String(search).trim(),
          includeZeroBalance:
            shouldIncludeZero,
        },

        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
        },

        summary,

        customers:
          paginatedRows,

        accountingRules: {
          openingBalance:
            "Debit opening balance increases receivable; credit opening balance decreases receivable",
          sale:
            "Increase receivable",
          saleReturn:
            "Decrease receivable",
          receipt:
            "Decrease receivable",
          payment:
            "Not included in customer receivable because Payment API represents outgoing party payment",
          challan:
            "No receivable or stock movement",
        },
      });
    } catch (error) {
      console.error(
        "Receivable Outstanding Report Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch receivable outstanding report",
        error: error.message,
      });
    }
  };

module.exports = {
  getReceivableOutstanding,
};