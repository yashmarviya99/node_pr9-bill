const mongoose = require("mongoose");

const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");

const Challan = require("../models/Challan");
const Quotation = require("../models/Quotation");

const Stock = require("../models/Stock");
const Product = require("../models/Product");
const Account = require("../models/Account");

const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");

/* =========================================================
   HELPERS
========================================================= */

const validId = (id) =>
  id && mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (validId(id)) return new mongoose.Types.ObjectId(id);
  return null;
};

const num = (value) =>
  Number(value || 0);

const money = (value) =>
  Number(num(value).toFixed(2));

const getPaidAmount = (transaction) => {
  const paidAmount = num(transaction.paidAmount);
  const paymentAmount = num(transaction.paymentAmount);
  return paidAmount > 0 ? paidAmount : paymentAmount;
};

const getMonthKey = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthName = (date) => {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
  }).format(new Date(date));
};

const addMonth = (date, amount) => {
  const value = new Date(date);
  value.setDate(1);
  value.setMonth(value.getMonth() + amount);
  return value;
};

const percentageChange = (current, previous) => {
  if (!previous) {
    return current ? 100 : 0;
  }
  return money(((current - previous) / previous) * 100);
};

/* =========================================================
   COMMON FILTER
========================================================= */

const getTransactionFilter = (
  companyId,
  financialYearId,
  branchId
) => {
  const filter = {
    company: toObjectId(companyId),
    isActive: true,
  };

  if (financialYearId && validId(financialYearId)) {
    filter.financialYear = toObjectId(financialYearId);
  }

  if (branchId && validId(branchId)) {
    filter.branch = toObjectId(branchId);
  }

  return filter;
};

/* =========================================================
   MONTHLY AGGREGATION
========================================================= */

const getGroupedAmount = async (
  Model,
  dateField,
  filter
) => {
  return Model.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: `$${dateField}`,
          },
        },
        amount: {
          $sum: "$totalAmount",
        },
      },
    },
  ]);
};

/* =========================================================
   GENERAL SUMMARY
========================================================= */

const getSummary = async (
  Model,
  filter,
  extraFilter = {}
) => {
  return Model.aggregate([
    {
      $match: {
        ...filter,
        ...extraFilter,
      },
    },
    {
      $group: {
        _id: null,
        amount: {
          $sum: "$totalAmount",
        },
        count: {
          $sum: 1,
        },
        paidAmount: {
          $sum: "$paidAmount",
        },
        remainingAmount: {
          $sum: "$remainingAmount",
        },
        refundAmount: {
          $sum: "$refundAmount",
        },
        adjustmentAmount: {
          $sum: "$adjustmentAmount",
        },
      },
    },
  ]);
};

/* =========================================================
   CASHBOOK + BANKBOOK
========================================================= */

