const PDFDocument = require("pdfkit");

const Account = require("../models/Account");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");
const Payment = require("../models/Payment");

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const money = (value) => `₹${round2(value).toFixed(2)}`;

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getNumber = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number = Number(value);

      if (!Number.isNaN(number)) {
        return number;
      }
    }
  }

  return 0;
};

const getTransactionAccountId = (transaction) => {
  return (
    transaction.account?._id ||
    transaction.account ||
    transaction.customer?._id ||
    transaction.customer ||
    transaction.supplier?._id ||
    transaction.supplier ||
    null
  );
};

const getTransactionNumber = (transaction) => {
  return (
    transaction.invoiceNumber ||
    transaction.saleNumber ||
    transaction.purchaseNumber ||
    transaction.returnNumber ||
    transaction.paymentNumber ||
    transaction.referenceNumber ||
    transaction.number ||
    transaction._id?.toString() ||
    ""
  );
};

const getTransactionDate = (transaction) => {
  return (
    transaction.invoiceDate ||
    transaction.saleDate ||
    transaction.purchaseDate ||
    transaction.returnDate ||
    transaction.paymentDate ||
    transaction.date ||
    transaction.createdAt
  );
};

const getPartyName = (transaction) => {
  return (
    transaction.account?.name ||
    transaction.customer?.name ||
    transaction.supplier?.name ||
    transaction.accountName ||
    transaction.customerName ||
    transaction.supplierName ||
    ""
  );
};

const getNarration = (transaction, fallback) => {
  return (
    transaction.narration ||
    transaction.notes ||
    transaction.remark ||
    fallback
  );
};

const getPaymentAccountId = (transaction) => {
  return (
    transaction.paymentAccount?._id ||
    transaction.paymentAccount ||
    transaction.refundAccount?._id ||
    transaction.refundAccount ||
    transaction.adjustmentAccount?._id ||
    transaction.adjustmentAccount ||
    transaction.cashAccount?._id ||
    transaction.cashAccount ||
    transaction.bankAccount?._id ||
    transaction.bankAccount ||
    null
  );
};

const isBankTransaction = (
  transaction,
  bankAccountIds
) => {
  const paymentAccountId =
    getPaymentAccountId(transaction);

  if (!paymentAccountId) {
    return false;
  }

  return bankAccountIds.includes(
    paymentAccountId.toString()
  );
};

const getBankAmount = (
  transaction,
  type
) => {
  if (type === "sale") {
    return getNumber(
      transaction.receivedAmount,
      transaction.received,
      transaction.bankReceived,
      transaction.paidAmount
    );
  }

  if (type === "purchase") {
    return getNumber(
      transaction.paidAmount,
      transaction.paid,
      transaction.bankPaid
    );
  }

  if (type === "sale_return") {
    return getNumber(
      transaction.refundAmount,
      transaction.refund,
      transaction.paidAmount,
      transaction.bankRefund
    );
  }

  if (type === "purchase_return") {
    return getNumber(
      transaction.adjustmentAmount,
      transaction.receivedAmount,
      transaction.received,
      transaction.refundAmount,
      transaction.bankReceived
    );
  }

  if (type === "payment") {
    return getNumber(transaction.amount);
  }

  return 0;
};

const checkCompanyAccess = async (
  companyId,
  userId
) => {
  const company = await Company.findOne({
    _id: companyId,
    owner: userId,
  }).lean();

  if (company) {
    return company;
  }

  const fallbackCompany =
    await Company.findById(companyId).lean();

  if (!fallbackCompany) {
    return null;
  }

  return fallbackCompany;
};

const getFinancialYear = async (
  financialYearId,
  companyId
) => {
  return FinancialYear.findOne({
    _id: financialYearId,
    company: companyId,
  }).lean();
};

const validateDateRange = (
  fromDate,
  toDate
) => {
  if (!fromDate || !toDate) {
    return {
      valid: true,
      from: null,
      to: null,
    };
  }

  if (
    !isValidDate(fromDate) ||
    !isValidDate(toDate)
  ) {
    return {
      valid: false,
      message:
        "Invalid fromDate or toDate",
    };
  }

  const from = startOfDay(fromDate);
  const to = endOfDay(toDate);

  if (from > to) {
    return {
      valid: false,
      message:
        "fromDate must be earlier than or equal to toDate",
    };
  }

  return {
    valid: true,
    from,
    to,
  };
};

