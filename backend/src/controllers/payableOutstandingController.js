const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const PurchaseReturn = require("../models/PurchaseReturn");
const Payment = require("../models/Payment");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

/*
 * Supplier opening balance.
 *
 * Supported structures:
 * 1. openingBalance + openingBalanceType
 * 2. openingBalance + balanceType
 * 3. openingBalance only
 *
 * For payable:
 * credit opening balance = payable
 * debit opening balance = advance
 */
const getSupplierOpeningBalance = (
  supplier
) => {
  const amount = round2(
    supplier.openingBalance || 0
  );

  const type = String(
    supplier.openingBalanceType ||
      supplier.balanceType ||
      "debit"
  ).toLowerCase();

  if (
    type === "credit" ||
    type === "cr"
  ) {
    return {
      payable: amount,
      advance: 0,
      net: amount,
    };
  }

  return {
    payable: 0,
    advance: amount,
    net: round2(-amount),
  };
};

const getPurchaseAmount = (
  purchase
) => {
  if (
    Number.isFinite(
      Number(purchase.totalAmount)
    )
  ) {
    return round2(
      purchase.totalAmount
    );
  }

  if (
    Number.isFinite(
      Number(purchase.invoiceAmount)
    )
  ) {
    return round2(
      purchase.invoiceAmount
    );
  }

  return 0;
};

const getPurchaseReturnAmount = (
  purchaseReturn
) => {
  if (
    Number.isFinite(
      Number(purchaseReturn.totalAmount)
    )
  ) {
    return round2(
      purchaseReturn.totalAmount
    );
  }

  if (
    Number.isFinite(
      Number(purchaseReturn.returnAmount)
    )
  ) {
    return round2(
      purchaseReturn.returnAmount
    );
  }

  return 0;
};

const getPaymentAmount = (
  payment
) => {
  return round2(
    payment.amount || 0
  );
};