const getCashBankDetails = async ({
  companyId,
  branchId,
  sales,
  purchases,
  saleReturns,
  purchaseReturns,
}) => {
  const [
    cashAccounts,
    bankAccounts,
    saleTransactions,
    purchaseTransactions,
    saleReturnTransactions,
    purchaseReturnTransactions,
  ] = await Promise.all([
    Account.find({
      company: toObjectId(companyId),
      accountType: "cash",
      isActive: true,
      ...(branchId && validId(branchId) ? { branch: toObjectId(branchId) } : {}),
    }).lean(),

    Account.find({
      company: toObjectId(companyId),
      accountType: "bank",
      isActive: true,
      ...(branchId && validId(branchId) ? { branch: toObjectId(branchId) } : {}),
    }).lean(),

    Sale.find({
      ...sales,
      paymentMode: {
        $in: ["cash", "bank", "online"],
      },
    })
      .select("invoiceNumber invoiceDate paymentMode paymentAmount paidAmount")
      .lean(),

    Purchase.find({
      ...purchases,
      paymentMode: {
        $in: ["cash", "bank", "online"],
      },
    })
      .select("invoiceNumber invoiceDate paymentMode paymentAmount paidAmount")
      .lean(),

    SaleReturn.find({
      ...saleReturns,
      refundMode: {
        $in: ["cash", "bank", "online"],
      },
    })
      .select("returnNumber returnDate refundMode refundAmount")
      .lean(),

    PurchaseReturn.find({
      ...purchaseReturns,
      adjustmentMode: {
        $in: ["cash", "bank", "online"],
      },
    })
      .select("returnNumber returnDate adjustmentMode adjustmentAmount")
      .lean(),
  ]);

  let cashOpeningBalance = 0;
  for (const acc of cashAccounts) {
    const ob = num(acc.openingBalance);
    cashOpeningBalance += (acc.openingBalanceType === "credit" ? -ob : ob);
  }

  let bankOpeningBalance = 0;
  for (const acc of bankAccounts) {
    const ob = num(acc.openingBalance);
    bankOpeningBalance += (acc.openingBalanceType === "credit" ? -ob : ob);
  }

  const cashbook = [];
  const bankbook = [];

  const addTransaction = (
    book,
    date,
    reference,
    type,
    paymentMode,
    direction,
    amount
  ) => {
    if (!num(amount)) return;
    book.push({
      date,
      reference,
      type,
      paymentMode,
      direction,
      amount: money(amount),
    });
  };

  /* SALES */
  saleTransactions.forEach((sale) => {
    const isCash = sale.paymentMode === "cash";
    const book = isCash ? cashbook : bankbook;
    addTransaction(
      book,
      sale.invoiceDate,
      sale.invoiceNumber,
      "sale",
      sale.paymentMode,
      "in",
      getPaidAmount(sale)
    );
  });

  /* PURCHASES */
  purchaseTransactions.forEach((purchase) => {
    const isCash = purchase.paymentMode === "cash";
    const book = isCash ? cashbook : bankbook;
    addTransaction(
      book,
      purchase.invoiceDate,
      purchase.invoiceNumber,
      "purchase",
      purchase.paymentMode,
      "out",
      getPaidAmount(purchase)
    );
  });

  /* SALE RETURNS */
  saleReturnTransactions.forEach((saleReturn) => {
    const isCash = saleReturn.refundMode === "cash";
    const book = isCash ? cashbook : bankbook;
    addTransaction(
      book,
      saleReturn.returnDate,
      saleReturn.returnNumber,
      "sale_return",
      saleReturn.refundMode,
      "out",
      saleReturn.refundAmount
    );
  });

  /* PURCHASE RETURNS */
  purchaseReturnTransactions.forEach((purchaseReturn) => {
    const isCash = purchaseReturn.adjustmentMode === "cash";
    const book = isCash ? cashbook : bankbook;
    addTransaction(
      book,
      purchaseReturn.returnDate,
      purchaseReturn.returnNumber,
      "purchase_return",
      purchaseReturn.adjustmentMode,
      "in",
      purchaseReturn.adjustmentAmount
    );
  });

  const getBook = (transactions, openingBal = 0) => {
    const totalIn = transactions
      .filter((item) => item.direction === "in")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalOut = transactions
      .filter((item) => item.direction === "out")
      .reduce((sum, item) => sum + item.amount, 0);

    const net = totalIn - totalOut;
    const currentBalance = openingBal + net;

    return {
      openingBalance: money(openingBal),
      totalIn: money(totalIn),
      totalOut: money(totalOut),
      net: money(net),
      currentBalance: money(currentBalance),
      summary: {
        openingBalance: money(openingBal),
        totalIn: money(totalIn),
        totalOut: money(totalOut),
        net: money(net),
        currentBalance: money(currentBalance),
        transactionCount: transactions.length,
      },
      transactions: transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20),
    };
  };

  return {
    cashbook: getBook(cashbook, cashOpeningBalance),
    bankbook: getBook(bankbook, bankOpeningBalance),
  };
};

/* =========================================================
   DASHBOARD
========================================================= */