const getBankAccounts = async (
  companyId,
  branchId
) => {
  const filter = {
    company: companyId,
    accountType: "bank",
  };

  if (branchId) {
    filter.branch = branchId;
  }

  return Account.find(filter)
    .select(
      "_id name accountCode openingBalance openingBalanceType branch"
    )
    .lean();
};

const getAccountOpeningBalance = (
  account
) => {
  const amount = getNumber(
    account?.openingBalance
  );

  if (!amount) {
    return 0;
  }

  const type = String(
    account?.openingBalanceType ||
      account?.openingBalanceSide ||
      account?.balanceType ||
      "debit"
  ).toLowerCase();

  if (type === "credit") {
    return -amount;
  }

  return amount;
};

const getBaseTransactionFilter = (
  companyId,
  financialYearId,
  branchId,
  dateField,
  fromDate,
  toDate
) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  if (fromDate || toDate) {
    filter[dateField] = {};

    if (fromDate) {
      filter[dateField].$gte = fromDate;
    }

    if (toDate) {
      filter[dateField].$lte = toDate;
    }
  }

  return filter;
};

const buildBankBookEntries = async ({
  companyId,
  financialYearId,
  branchId,
  fromDate,
  toDate,
  search,
}) => {
  const bankAccounts =
    await getBankAccounts(
      companyId,
      branchId
    );

  const bankAccountIds =
    bankAccounts.map((account) =>
      account._id.toString()
    );

  if (!bankAccountIds.length) {
    return [];
  }

  const transactionPromises = [
    Sale.find(
      getBaseTransactionFilter(
        companyId,
        financialYearId,
        branchId,
        "invoiceDate",
        fromDate,
        toDate
      )
    )
      .populate("account", "name")
      .populate(
        "paymentAccount",
        "name accountType"
      )
      .lean(),

    Purchase.find(
      getBaseTransactionFilter(
        companyId,
        financialYearId,
        branchId,
        "invoiceDate",
        fromDate,
        toDate
      )
    )
      .populate("account", "name")
      .populate(
        "paymentAccount",
        "name accountType"
      )
      .lean(),

    SaleReturn.find(
      getBaseTransactionFilter(
        companyId,
        financialYearId,
        branchId,
        "returnDate",
        fromDate,
        toDate
      )
    )
      .populate("account", "name")
      .populate(
        "refundAccount",
        "name accountType"
      )
      .lean(),

    PurchaseReturn.find(
      getBaseTransactionFilter(
        companyId,
        financialYearId,
        branchId,
        "returnDate",
        fromDate,
        toDate
      )
    )
      .populate("account", "name")
      .populate(
        "adjustmentAccount",
        "name accountType"
      )
      .lean(),

    Payment.find(
      getBaseTransactionFilter(
        companyId,
        financialYearId,
        branchId,
        "paymentDate",
        fromDate,
        toDate
      )
    )
      .populate("account", "name")
      .populate(
        "paymentAccount",
        "name accountType"
      )
      .lean(),
  ];

  const [
    sales,
    purchases,
    saleReturns,
    purchaseReturns,
    payments,
  ] = await Promise.all(
    transactionPromises
  );

  const entries = [];

  for (const sale of sales) {
    if (
      !isBankTransaction(
        sale,
        bankAccountIds
      )
    ) {
      continue;
    }

    const amount = getBankAmount(
      sale,
      "sale"
    );

    if (amount <= 0) {
      continue;
    }

    entries.push({
      source: "sale",
      sourceId: sale._id,
      date: getTransactionDate(sale),
      number:
        getTransactionNumber(sale),
      party: getPartyName(sale),
      description: getNarration(
        sale,
        "Bank received against sale"
      ),
      receipt: round2(amount),
      payment: 0,
      accountId:
        getTransactionAccountId(sale),
      paymentAccountId:
        getPaymentAccountId(sale),
    });
  }

  for (const purchase of purchases) {
    if (
      !isBankTransaction(
        purchase,
        bankAccountIds
      )
    ) {
      continue;
    }

    const amount = getBankAmount(
      purchase,
      "purchase"
    );

    if (amount <= 0) {
      continue;
    }

    entries.push({
      source: "purchase",
      sourceId: purchase._id,
      date: getTransactionDate(
        purchase
      ),
      number:
        getTransactionNumber(
          purchase
        ),
      party: getPartyName(
        purchase
      ),
      description: getNarration(
        purchase,
        "Bank paid against purchase"
      ),
      receipt: 0,
      payment: round2(amount),
      accountId:
        getTransactionAccountId(
          purchase
        ),
      paymentAccountId:
        getPaymentAccountId(
          purchase
        ),
    });
  }

  for (const saleReturn of saleReturns) {
    if (
      !isBankTransaction(
        saleReturn,
        bankAccountIds
      )
    ) {
      continue;
    }

    const amount = getBankAmount(
      saleReturn,
      "sale_return"
    );

    if (amount <= 0) {
      continue;
    }

    entries.push({
      source: "sale_return",
      sourceId: saleReturn._id,
      date: getTransactionDate(
        saleReturn
      ),
      number:
        getTransactionNumber(
          saleReturn
        ),
      party:
        getPartyName(
          saleReturn
        ),
      description: getNarration(
        saleReturn,
        "Bank refunded against sale return"
      ),
      receipt: 0,
      payment: round2(amount),
      accountId:
        getTransactionAccountId(
          saleReturn
        ),
      paymentAccountId:
        getPaymentAccountId(
          saleReturn
        ),
    });
  }

  for (const purchaseReturn of purchaseReturns) {
    if (
      !isBankTransaction(
        purchaseReturn,
        bankAccountIds
      )
    ) {
      continue;
    }

    const amount = getBankAmount(
      purchaseReturn,
      "purchase_return"
    );

    if (amount <= 0) {
      continue;
    }

    entries.push({
      source: "purchase_return",
      sourceId:
        purchaseReturn._id,
      date: getTransactionDate(
        purchaseReturn
      ),
      number:
        getTransactionNumber(
          purchaseReturn
        ),
      party:
        getPartyName(
          purchaseReturn
        ),
      description: getNarration(
        purchaseReturn,
        "Bank received against purchase return"
      ),
      receipt: round2(amount),
      payment: 0,
      accountId:
        getTransactionAccountId(
          purchaseReturn
        ),
      paymentAccountId:
        getPaymentAccountId(
          purchaseReturn
        ),
    });
  }

  for (const payment of payments) {
    if (!payment.isActive) {
      continue;
    }

    if (
      !isBankTransaction(
        payment,
        bankAccountIds
      )
    ) {
      continue;
    }

    if (
      ["cash"].includes(
        String(
          payment.paymentMode
        ).toLowerCase()
      )
    ) {
      continue;
    }

    const amount = getBankAmount(
      payment,
      "payment"
    );

    if (amount <= 0) {
      continue;
    }

    entries.push({
      source: "payment",
      sourceId: payment._id,
      date: getTransactionDate(
        payment
      ),
      number:
        getTransactionNumber(
          payment
        ),
      party:
        getPartyName(payment),
      description: getNarration(
        payment,
        "Bank payment"
      ),
      receipt: 0,
      payment: round2(amount),
      accountId:
        getTransactionAccountId(
          payment
        ),
      paymentAccountId:
        getPaymentAccountId(
          payment
        ),
    });
  }

  let filteredEntries =
    entries;

  if (search) {
    const value = String(search)
      .toLowerCase()
      .trim();

    filteredEntries =
      entries.filter(
        (entry) => {
          return (
            String(
              entry.number || ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              entry.party || ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              entry.description || ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              entry.source || ""
            )
              .toLowerCase()
              .includes(value)
          );
        }
      );
  }

  filteredEntries.sort(
    (a, b) =>
      new Date(a.date) -
      new Date(b.date)
  );

  return filteredEntries;
};