const buildSupplierFilter = ({
  companyId,
  branchId,
  supplierId,
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
    supplierId &&
    isValidObjectId(supplierId)
  ) {
    filter._id = supplierId;
  }

  const cleanSearch =
    String(search || "").trim();

  if (cleanSearch) {
    const searchRegex = new RegExp(
      cleanSearch,
      "i"
    );

    filter.$and = [
      {
        $or: [
          {
            name: searchRegex,
          },
          {
            supplierCode: searchRegex,
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

const loadSupplierTransactions =
  async ({
    companyId,
    branchId,
    financialYearId,
    fromDate,
    toDate,
    supplierIds,
  }) => {
    if (!supplierIds.length) {
      return {
        purchases: [],
        purchaseReturns: [],
        payments: [],
      };
    }

    const supplierObjectIds =
      supplierIds.map(
        (id) =>
          new mongoose.Types.ObjectId(id)
      );

    const purchaseFilter = {
      company: companyId,
      financialYear: financialYearId,
      isActive: true,
      supplier: {
        $in: supplierObjectIds,
      },
    };

    const purchaseReturnFilter = {
      company: companyId,
      financialYear: financialYearId,
      isActive: true,
      supplier: {
        $in: supplierObjectIds,
      },
    };

    /*
     * Payment API does not necessarily have a supplier field.
     *
     * It uses:
     * account = party ledger account
     *
     * Therefore payments are first fetched by company/FY
     * and later matched against supplier.account.
     */
    const paymentFilter = {
      company: companyId,
      financialYear: financialYearId,
      isActive: true,
    };

    if (
      branchId &&
      isValidObjectId(branchId)
    ) {
      purchaseFilter.$or = [
        {
          branch: branchId,
        },
        {
          branch: null,
        },
      ];

      purchaseReturnFilter.$or = [
        {
          branch: branchId,
        },
        {
          branch: null,
        },
      ];

      paymentFilter.$or = [
        {
          branch: branchId,
        },
        {
          branch: null,
        },
      ];
    }

    if (fromDate || toDate) {
      purchaseFilter.invoiceDate = {};

      purchaseReturnFilter.returnDate = {};

      paymentFilter.paymentDate = {};

      if (fromDate) {
        purchaseFilter.invoiceDate.$gte =
          fromDate;

        purchaseReturnFilter.returnDate.$gte =
          fromDate;

        paymentFilter.paymentDate.$gte =
          fromDate;
      }

      if (toDate) {
        purchaseFilter.invoiceDate.$lte =
          toDate;

        purchaseReturnFilter.returnDate.$lte =
          toDate;

        paymentFilter.paymentDate.$lte =
          toDate;
      }
    }

    const [
      purchases,
      purchaseReturns,
      payments,
    ] = await Promise.all([
      Purchase.find(
        purchaseFilter
      )
        .select(
          "_id supplier account invoiceNumber invoiceDate totalAmount invoiceAmount paidAmount remainingAmount"
        )
        .lean(),

      PurchaseReturn.find(
        purchaseReturnFilter
      )
        .select(
          "_id supplier account returnNumber invoiceNumber returnDate totalAmount returnAmount adjustmentAmount"
        )
        .lean(),

      Payment.find(paymentFilter)
        .select(
          "_id account paymentAccount paymentNumber paymentDate amount paymentMode referenceNumber"
        )
        .lean(),
    ]);

    return {
      purchases,
      purchaseReturns,
      payments,
    };
  };

const calculateSupplierOutstanding =
  ({
    supplier,
    purchases,
    purchaseReturns,
    payments,
  }) => {
    const supplierId =
      supplier._id.toString();

    const supplierPurchases =
      purchases.filter(
        (purchase) =>
          sameId(
            purchase.supplier,
            supplierId
          )
      );

    const supplierPurchaseReturns =
      purchaseReturns.filter(
        (purchaseReturn) =>
          sameId(
            purchaseReturn.supplier,
            supplierId
          )
      );

    /*
     * Supplier master may contain an account reference.
     *
     * Supported names:
     * account
     * ledgerAccount
     * accountId
     */
    const supplierAccountId =
      supplier.account ||
      supplier.ledgerAccount ||
      supplier.accountId ||
      null;

    const supplierPayments =
      supplierAccountId
        ? payments.filter(
            (payment) =>
              sameId(
                payment.account,
                supplierAccountId
              )
          )
        : [];

    const opening =
      getSupplierOpeningBalance(
        supplier
      );

    const purchaseAmount =
      round2(
        supplierPurchases.reduce(
          (total, purchase) =>
            total +
            getPurchaseAmount(
              purchase
            ),
          0
        )
      );

    const purchaseReturnAmount =
      round2(
        supplierPurchaseReturns.reduce(
          (
            total,
            purchaseReturn
          ) =>
            total +
            getPurchaseReturnAmount(
              purchaseReturn
            ),
          0
        )
      );

    const paymentAmount =
      round2(
        supplierPayments.reduce(
          (total, payment) =>
            total +
            getPaymentAmount(
              payment
            ),
          0
        )
      );

    /*
     * Net payable:
     *
     * Opening payable
     * + Purchases
     * - Purchase Returns
     * - Payments
     * - Opening advance
     */
    const netBalance =
      round2(
        opening.net +
          purchaseAmount -
          purchaseReturnAmount -
          paymentAmount
      );

    const payableAmount =
      netBalance > 0
        ? netBalance
        : 0;

    const advanceAmount =
      netBalance < 0
        ? round2(
            Math.abs(netBalance)
          )
        : 0;

    const debitAmount =
      round2(
        opening.advance +
          purchaseReturnAmount +
          paymentAmount
      );

    const creditAmount =
      round2(
        opening.payable +
          purchaseAmount
      );

    return {
      supplierId:
        supplier._id,

      supplierCode:
        supplier.supplierCode || "",

      supplierName:
        supplier.name || "",

      contactPerson:
        supplier.contactPerson || "",

      phone:
        supplier.phone || "",

      email:
        supplier.email || "",

      gstNumber:
        supplier.gstNumber || "",

      openingPayable:
        opening.payable,

      openingAdvance:
        opening.advance,

      purchaseAmount,

      purchaseReturnAmount,

      paymentAmount,

      debitAmount,

      creditAmount,

      payableAmount,

      advanceAmount,

      netBalance,

      totalPurchaseInvoices:
        supplierPurchases.length,

      totalPurchaseReturns:
        supplierPurchaseReturns.length,

      totalPayments:
        supplierPayments.length,

      status:
        netBalance > 0
          ? "payable"
          : netBalance < 0
          ? "advance"
          : "settled",
    };
  };

const getPayableOutstanding =
  async (req, res) => {
    try {
      const {
        companyId,
        branchId,
        financialYearId,
        fromDate: fromDateQuery,
        toDate: toDateQuery,
        supplierId,
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
        supplierId &&
        !isValidObjectId(supplierId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid supplierId",
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

      const supplierFilter =
        buildSupplierFilter({
          companyId,
          branchId,
          supplierId,
          search:
            String(search).trim(),
        });

      const suppliers =
        await Supplier.find(
          supplierFilter
        )
          .sort({
            name: 1,
          })
          .lean();

      const supplierIds =
        suppliers.map(
          (supplier) =>
            supplier._id.toString()
        );

      const {
        purchases,
        purchaseReturns,
        payments,
      } =
        await loadSupplierTransactions({
          companyId,
          branchId,
          financialYearId:
            financialYear._id,
          fromDate:
            dateValidation.fromDate,
          toDate:
            dateValidation.toDate,
          supplierIds,
        });

      const rows =
        suppliers.map(
          (supplier) =>
            calculateSupplierOutstanding({
              supplier,
              purchases,
              purchaseReturns,
              payments,
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
                row.payableAmount >
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
            result.totalSuppliers += 1;

            result.totalOpeningPayable =
              round2(
                result.totalOpeningPayable +
                  row.openingPayable
              );

            result.totalOpeningAdvance =
              round2(
                result.totalOpeningAdvance +
                  row.openingAdvance
              );

            result.totalPurchases =
              round2(
                result.totalPurchases +
                  row.purchaseAmount
              );

            result.totalPurchaseReturns =
              round2(
                result.totalPurchaseReturns +
                  row.purchaseReturnAmount
              );

            result.totalPayments =
              round2(
                result.totalPayments +
                  row.paymentAmount
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

            result.totalPayable =
              round2(
                result.totalPayable +
                  row.payableAmount
              );

            result.totalAdvance =
              round2(
                result.totalAdvance +
                  row.advanceAmount
              );

            result.payableSuppliers +=
              row.status ===
              "payable"
                ? 1
                : 0;

            result.advanceSuppliers +=
              row.status ===
              "advance"
                ? 1
                : 0;

            result.settledSuppliers +=
              row.status ===
              "settled"
                ? 1
                : 0;

            return result;
          },
          {
            totalSuppliers: 0,
            totalOpeningPayable: 0,
            totalOpeningAdvance: 0,
            totalPurchases: 0,
            totalPurchaseReturns: 0,
            totalPayments: 0,
            totalDebit: 0,
            totalCredit: 0,
            totalPayable: 0,
            totalAdvance: 0,
            payableSuppliers: 0,
            advanceSuppliers: 0,
            settledSuppliers: 0,
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Payable outstanding report fetched successfully",

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

          supplierId:
            supplierId || null,

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

        suppliers:
          paginatedRows,

        accountingRules: {
          openingCredit:
            "Increase payable",

          openingDebit:
            "Increase supplier advance",

          purchase:
            "Increase payable",

          purchaseReturn:
            "Decrease payable",

          payment:
            "Decrease payable",

          challan:
            "No payable movement",

          quotation:
            "No payable movement",
        },
      });
    } catch (error) {
      console.error(
        "Payable Outstanding Report Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payable outstanding report",
        error: error.message,
      });
    }
  };

module.exports = {
  getPayableOutstanding,
};