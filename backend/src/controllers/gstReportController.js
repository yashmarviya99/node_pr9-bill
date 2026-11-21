const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");

const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const parseDate = (value) => {
  if (!value) {
    return null;
  }

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
  if (!first || !second) {
    return false;
  }

  return first.toString() === second.toString();
};

const checkCompanyAccess = async (
  companyId,
  userId
) => {
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
  const from = fromDate
    ? getStartOfDay(fromDate)
    : null;

  const to = toDate
    ? getEndOfDay(toDate)
    : null;

  if (from && to && from > to) {
    return {
      error:
        "From date cannot be greater than To date",
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

const getTaxableAmount = (document) => {
  if (
    Number.isFinite(
      Number(document.taxableAmount)
    )
  ) {
    return round2(
      document.taxableAmount
    );
  }

  return round2(
    (document.items || []).reduce(
      (total, item) =>
        total +
        Number(item.taxableAmount || 0),
      0
    )
  );
};

const getCgstAmount = (document) => {
  if (
    Number.isFinite(
      Number(document.cgstAmount)
    )
  ) {
    return round2(
      document.cgstAmount
    );
  }

  return round2(
    (document.items || []).reduce(
      (total, item) =>
        total +
        Number(item.cgstAmount || 0),
      0
    )
  );
};

const getSgstAmount = (document) => {
  if (
    Number.isFinite(
      Number(document.sgstAmount)
    )
  ) {
    return round2(
      document.sgstAmount
    );
  }

  return round2(
    (document.items || []).reduce(
      (total, item) =>
        total +
        Number(item.sgstAmount || 0),
      0
    )
  );
};

const getIgstAmount = (document) => {
  if (
    Number.isFinite(
      Number(document.igstAmount)
    )
  ) {
    return round2(
      document.igstAmount
    );
  }

  return round2(
    (document.items || []).reduce(
      (total, item) =>
        total +
        Number(item.igstAmount || 0),
      0
    )
  );
};

const getTotalGst = (document) => {
  return round2(
    getCgstAmount(document) +
      getSgstAmount(document) +
      getIgstAmount(document)
  );
};

const getTotalAmount = (document) => {
  if (
    Number.isFinite(
      Number(document.totalAmount)
    )
  ) {
    return round2(
      document.totalAmount
    );
  }

  return round2(
    document.invoiceAmount ||
      document.returnAmount ||
      0
  );
};

const getProductIdsFromDocument = (
  document
) => {
  return (document.items || [])
    .map((item) => {
      const product =
        item.product?._id ||
        item.product;

      return product
        ? product.toString()
        : null;
    })
    .filter(Boolean);
};

const documentMatchesProduct = (
  document,
  productId
) => {
  if (!productId) {
    return true;
  }

  return getProductIdsFromDocument(
    document
  ).some(
    (id) =>
      id === productId.toString()
  );
};

const documentMatchesSearch = (
  document,
  search
) => {
  const cleanSearch =
    String(search || "")
      .trim()
      .toLowerCase();

  if (!cleanSearch) {
    return true;
  }

  const values = [
    document.invoiceNumber,
    document.returnNumber,
    document.narration,
    document.customer?.name,
    document.customer?.customerCode,
    document.customer?.phone,
    document.supplier?.name,
    document.supplier?.supplierCode,
    document.supplier?.phone,
    ...(document.items || []).map(
      (item) =>
        `${item.productName || ""} ${
          item.hsnSac || ""
        }`
    ),
  ];

  return values.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(cleanSearch)
  );
};

const buildBaseFilter = ({
  companyId,
  branchId,
  financialYearId,
  fromDate,
  toDate,
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

  return filter;
};

const addDateFilter = (
  filter,
  field,
  fromDate,
  toDate
) => {
  if (!fromDate && !toDate) {
    return;
  }

  filter[field] = {};

  if (fromDate) {
    filter[field].$gte = fromDate;
  }

  if (toDate) {
    filter[field].$lte = toDate;
  }
};

const createTransaction = ({
  type,
  source,
  document,
}) => {
  const taxableAmount =
    getTaxableAmount(document);

  const cgstAmount =
    getCgstAmount(document);

  const sgstAmount =
    getSgstAmount(document);

  const igstAmount =
    getIgstAmount(document);

  const totalGst =
    round2(
      cgstAmount +
        sgstAmount +
        igstAmount
    );

  const isSale =
    type === "sale";

  const isPurchase =
    type === "purchase";

  const isSaleReturn =
    type === "sale_return";

  const isPurchaseReturn =
    type === "purchase_return";

  return {
    id: document._id,

    type,

    source,

    date:
      document.invoiceDate ||
      document.returnDate,

    invoiceNumber:
      document.invoiceNumber ||
      null,

    returnNumber:
      document.returnNumber ||
      null,

    voucherNumber:
      document.invoiceNumber ||
      document.returnNumber ||
      "",

    account:
      document.account
        ? {
            _id:
              document.account._id ||
              document.account,

            name:
              document.account.name ||
              "",
          }
        : null,

    customer:
      document.customer
        ? {
            _id:
              document.customer._id ||
              document.customer,

            name:
              document.customer.name ||
              "",

            customerCode:
              document.customer.customerCode ||
              "",
          }
        : null,

    supplier:
      document.supplier
        ? {
            _id:
              document.supplier._id ||
              document.supplier,

            name:
              document.supplier.name ||
              "",

            supplierCode:
              document.supplier.supplierCode ||
              "",
          }
        : null,

    productIds:
      getProductIdsFromDocument(
        document
      ),

    taxableAmount,

    cgstAmount,

    sgstAmount,

    igstAmount,

    totalGst,

    totalAmount:
      getTotalAmount(document),

    gstType:
      igstAmount > 0
        ? "IGST"
        : cgstAmount > 0 ||
          sgstAmount > 0
        ? "CGST_SGST"
        : "NONE",

    direction:
      isSale || isSaleReturn
        ? "output"
        : isPurchase ||
          isPurchaseReturn
        ? "input"
        : "unknown",

    isReturn:
      isSaleReturn ||
      isPurchaseReturn,

    narration:
      document.narration || "",
  };
};

const getGstReport = async (
  req,
  res
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      fromDate: fromDateQuery,
      toDate: toDateQuery,
      productId,
      customerId,
      supplierId,
      accountId,
      search = "",
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
      productId &&
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid productId",
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

    if (
      supplierId &&
      !isValidObjectId(supplierId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid supplierId",
      });
    }

    if (
      accountId &&
      !isValidObjectId(accountId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid accountId",
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

    const commonOptions = {
      companyId,
      branchId,
      financialYearId:
        financialYear._id,
      fromDate:
        dateValidation.fromDate,
      toDate:
        dateValidation.toDate,
    };

    const saleFilter =
      buildBaseFilter(
        commonOptions
      );

    const purchaseFilter =
      buildBaseFilter(
        commonOptions
      );

    const saleReturnFilter =
      buildBaseFilter(
        commonOptions
      );

    const purchaseReturnFilter =
      buildBaseFilter(
        commonOptions
      );

    addDateFilter(
      saleFilter,
      "invoiceDate",
      dateValidation.fromDate,
      dateValidation.toDate
    );

    addDateFilter(
      purchaseFilter,
      "invoiceDate",
      dateValidation.fromDate,
      dateValidation.toDate
    );

    addDateFilter(
      saleReturnFilter,
      "returnDate",
      dateValidation.fromDate,
      dateValidation.toDate
    );

    addDateFilter(
      purchaseReturnFilter,
      "returnDate",
      dateValidation.fromDate,
      dateValidation.toDate
    );

    if (
      accountId &&
      isValidObjectId(accountId)
    ) {
      saleFilter.account =
        accountId;

      purchaseFilter.account =
        accountId;

      saleReturnFilter.account =
        accountId;

      purchaseReturnFilter.account =
        accountId;
    }

    if (
      customerId &&
      isValidObjectId(customerId)
    ) {
      saleFilter.customer =
        customerId;

      saleReturnFilter.customer =
        customerId;
    }

    if (
      supplierId &&
      isValidObjectId(supplierId)
    ) {
      purchaseFilter.supplier =
        supplierId;

      purchaseReturnFilter.supplier =
        supplierId;
    }

    const [
      sales,
      purchases,
      saleReturns,
      purchaseReturns,
    ] = await Promise.all([
      Sale.find(saleFilter)
        .populate(
          "account",
          "_id name accountCode"
        )
        .populate(
          "customer",
          "_id name customerCode phone"
        )
        .populate(
          "items.product",
          "_id name productCode"
        )
        .sort({
          invoiceDate: 1,
          _id: 1,
        })
        .lean(),

      Purchase.find(purchaseFilter)
        .populate(
          "account",
          "_id name accountCode"
        )
        .populate(
          "supplier",
          "_id name supplierCode phone"
        )
        .populate(
          "items.product",
          "_id name productCode"
        )
        .sort({
          invoiceDate: 1,
          _id: 1,
        })
        .lean(),

      SaleReturn.find(
        saleReturnFilter
      )
        .populate(
          "account",
          "_id name accountCode"
        )
        .populate(
          "customer",
          "_id name customerCode phone"
        )
        .populate(
          "items.product",
          "_id name productCode"
        )
        .sort({
          returnDate: 1,
          _id: 1,
        })
        .lean(),

      PurchaseReturn.find(
        purchaseReturnFilter
      )
        .populate(
          "account",
          "_id name accountCode"
        )
        .populate(
          "supplier",
          "_id name supplierCode phone"
        )
        .populate(
          "items.product",
          "_id name productCode"
        )
        .sort({
          returnDate: 1,
          _id: 1,
        })
        .lean(),
    ]);

    let transactions = [
      ...sales.map(
        (document) =>
          createTransaction({
            type: "sale",
            source: "Sale",
            document,
          })
      ),

      ...purchases.map(
        (document) =>
          createTransaction({
            type: "purchase",
            source: "Purchase",
            document,
          })
      ),

      ...saleReturns.map(
        (document) =>
          createTransaction({
            type: "sale_return",
            source: "Sale Return",
            document,
          })
      ),

      ...purchaseReturns.map(
        (document) =>
          createTransaction({
            type: "purchase_return",
            source: "Purchase Return",
            document,
          })
      ),
    ];

    transactions =
      transactions.filter(
        (transaction) => {
          if (
            productId &&
            !transaction.productIds.includes(
              productId.toString()
            )
          ) {
            return false;
          }

          if (
            search &&
            !documentMatchesSearch(
              {
                invoiceNumber:
                  transaction.invoiceNumber,
                returnNumber:
                  transaction.returnNumber,
                narration:
                  transaction.narration,
                customer:
                  transaction.customer,
                supplier:
                  transaction.supplier,
                items: [],
              },
              search
            )
          ) {
            const searchableText =
              [
                transaction.invoiceNumber,
                transaction.returnNumber,
                transaction.narration,
                transaction.customer
                  ?.name,
                transaction.customer
                  ?.customerCode,
                transaction.supplier
                  ?.name,
                transaction.supplier
                  ?.supplierCode,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (
              !searchableText.includes(
                String(search)
                  .trim()
                  .toLowerCase()
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );

    transactions.sort(
      (first, second) => {
        const firstDate =
          new Date(
            first.date || 0
          ).getTime();

        const secondDate =
          new Date(
            second.date || 0
          ).getTime();

        if (
          firstDate !==
          secondDate
        ) {
          return (
            firstDate -
            secondDate
          );
        }

        return String(
          first.voucherNumber || ""
        ).localeCompare(
          String(
            second.voucherNumber || ""
          )
        );
      }
    );

    const summary = {
      totalTransactions:
        transactions.length,

      sales: {
        invoices:
          sales.length,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      saleReturns: {
        invoices:
          saleReturns.length,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      purchases: {
        invoices:
          purchases.length,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      purchaseReturns: {
        invoices:
          purchaseReturns.length,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      outputGst: {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      inputGst: {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },

      net: {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGst: 0,
      },
    };

    const addSummary = (
      target,
      transaction
    ) => {
      target.taxableAmount =
        round2(
          target.taxableAmount +
            transaction.taxableAmount
        );

      target.cgstAmount =
        round2(
          target.cgstAmount +
            transaction.cgstAmount
        );

      target.sgstAmount =
        round2(
          target.sgstAmount +
            transaction.sgstAmount
        );

      target.igstAmount =
        round2(
          target.igstAmount +
            transaction.igstAmount
        );

      target.totalGst =
        round2(
          target.cgstAmount +
            target.sgstAmount +
            target.igstAmount
        );
    };

    transactions.forEach(
      (transaction) => {
        if (
          transaction.type ===
          "sale"
        ) {
          addSummary(
            summary.sales,
            transaction
          );
        }

        if (
          transaction.type ===
          "sale_return"
        ) {
          addSummary(
            summary.saleReturns,
            transaction
          );
        }

        if (
          transaction.type ===
          "purchase"
        ) {
          addSummary(
            summary.purchases,
            transaction
          );
        }

        if (
          transaction.type ===
          "purchase_return"
        ) {
          addSummary(
            summary.purchaseReturns,
            transaction
          );
        }
      }
    );

    summary.outputGst.taxableAmount =
      round2(
        summary.sales.taxableAmount -
          summary.saleReturns.taxableAmount
      );

    summary.outputGst.cgstAmount =
      round2(
        summary.sales.cgstAmount -
          summary.saleReturns.cgstAmount
      );

    summary.outputGst.sgstAmount =
      round2(
        summary.sales.sgstAmount -
          summary.saleReturns.sgstAmount
      );

    summary.outputGst.igstAmount =
      round2(
        summary.sales.igstAmount -
          summary.saleReturns.igstAmount
      );

    summary.outputGst.totalGst =
      round2(
        summary.outputGst.cgstAmount +
          summary.outputGst.sgstAmount +
          summary.outputGst.igstAmount
      );

    summary.inputGst.taxableAmount =
      round2(
        summary.purchases.taxableAmount -
          summary.purchaseReturns.taxableAmount
      );

    summary.inputGst.cgstAmount =
      round2(
        summary.purchases.cgstAmount -
          summary.purchaseReturns.cgstAmount
      );

    summary.inputGst.sgstAmount =
      round2(
        summary.purchases.sgstAmount -
          summary.purchaseReturns.sgstAmount
      );

    summary.inputGst.igstAmount =
      round2(
        summary.purchases.igstAmount -
          summary.purchaseReturns.igstAmount
      );

    summary.inputGst.totalGst =
      round2(
        summary.inputGst.cgstAmount +
          summary.inputGst.sgstAmount +
          summary.inputGst.igstAmount
      );

    summary.net.taxableAmount =
      round2(
        summary.outputGst.taxableAmount -
          summary.inputGst.taxableAmount
      );

    summary.net.cgstAmount =
      round2(
        summary.outputGst.cgstAmount -
          summary.inputGst.cgstAmount
      );

    summary.net.sgstAmount =
      round2(
        summary.outputGst.sgstAmount -
          summary.inputGst.sgstAmount
      );

    summary.net.igstAmount =
      round2(
        summary.outputGst.igstAmount -
          summary.inputGst.igstAmount
      );

    summary.net.totalGst =
      round2(
        summary.net.cgstAmount +
          summary.net.sgstAmount +
          summary.net.igstAmount
      );

    const total =
      transactions.length;

    const totalPages =
      Math.ceil(
        total / safeLimit
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const paginatedTransactions =
      transactions.slice(
        skip,
        skip + safeLimit
      );

    return res.status(200).json({
      success: true,

      message:
        "GST report fetched successfully",

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

        productId:
          productId || null,

        customerId:
          customerId || null,

        supplierId:
          supplierId || null,

        accountId:
          accountId || null,

        search:
          String(search).trim(),
      },

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      },

      summary,

      transactions:
        paginatedTransactions,

      accountingRules: {
        sales:
          "Sales GST is Output GST",

        saleReturn:
          "Sale Return GST reduces Output GST",

        purchases:
          "Purchase GST is Input GST",

        purchaseReturn:
          "Purchase Return GST reduces Input GST",

        outputGst:
          "Sales GST - Sale Return GST",

        inputGst:
          "Purchase GST - Purchase Return GST",

        netGst:
          "Output GST - Input GST",

        challan:
          "No GST report movement until Sale is created",

        quotation:
          "No GST report movement until transaction is converted",
      },
    });
  } catch (error) {
    console.error(
      "GST Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch GST report",
      error: error.message,
    });
  }
};

module.exports = {
  getGstReport,
};