const getOpeningBalanceBeforeDate =
  async ({
    companyId,
    financialYearId,
    branchId,
    fromDate,
  }) => {
    const bankAccounts =
      await getBankAccounts(
        companyId,
        branchId
      );

    let openingBalance = 0;

    for (const account of bankAccounts) {
      openingBalance +=
        getAccountOpeningBalance(
          account
        );
    }

    if (!fromDate) {
      return round2(
        openingBalance
      );
    }

    const beforeDate =
      new Date(fromDate);

    beforeDate.setHours(
      0,
      0,
      0,
      0
    );

    const [
      sales,
      purchases,
      saleReturns,
      purchaseReturns,
      payments,
    ] = await Promise.all([
      Sale.find({
        company: companyId,
        financialYear:
          financialYearId,
        ...(branchId
          ? { branch: branchId }
          : {}),
        invoiceDate: {
          $lt: beforeDate,
        },
      })
        .populate(
          "paymentAccount",
          "accountType"
        )
        .lean(),

      Purchase.find({
        company: companyId,
        financialYear:
          financialYearId,
        ...(branchId
          ? { branch: branchId }
          : {}),
        invoiceDate: {
          $lt: beforeDate,
        },
      })
        .populate(
          "paymentAccount",
          "accountType"
        )
        .lean(),

      SaleReturn.find({
        company: companyId,
        financialYear:
          financialYearId,
        ...(branchId
          ? { branch: branchId }
          : {}),
        returnDate: {
          $lt: beforeDate,
        },
      })
        .populate(
          "refundAccount",
          "accountType"
        )
        .lean(),

      PurchaseReturn.find({
        company: companyId,
        financialYear:
          financialYearId,
        ...(branchId
          ? { branch: branchId }
          : {}),
        returnDate: {
          $lt: beforeDate,
        },
      })
        .populate(
          "adjustmentAccount",
          "accountType"
        )
        .lean(),

      Payment.find({
        company: companyId,
        financialYear:
          financialYearId,
        ...(branchId
          ? { branch: branchId }
          : {}),
        paymentDate: {
          $lt: beforeDate,
        },
        isActive: true,
        paymentMode: {
          $ne: "cash",
        },
      })
        .populate(
          "paymentAccount",
          "accountType"
        )
        .lean(),
    ]);

    const isBank = (
      transaction,
      type
    ) => {
      let account;

      if (
        type === "sale_return"
      ) {
        account =
          transaction.refundAccount;
      } else if (
        type ===
        "purchase_return"
      ) {
        account =
          transaction.adjustmentAccount;
      } else {
        account =
          transaction.paymentAccount;
      }

      return (
        String(
          account?.accountType || ""
        ).toLowerCase() ===
        "bank"
      );
    };

    for (const sale of sales) {
      if (
        isBank(sale, "sale")
      ) {
        openingBalance +=
          getBankAmount(
            sale,
            "sale"
          );
      }
    }

    for (const purchase of purchases) {
      if (
        isBank(
          purchase,
          "purchase"
        )
      ) {
        openingBalance -=
          getBankAmount(
            purchase,
            "purchase"
          );
      }
    }

    for (const saleReturn of saleReturns) {
      if (
        isBank(
          saleReturn,
          "sale_return"
        )
      ) {
        openingBalance -=
          getBankAmount(
            saleReturn,
            "sale_return"
          );
      }
    }

    for (const purchaseReturn of purchaseReturns) {
      if (
        isBank(
          purchaseReturn,
          "purchase_return"
        )
      ) {
        openingBalance +=
          getBankAmount(
            purchaseReturn,
            "purchase_return"
          );
      }
    }

    for (const payment of payments) {
      if (
        isBank(
          payment,
          "payment"
        )
      ) {
        openingBalance -=
          getBankAmount(
            payment,
            "payment"
          );
      }
    }

    return round2(
      openingBalance
    );
  };