const getDashboard = async (req, res, next) => {
  try {
    let { companyId, branchId, financialYearId } = req.query;

    /* COMPANY RESOLUTION */
    if (!companyId || !validId(companyId)) {
      companyId = req.headers["x-company-id"];
    }

    let company = null;
    if (companyId && validId(companyId)) {
      company = await Company.findOne({
        _id: toObjectId(companyId),
        $or: [
          { owner: req.user?.userId },
          { isActive: true },
        ],
      }).lean();
    }

    if (!company && req.user?.userId) {
      company = await Company.findOne({
        owner: req.user.userId,
        isActive: true,
      }).lean();
    }

    if (!company) {
      company = await Company.findOne({ isActive: true }).lean();
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "No active company found. Please register or select a company first.",
      });
    }

    companyId = company._id.toString();

    /* BRANCH RESOLUTION */
    if (branchId && !validId(branchId)) {
      branchId = null;
    }

    if (branchId) {
      const branchExists = await Branch.findOne({
        _id: toObjectId(branchId),
        company: company._id,
        isActive: true,
      }).lean();
      if (!branchExists) {
        branchId = null;
      }
    }

    /* FINANCIAL YEAR RESOLUTION */
    let financialYear = null;
    if (financialYearId && validId(financialYearId)) {
      financialYear = await FinancialYear.findOne({
        _id: toObjectId(financialYearId),
        company: company._id,
        isActive: true,
      }).lean();
    }

    if (!financialYear) {
      financialYear = await FinancialYear.findOne({
        company: company._id,
        isCurrent: true,
        isActive: true,
      }).sort({ startDate: -1 }).lean();
    }

    if (!financialYear) {
      financialYear = await FinancialYear.findOne({
        company: company._id,
        isActive: true,
      }).sort({ startDate: -1 }).lean();
    }

    if (!financialYear) {
      // Create default FY 2026-27 if completely absent
      const start = new Date("2026-04-01T00:00:00.000Z");
      const end = new Date("2027-03-31T23:59:59.999Z");
      financialYear = await FinancialYear.create({
        company: company._id,
        name: "2026-27",
        startDate: start,
        endDate: end,
        isCurrent: true,
        isActive: true,
      });
    }

    /* FILTERS */
    const baseFilter = getTransactionFilter(
      company._id,
      financialYear._id,
      branchId
    );

    /* PROMISE ALL EXECUTION */
    const [
      salesSummary,
      purchaseSummary,
      saleReturnSummary,
      purchaseReturnSummary,
      challanCount,
      quotationCount,
      salesMonthly,
      purchasesMonthly,
      saleReturnsMonthly,
      purchaseReturnsMonthly,
      topSaleProducts,
      topPurchaseProducts,
      topCustomersRaw,
      topSuppliersRaw,
      recentSales,
      recentPurchases,
      recentSaleReturns,
      recentPurchaseReturns,
      stockRows,
      cashBank,
    ] = await Promise.all([
      getSummary(Sale, baseFilter),
      getSummary(Purchase, baseFilter),
      getSummary(SaleReturn, baseFilter),
      getSummary(PurchaseReturn, baseFilter),

      Challan.countDocuments(baseFilter),
      Quotation.countDocuments(baseFilter),

      getGroupedAmount(Sale, "invoiceDate", baseFilter),
      getGroupedAmount(Purchase, "invoiceDate", baseFilter),
      getGroupedAmount(SaleReturn, "returnDate", baseFilter),
      getGroupedAmount(PurchaseReturn, "returnDate", baseFilter),

      /* TOP SALE PRODUCTS */
      Sale.aggregate([
        { $match: baseFilter },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.productName" },
            quantity: { $sum: "$items.quantity" },
            amount: { $sum: { $ifNull: ["$items.invoiceAmount", "$items.amount"] } },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ]),

      /* TOP PURCHASE PRODUCTS */
      Purchase.aggregate([
        { $match: baseFilter },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            productName: { $first: "$items.productName" },
            quantity: { $sum: "$items.quantity" },
            amount: { $sum: { $ifNull: ["$items.invoiceAmount", "$items.amount"] } },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ]),

      /* TOP CUSTOMERS */
      Sale.aggregate([
        {
          $match: {
            ...baseFilter,
            $or: [
              { customer: { $ne: null } },
              { account: { $ne: null } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$customer", "$account"] },
            amount: { $sum: "$totalAmount" },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ]),

      /* TOP SUPPLIERS */
      Purchase.aggregate([
        {
          $match: {
            ...baseFilter,
            $or: [
              { supplier: { $ne: null } },
              { account: { $ne: null } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$supplier", "$account"] },
            amount: { $sum: "$totalAmount" },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ]),

      /* RECENT SALES */
      Sale.find(baseFilter)
        .select("invoiceNumber invoiceDate totalAmount paymentMode customer account")
        .populate("customer", "name")
        .populate("account", "name")
        .sort({ invoiceDate: -1 })
        .limit(10)
        .lean(),

      /* RECENT PURCHASES */
      Purchase.find(baseFilter)
        .select("invoiceNumber invoiceDate totalAmount paymentMode supplier account")
        .populate("supplier", "name")
        .populate("account", "name")
        .sort({ invoiceDate: -1 })
        .limit(10)
        .lean(),

      /* RECENT SALE RETURNS */
      SaleReturn.find(baseFilter)
        .select("returnNumber returnDate totalAmount customer account")
        .populate("customer", "name")
        .populate("account", "name")
        .sort({ returnDate: -1 })
        .limit(10)
        .lean(),

      /* RECENT PURCHASE RETURNS */
      PurchaseReturn.find(baseFilter)
        .select("returnNumber returnDate totalAmount supplier account")
        .populate("supplier", "name")
        .populate("account", "name")
        .sort({ returnDate: -1 })
        .limit(10)
        .lean(),

      /* STOCK */
      Stock.find({
        company: company._id,
        financialYear: financialYear._id,
        ...(branchId && validId(branchId) ? { branch: toObjectId(branchId) } : {}),
      })
        .select("product quantity")
        .populate("product", "name unit minimumStock")
        .lean(),

      /* CASH + BANK */
      getCashBankDetails({
        companyId: company._id,
        branchId,
        sales: baseFilter,
        purchases: baseFilter,
        saleReturns: baseFilter,
        purchaseReturns: baseFilter,
      }),
    ]);

    /* TOTALS */
    const totalSales = num(salesSummary[0]?.amount);
    const totalPurchases = num(purchaseSummary[0]?.amount);
    const totalSaleReturns = num(saleReturnSummary[0]?.amount);
    const totalPurchaseReturns = num(purchaseReturnSummary[0]?.amount);

    const totalSalesCount = num(salesSummary[0]?.count);
    const totalPurchaseCount = num(purchaseSummary[0]?.count);
    const totalSaleReturnCount = num(saleReturnSummary[0]?.count);
    const totalPurchaseReturnCount = num(purchaseReturnSummary[0]?.count);

    const totalAccountingTransactions =
      totalSalesCount + totalPurchaseCount + totalSaleReturnCount + totalPurchaseReturnCount;
    const totalDocuments =
      totalAccountingTransactions + challanCount + quotationCount;

    /* MONTHLY PERFORMANCE (12 Months April - March) */
    const monthlyPerformance = [];
    let cursor = new Date(financialYear.startDate);
    cursor.setDate(1);

    const financialYearEnd = new Date(financialYear.endDate);
    financialYearEnd.setDate(1);

    while (cursor <= financialYearEnd && monthlyPerformance.length < 12) {
      monthlyPerformance.push({
        key: getMonthKey(cursor),
        month: getMonthName(cursor),
        sales: 0,
        purchases: 0,
        saleReturns: 0,
        purchaseReturns: 0,
        netSales: 0,
        netPurchases: 0,
      });
      cursor = addMonth(cursor, 1);
    }

    const mergeMonthlyData = (rows, field) => {
      rows.forEach((row) => {
        const month = monthlyPerformance.find((item) => item.key === row._id);
        if (month) {
          month[field] = money(row.amount);
        }
      });
    };

    mergeMonthlyData(salesMonthly, "sales");
    mergeMonthlyData(purchasesMonthly, "purchases");
    mergeMonthlyData(saleReturnsMonthly, "saleReturns");
    mergeMonthlyData(purchaseReturnsMonthly, "purchaseReturns");

    monthlyPerformance.forEach((month) => {
      month.netSales = money(month.sales - month.saleReturns);
      month.netPurchases = money(month.purchases - month.purchaseReturns);
    });

    /* CURRENT / PREVIOUS MONTH PERFORMANCE COMPARISON */
    let comparisonDate = new Date();
    const fyStart = new Date(financialYear.startDate);
    const fyEnd = new Date(financialYear.endDate);

    if (comparisonDate < fyStart) comparisonDate = fyStart;
    if (comparisonDate > fyEnd) comparisonDate = fyEnd;

    const currentMonthStart = new Date(
      comparisonDate.getFullYear(),
      comparisonDate.getMonth(),
      1
    );
    const previousMonthStart = new Date(
      comparisonDate.getFullYear(),
      comparisonDate.getMonth() - 1,
      1
    );

    const currentMonthEnd = new Date(
      comparisonDate.getFullYear(),
      comparisonDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const previousMonthEnd = new Date(
      comparisonDate.getFullYear(),
      comparisonDate.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    const getPeriodTotals = async (startDate, endDate) => {
      const [sales, purchases, saleReturns, purchaseReturns] = await Promise.all([
        getSummary(Sale, baseFilter, {
          invoiceDate: { $gte: startDate, $lte: endDate },
        }),
        getSummary(Purchase, baseFilter, {
          invoiceDate: { $gte: startDate, $lte: endDate },
        }),
        getSummary(SaleReturn, baseFilter, {
          returnDate: { $gte: startDate, $lte: endDate },
        }),
        getSummary(PurchaseReturn, baseFilter, {
          returnDate: { $gte: startDate, $lte: endDate },
        }),
      ]);

      return {
        sales: num(sales[0]?.amount),
        purchases: num(purchases[0]?.amount),
        saleReturns: num(saleReturns[0]?.amount),
        purchaseReturns: num(purchaseReturns[0]?.amount),
      };
    };

    const [currentMonth, previousMonth] = await Promise.all([
      getPeriodTotals(currentMonthStart, currentMonthEnd),
      getPeriodTotals(previousMonthStart, previousMonthEnd),
    ]);

    const currentNetSales = currentMonth.sales - currentMonth.saleReturns;
    const previousNetSales = previousMonth.sales - previousMonth.saleReturns;

    const currentNetPurchases = currentMonth.purchases - currentMonth.purchaseReturns;
    const previousNetPurchases = previousMonth.purchases - previousMonth.purchaseReturns;

    const salesChange = percentageChange(currentMonth.sales, previousMonth.sales);
    const purchasesChange = percentageChange(currentMonth.purchases, previousMonth.purchases);
    const netSalesChange = percentageChange(currentNetSales, previousNetSales);
    const netPurchasesChange = percentageChange(currentNetPurchases, previousNetPurchases);

    /* RESOLVE NAMES FOR TOP PRODUCTS, CUSTOMERS & SUPPLIERS */
    const partyIds = [
      ...topCustomersRaw.map((c) => c._id),
      ...topSuppliersRaw.map((s) => s._id),
    ].filter(Boolean);

    const [customerList, supplierList, accountList, productList] = await Promise.all([
      Customer.find({ _id: { $in: partyIds } }).select("name contactPerson phone city").lean(),
      Supplier.find({ _id: { $in: partyIds } }).select("name contactPerson phone city").lean(),
      Account.find({ _id: { $in: partyIds } }).select("name contactPerson phone city").lean(),
      Product.find({ company: company._id }).select("name code unit").lean(),
    ]);

    const partyMap = new Map();
    customerList.forEach((c) => partyMap.set(c._id.toString(), c));
    supplierList.forEach((s) => partyMap.set(s._id.toString(), s));
    accountList.forEach((a) => partyMap.set(a._id.toString(), a));

    const productMap = new Map();
    productList.forEach((p) => productMap.set(p._id.toString(), p));

    const mapTopProducts = (rows) =>
      rows.map((item) => {
        const prod = productMap.get(item._id?.toString());
        const name = item.productName || prod?.name || "Product";
        return {
          productId: item._id,
          productName: name,
          name: name,
          quantity: num(item.quantity),
          amount: money(item.amount),
        };
      });

    const topSales = mapTopProducts(topSaleProducts);
    const topPurchases = mapTopProducts(topPurchaseProducts);

    const topCustomers = topCustomersRaw.map((item) => {
      const party = partyMap.get(item._id?.toString());
      const name = party?.name || "Walk-in Customer";
      return {
        customerId: item._id,
        customerName: name,
        name: name,
        phone: party?.phone || "",
        city: party?.city || "",
        transactionCount: item.transactionCount,
        amount: money(item.amount),
      };
    });

    const topSuppliers = topSuppliersRaw.map((item) => {
      const party = partyMap.get(item._id?.toString());
      const name = party?.name || "Supplier";
      return {
        supplierId: item._id,
        supplierName: name,
        name: name,
        phone: party?.phone || "",
        city: party?.city || "",
        transactionCount: item.transactionCount,
        amount: money(item.amount),
      };
    });

    /* STOCK DETAILS */
    const lowStockProducts = stockRows
      .filter(
        (item) =>
          item.product &&
          num(item.quantity) <= num(item.product.minimumStock)
      )
      .sort((a, b) => num(a.quantity) - num(b.quantity))
      .slice(0, 10)
      .map((item) => ({
        productId: item.product._id,
        productName: item.product.name,
        unit: item.product.unit,
        quantity: num(item.quantity),
        minimumStock: num(item.product.minimumStock),
      }));

    const totalStockQuantity = stockRows.reduce(
      (sum, item) => sum + num(item.quantity),
      0
    );

    /* RECENT TRANSACTIONS */
    const recentTransactions = [
      ...recentSales.map((sale) => ({
        date: sale.invoiceDate,
        type: "sale",
        reference: sale.invoiceNumber,
        party: sale.customer?.name || sale.account?.name || "Walk-in Customer",
        amount: num(sale.totalAmount),
        paymentMode: sale.paymentMode,
      })),
      ...recentPurchases.map((purchase) => ({
        date: purchase.invoiceDate,
        type: "purchase",
        reference: purchase.invoiceNumber,
        party: purchase.supplier?.name || purchase.account?.name || "Supplier",
        amount: num(purchase.totalAmount),
        paymentMode: purchase.paymentMode,
      })),
      ...recentSaleReturns.map((saleReturn) => ({
        date: saleReturn.returnDate,
        type: "sale_return",
        reference: saleReturn.returnNumber,
        party: saleReturn.customer?.name || saleReturn.account?.name || "Customer",
        amount: num(saleReturn.totalAmount),
        paymentMode: "return",
      })),
      ...recentPurchaseReturns.map((purchaseReturn) => ({
        date: purchaseReturn.returnDate,
        type: "purchase_return",
        reference: purchaseReturn.returnNumber,
        party: purchaseReturn.supplier?.name || purchaseReturn.account?.name || "Supplier",
        amount: num(purchaseReturn.totalAmount),
        paymentMode: "return",
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    /* RESPONSE */
    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        company: {
          id: company._id,
          companyName: company.companyName,
          businessType: company.businessType || "Trading & Wholesale",
          email: company.email || "",
          phone: company.phone || "",
          address: company.address || "",
          city: company.city || "Rajkot",
          state: company.state || "Gujarat",
          pincode: company.pincode || "360001",
          country: company.country || "India",
          gstNumber: company.gstNumber || "",
          panNumber: company.panNumber || "",
          website: company.website || "",
          logo: company.logo || "",
        },

        financialYear: {
          id: financialYear._id,
          name: financialYear.name,
          startDate: financialYear.startDate,
          endDate: financialYear.endDate,
          isCurrent: financialYear.isCurrent,
        },

        filters: {
          companyId: company._id,
          branchId: branchId || null,
          financialYearId: financialYear._id,
        },

        summary: {
          totalSales: money(totalSales),
          totalSale: money(totalSales),
          totalPurchases: money(totalPurchases),
          totalPurchase: money(totalPurchases),
          totalSaleReturns: money(totalSaleReturns),
          totalSaleReturn: money(totalSaleReturns),
          totalPurchaseReturns: money(totalPurchaseReturns),
          totalPurchaseReturn: money(totalPurchaseReturns),
          netSales: money(totalSales - totalSaleReturns),
          netPurchases: money(totalPurchases - totalPurchaseReturns),
          receivable: money(salesSummary[0]?.remainingAmount),
          payable: money(purchaseSummary[0]?.remainingAmount),
          totalStockQuantity: Number(totalStockQuantity.toFixed(3)),
          lowStockCount: lowStockProducts.length,
        },

        transactionSummary: {
          sales: totalSalesCount,
          purchases: totalPurchaseCount,
          saleReturns: totalSaleReturnCount,
          purchaseReturns: totalPurchaseReturnCount,
          challans: challanCount,
          quotations: quotationCount,
          totalAccountingTransactions,
          totalDocuments,
        },

        cashbook: cashBank.cashbook,
        bankbook: cashBank.bankbook,

        monthlyPerformance,

        monthComparison: {
          currentMonth: {
            label: getMonthName(currentMonthStart),
            sales: money(currentMonth.sales),
            purchases: money(currentMonth.purchases),
            saleReturns: money(currentMonth.saleReturns),
            purchaseReturns: money(currentMonth.purchaseReturns),
            netSales: money(currentNetSales),
            netPurchases: money(currentNetPurchases),
          },
          previousMonth: {
            label: getMonthName(previousMonthStart),
            sales: money(previousMonth.sales),
            purchases: money(previousMonth.purchases),
            saleReturns: money(previousMonth.saleReturns),
            purchaseReturns: money(previousMonth.purchaseReturns),
            netSales: money(previousNetSales),
            netPurchases: money(previousNetPurchases),
          },
          percentageChange: {
            sales: salesChange,
            purchases: purchasesChange,
            netSales: netSalesChange,
            netPurchases: netPurchasesChange,
          },
          salesChange,
          purchasesChange,
          netSalesChange,
          netPurchasesChange,
        },

        topProducts: {
          sales: topSales,
          purchases: topPurchases,
        },
        top10Products: topSales,
        top10Purchases: topPurchases,

        topCustomers,
        top10Customers: topCustomers,

        topSuppliers,
        top10Suppliers: topSuppliers,

        stock: {
          totalProducts: stockRows.length,
          totalQuantity: Number(totalStockQuantity.toFixed(3)),
          lowStockProducts,
        },

        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};