const validateContext = async (
  companyId,
  financialYearId,
  userId
) => {
  if (
    !companyId ||
    !financialYearId
  ) {
    return {
      error:
        "companyId and financialYearId are required",
    };
  }

  const company =
    await checkCompanyAccess(
      companyId,
      userId
    );

  if (!company) {
    return {
      error:
        "Company not found or access denied",
    };
  }

  const financialYear =
    await getFinancialYear(
      financialYearId,
      companyId
    );

  if (!financialYear) {
    return {
      error:
        "Financial year not found for this company",
    };
  }

  return {
    company,
    financialYear,
  };
};

const getBankBook = async (
  req,
  res
) => {
  try {
    const {
      companyId,
      financialYearId,
      branchId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const context =
      await validateContext(
        companyId,
        financialYearId,
        req.user.userId
      );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message:
          context.error,
      });
    }

    const dateValidation =
      validateDateRange(
        fromDate,
        toDate
      );

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          dateValidation.message,
      });
    }

    const entries =
      await buildBankBookEntries({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
        toDate:
          dateValidation.to,
        search,
      });

    const openingBalance =
      await getOpeningBalanceBeforeDate({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
      });

    let runningBalance =
      openingBalance;

    const calculatedEntries =
      entries.map((entry) => {
        runningBalance =
          round2(
            runningBalance +
              Number(
                entry.receipt || 0
              ) -
              Number(
                entry.payment || 0
              )
          );

        return {
          ...entry,
          receipt: round2(
            entry.receipt
          ),
          payment: round2(
            entry.payment
          ),
          balance:
            runningBalance,
        };
      });

    const totalReceipt =
      calculatedEntries.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.receipt || 0
          ),
        0
      );

    const totalPayment =
      calculatedEntries.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.payment || 0
          ),
        0
      );

    const closingBalance =
      round2(
        openingBalance +
          totalReceipt -
          totalPayment
      );

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

    const totalRecords =
      calculatedEntries.length;

    const totalPages =
      totalRecords === 0
        ? 0
        : Math.ceil(
            totalRecords /
              limitNumber
          );

    const startIndex =
      (pageNumber - 1) *
      limitNumber;

    const paginatedEntries =
      calculatedEntries.slice(
        startIndex,
        startIndex +
          limitNumber
      );

    return res.status(200).json({
      success: true,
      message:
        "Bank book fetched successfully",
      data: {
        companyId,
        branchId:
          branchId || null,
        financialYearId,
        financialYear:
          context.financialYear,
        filters: {
          fromDate:
            fromDate || null,
          toDate:
            toDate || null,
          search:
            search || "",
        },
        summary: {
          openingBalance:
            round2(
              openingBalance
            ),
          totalReceipt:
            round2(
              totalReceipt
            ),
          totalPayment:
            round2(
              totalPayment
            ),
          closingBalance:
            round2(
              closingBalance
            ),
        },
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalRecords,
          totalPages,
        },
        entries:
          paginatedEntries,
      },
    });
  } catch (error) {
    console.error(
      "getBankBook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch bank book",
      error: error.message,
    });
  }
};

const getBankBookSummary = async (
  req,
  res
) => {
  try {
    const {
      companyId,
      financialYearId,
      branchId,
      fromDate,
      toDate,
    } = req.query;

    const context =
      await validateContext(
        companyId,
        financialYearId,
        req.user.userId
      );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message:
          context.error,
      });
    }

    const dateValidation =
      validateDateRange(
        fromDate,
        toDate
      );

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          dateValidation.message,
      });
    }

    const entries =
      await buildBankBookEntries({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
        toDate:
          dateValidation.to,
      });

    const openingBalance =
      await getOpeningBalanceBeforeDate({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
      });

    const totalReceipt =
      entries.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.receipt || 0
          ),
        0
      );

    const totalPayment =
      entries.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.payment || 0
          ),
        0
      );

    const closingBalance =
      round2(
        openingBalance +
          totalReceipt -
          totalPayment
      );

    return res.status(200).json({
      success: true,
      message:
        "Bank book summary fetched successfully",
      data: {
        openingBalance:
          round2(
            openingBalance
          ),
        totalReceipt:
          round2(totalReceipt),
        totalPayment:
          round2(totalPayment),
        closingBalance:
          round2(closingBalance),
      },
    });
  } catch (error) {
    console.error(
      "getBankBookSummary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch bank book summary",
      error: error.message,
    });
  }
};

const getBankBookPdf = async (
  req,
  res
) => {
  try {
    const {
      companyId,
      financialYearId,
      branchId,
      fromDate,
      toDate,
      search,
    } = req.query;

    const context =
      await validateContext(
        companyId,
        financialYearId,
        req.user.userId
      );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message:
          context.error,
      });
    }

    const dateValidation =
      validateDateRange(
        fromDate,
        toDate
      );

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          dateValidation.message,
      });
    }

    const entries =
      await buildBankBookEntries({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
        toDate:
          dateValidation.to,
        search,
      });

    const openingBalance =
      await getOpeningBalanceBeforeDate({
        companyId,
        financialYearId,
        branchId,
        fromDate:
          dateValidation.from,
      });

    let runningBalance =
      openingBalance;

    const rows = entries.map(
      (entry) => {
        runningBalance =
          round2(
            runningBalance +
              Number(
                entry.receipt || 0
              ) -
              Number(
                entry.payment || 0
              )
          );

        return {
          ...entry,
          balance:
            runningBalance,
        };
      }
    );

    const totalReceipt =
      rows.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.receipt || 0
          ),
        0
      );

    const totalPayment =
      rows.reduce(
        (sum, entry) =>
          sum +
          Number(
            entry.payment || 0
          ),
        0
      );

    const closingBalance =
      round2(
        openingBalance +
          totalReceipt -
          totalPayment
      );

    const company =
      context.company;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="bank-book-${Date.now()}.pdf"`
    );

    const doc =
      new PDFDocument({
        size: "A4",
        margin: 35,
      });

    doc.pipe(res);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(
        company.name ||
          "Business Bill",
        {
          align: "center",
        }
      );

    doc
      .moveDown(0.3)
      .fontSize(14)
      .text("BANK BOOK", {
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Financial Year: ${
          context.financialYear
            .name ||
          context.financialYear
            .year ||
          ""
        }`
      );

    if (fromDate || toDate) {
      doc.text(
        `Period: ${formatDate(
          fromDate
        )} - ${formatDate(
          toDate
        )}`
      );
    }

    doc.moveDown();

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `Opening Balance: ${money(
          openingBalance
        )}`
      )
      .text(
        `Total Receipt: ${money(
          totalReceipt
        )}`
      )
      .text(
        `Total Payment: ${money(
          totalPayment
        )}`
      )
      .text(
        `Closing Balance: ${money(
          closingBalance
        )}`
      );

    doc.moveDown();

    const startX = 35;

    const columns = [
      {
        title: "Date",
        width: 55,
      },
      {
        title: "No.",
        width: 70,
      },
      {
        title: "Description",
        width: 145,
      },
      {
        title: "Receipt",
        width: 75,
      },
      {
        title: "Payment",
        width: 75,
      },
      {
        title: "Balance",
        width: 75,
      },
    ];

    let x = startX;
    const headerY = doc.y;

    doc
      .fontSize(8)
      .font("Helvetica-Bold");

    for (const column of columns) {
      doc.text(
        column.title,
        x,
        headerY,
        {
          width:
            column.width,
          align: "left",
        }
      );

      x += column.width;
    }

    doc
      .moveTo(
        startX,
        headerY + 15
      )
      .lineTo(
        560,
        headerY + 15
      )
      .stroke();

    let y = headerY + 22;

    doc.font("Helvetica");

    for (const row of rows) {
      if (y > 760) {
        doc.addPage();

        y = 40;

        x = startX;

        doc.font(
          "Helvetica-Bold"
        );

        for (const column of columns) {
          doc.text(
            column.title,
            x,
            y,
            {
              width:
                column.width,
            }
          );

          x += column.width;
        }

        doc
          .moveTo(
            startX,
            y + 15
          )
          .lineTo(
            560,
            y + 15
          )
          .stroke();

        y += 22;

        doc.font("Helvetica");
      }

      x = startX;

      const values = [
        formatDate(row.date),
        row.number || "",
        row.description || "",
        money(row.receipt),
        money(row.payment),
        money(row.balance),
      ];

      values.forEach(
        (value, index) => {
          doc.text(
            String(value),
            x,
            y,
            {
              width:
                columns[index]
                  .width,
              height: 28,
              ellipsis: true,
            }
          );

          x +=
            columns[index]
              .width;
        }
      );

      y += 28;
    }

    doc.end();
  } catch (error) {
    console.error(
      "getBankBookPdf error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate bank book PDF",
        error: error.message,
      });
    }
  }
};

module.exports = {
  getBankBook,
  getBankBookSummary,
  getBankBookPdf,
};