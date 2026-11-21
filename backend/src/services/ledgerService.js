const Account = require("../models/Account");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Journal = require("../models/Journal");

const round2 = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

const idOf = (value) =>
  value ? value.toString() : null;

const amountOf = (...values) => {
  for (const value of values) {
    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number > 0
    ) {
      return round2(number);
    }
  }

  return 0;
};

const baseFilter = ({
  companyId,
  financialYearId,
  branchId,
}) => {
  const filter = {
    company: companyId,
    financialYear: financialYearId,
    isActive: true,
  };

  if (branchId) {
    filter.branch = branchId;
  }

  return filter;
};

const pushEntry = (
  entries,
  data
) => {
  const accountId =
    idOf(data.accountId);

  const debit =
    round2(data.debit);

  const credit =
    round2(data.credit);

  if (
    !accountId ||
    (debit === 0 && credit === 0)
  ) {
    return;
  }

  entries.push({
    _id: `${data.source}-${data.transactionId}-${accountId}-${data.side}`,

    transactionId:
      data.transactionId,

    source:
      data.source,

    number:
      data.number || "-",

    date:
      data.date,

    accountId,

    debit,

    credit,

    narration:
      data.narration || "",

    referenceNumber:
      data.referenceNumber || "",

    branchId:
      data.branchId || null,

    side:
      data.side,
  });
};

/* =========================================================
   BUILD ALL LEDGER TRANSACTIONS
========================================================= */

const buildEntries = async ({
  companyId,
  financialYearId,
  branchId,
}) => {
  const filter = baseFilter({
    companyId,
    financialYearId,
    branchId,
  });

  const [
    sales,
    purchases,
    saleReturns,
    purchaseReturns,
    payments,
    receipts,
    incomes,
    expenses,
    journals,
  ] = await Promise.all([
    Sale.find(filter).lean(),

    Purchase.find(filter).lean(),

    SaleReturn.find(filter).lean(),

    PurchaseReturn.find(filter).lean(),

    Payment.find(filter).lean(),

    Receipt.find(filter).lean(),

    Income.find(filter).lean(),

    Expense.find(filter).lean(),

    Journal.find(filter).lean(),
  ]);

  const entries = [];

  /* =======================================================
     SALE
     
     Customer / Party = Debit
     Cash / Bank paid amount = Debit
  ======================================================= */

  for (const sale of sales) {
    const total = amountOf(
      sale.totalAmount,
      sale.invoiceAmount
    );

    pushEntry(entries, {
      source: "sale",

      transactionId:
        sale._id,

      number:
        sale.invoiceNumber,

      date:
        sale.invoiceDate,

      accountId:
        sale.account,

      debit:
        total,

      credit:
        0,

      narration:
        sale.narration,

      branchId:
        sale.branch,

      side:
        "party",
    });

    const paid = amountOf(
      sale.paidAmount,
      sale.paymentAmount
    );

    if (
      sale.paymentAccount &&
      paid > 0
    ) {
      pushEntry(entries, {
        source: "sale",

        transactionId:
          sale._id,

        number:
          sale.invoiceNumber,

        date:
          sale.invoiceDate,

        accountId:
          sale.paymentAccount,

        debit:
          paid,

        credit:
          0,

        narration:
          sale.narration,

        branchId:
          sale.branch,

        side:
          "payment",
      });
    }
  }

  /* =======================================================
     PURCHASE
     
     Supplier / Party = Credit
     Cash / Bank paid amount = Credit
  ======================================================= */

  for (const purchase of purchases) {
    const total = amountOf(
      purchase.totalAmount,
      purchase.invoiceAmount
    );

    pushEntry(entries, {
      source: "purchase",

      transactionId:
        purchase._id,

      number:
        purchase.invoiceNumber,

      date:
        purchase.invoiceDate,

      accountId:
        purchase.account,

      debit:
        0,

      credit:
        total,

      narration:
        purchase.narration,

      branchId:
        purchase.branch,

      side:
        "party",
    });

    const paid = amountOf(
      purchase.paidAmount,
      purchase.paymentAmount
    );

    if (
      purchase.paymentAccount &&
      paid > 0
    ) {
      pushEntry(entries, {
        source: "purchase",

        transactionId:
          purchase._id,

        number:
          purchase.invoiceNumber,

        date:
          purchase.invoiceDate,

        accountId:
          purchase.paymentAccount,

        debit:
          0,

        credit:
          paid,

        narration:
          purchase.narration,

        branchId:
          purchase.branch,

        side:
          "payment",
      });
    }
  }

  /* =======================================================
     SALE RETURN
     
     Customer / Party = Credit
     Refund Account = Credit
  ======================================================= */

  for (const item of saleReturns) {
    const total = amountOf(
      item.totalAmount,
      item.returnAmount
    );

    pushEntry(entries, {
      source: "sale_return",

      transactionId:
        item._id,

      number:
        item.returnNumber,

      date:
        item.returnDate,

      accountId:
        item.account,

      debit:
        0,

      credit:
        total,

      narration:
        item.narration,

      branchId:
        item.branch,

      side:
        "party",
    });

    const refund = amountOf(
      item.refundAmount
    );

    if (
      item.refundAccount &&
      refund > 0
    ) {
      pushEntry(entries, {
        source: "sale_return",

        transactionId:
          item._id,

        number:
          item.returnNumber,

        date:
          item.returnDate,

        accountId:
          item.refundAccount,

        debit:
          0,

        credit:
          refund,

        narration:
          item.narration,

        branchId:
          item.branch,

        side:
          "refund",
      });
    }
  }

  /* =======================================================
     PURCHASE RETURN
     
     Supplier / Party = Debit
     Adjustment Account = Debit
  ======================================================= */

  for (
    const item of purchaseReturns
  ) {
    const total = amountOf(
      item.totalAmount,
      item.returnAmount
    );

    pushEntry(entries, {
      source: "purchase_return",

      transactionId:
        item._id,

      number:
        item.returnNumber,

      date:
        item.returnDate,

      accountId:
        item.account,

      debit:
        total,

      credit:
        0,

      narration:
        item.narration,

      branchId:
        item.branch,

      side:
        "party",
    });

    const adjustment =
      amountOf(
        item.adjustmentAmount
      );

    if (
      item.adjustmentAccount &&
      adjustment > 0
    ) {
      pushEntry(entries, {
        source:
          "purchase_return",

        transactionId:
          item._id,

        number:
          item.returnNumber,

        date:
          item.returnDate,

        accountId:
          item.adjustmentAccount,

        debit:
          adjustment,

        credit:
          0,

        narration:
          item.narration,

        branchId:
          item.branch,

        side:
          "adjustment",
      });
    }
  }

  /* =======================================================
     PAYMENT
     
     Party = Debit
     Cash / Bank = Credit
  ======================================================= */

  for (const item of payments) {
    pushEntry(entries, {
      source: "payment",

      transactionId:
        item._id,

      number:
        item.paymentNumber,

      date:
        item.paymentDate,

      accountId:
        item.account,

      debit:
        item.amount,

      credit:
        0,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "party",
    });

    pushEntry(entries, {
      source: "payment",

      transactionId:
        item._id,

      number:
        item.paymentNumber,

      date:
        item.paymentDate,

      accountId:
        item.paymentAccount,

      debit:
        0,

      credit:
        item.amount,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "payment",
    });
  }

  /* =======================================================
     RECEIPT
     
     Cash / Bank = Debit
     Party = Credit
  ======================================================= */

  for (const item of receipts) {
    pushEntry(entries, {
      source: "receipt",

      transactionId:
        item._id,

      number:
        item.receiptNumber,

      date:
        item.receiptDate,

      accountId:
        item.receiptAccount,

      debit:
        item.amount,

      credit:
        0,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "receipt",
    });

    pushEntry(entries, {
      source: "receipt",

      transactionId:
        item._id,

      number:
        item.receiptNumber,

      date:
        item.receiptDate,

      accountId:
        item.account,

      debit:
        0,

      credit:
        item.amount,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "party",
    });
  }

  /* =======================================================
     INCOME
     
     Cash / Bank = Debit
     Income Account = Credit
  ======================================================= */

  for (const item of incomes) {
    pushEntry(entries, {
      source: "income",

      transactionId:
        item._id,

      number:
        item.incomeNumber,

      date:
        item.incomeDate,

      accountId:
        item.account,

      debit:
        item.amount,

      credit:
        0,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "receipt",
    });

    pushEntry(entries, {
      source: "income",

      transactionId:
        item._id,

      number:
        item.incomeNumber,

      date:
        item.incomeDate,

      accountId:
        item.incomeAccount,

      debit:
        0,

      credit:
        item.amount,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "income",
    });
  }

  /* =======================================================
     EXPENSE
     
     Expense Account = Debit
     Cash / Bank = Credit
  ======================================================= */

  for (const item of expenses) {
    pushEntry(entries, {
      source: "expense",

      transactionId:
        item._id,

      number:
        item.expenseNumber,

      date:
        item.expenseDate,

      accountId:
        item.expenseAccount,

      debit:
        item.amount,

      credit:
        0,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "expense",
    });

    pushEntry(entries, {
      source: "expense",

      transactionId:
        item._id,

      number:
        item.expenseNumber,

      date:
        item.expenseDate,

      accountId:
        item.account,

      debit:
        0,

      credit:
        item.amount,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "payment",
    });
  }

  /* =======================================================
     JOURNAL
     
     Debit Account = Debit
     Credit Account = Credit
  ======================================================= */

  for (const item of journals) {
    pushEntry(entries, {
      source: "journal",

      transactionId:
        item._id,

      number:
        item.journalNumber,

      date:
        item.journalDate,

      accountId:
        item.debitAccount,

      debit:
        item.amount,

      credit:
        0,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "debit",
    });

    pushEntry(entries, {
      source: "journal",

      transactionId:
        item._id,

      number:
        item.journalNumber,

      date:
        item.journalDate,

      accountId:
        item.creditAccount,

      debit:
        0,

      credit:
        item.amount,

      narration:
        item.narration,

      referenceNumber:
        item.referenceNumber,

      branchId:
        item.branch,

      side:
        "credit",
    });
  }

  entries.sort((a, b) => {
    const dateDiff =
      new Date(a.date) -
      new Date(b.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(
      a.number
    ).localeCompare(
      String(b.number)
    );
  });

  return entries;
};

/* =========================================================
   ACCOUNTS
========================================================= */

const getAccounts = async ({
  companyId,
  accountId,
  search,
}) => {
  const filter = {
    company: companyId,

    isActive: {
      $ne: false,
    },
  };

  if (accountId) {
    filter._id = accountId;
  }

  if (search) {
    filter.name = {
      $regex: search,
      $options: "i",
    };
  }

  return Account.find(filter)
    .sort({
      name: 1,
    })
    .lean();
};

/* =========================================================
   OPENING BALANCE
========================================================= */

const getAccountOpening = (
  account
) => {
  const amount =
    round2(
      account?.openingBalance
    );

  if (
    String(
      account?.openingBalanceType
    ).toLowerCase() ===
    "credit"
  ) {
    return {
      debit: 0,
      credit: amount,
    };
  }

  return {
    debit: amount,
    credit: 0,
  };
};

/* =========================================================
   LEDGER SUMMARY DATA
========================================================= */

const getLedgerSummaryData =
  async ({
    companyId,
    financialYearId,
    branchId,
    accountId,
    search,
  }) => {
    const [
      accounts,
      entries,
    ] = await Promise.all([
      getAccounts({
        companyId,
        accountId,
        search,
      }),

      buildEntries({
        companyId,
        financialYearId,
        branchId,
      }),
    ]);

    const summaries =
      accounts.map(
        (account) => {
          const opening =
            getAccountOpening(
              account
            );

          let debit =
            opening.debit;

          let credit =
            opening.credit;

          for (
            const entry of entries
          ) {
            if (
              entry.accountId !==
              idOf(account._id)
            ) {
              continue;
            }

            debit =
              round2(
                debit +
                  entry.debit
              );

            credit =
              round2(
                credit +
                  entry.credit
              );
          }

          const difference =
            round2(
              debit - credit
            );

          return {
            accountId:
              account._id,

            accountCode:
              account.accountCode ||
              "",

            accountName:
              account.name,

            accountType:
              account.accountType ||
              null,

            debit:
              round2(debit),

            credit:
              round2(credit),

            balance:
              Math.abs(
                difference
              ),

            balanceType:
              difference >= 0
                ? "Dr"
                : "Cr",

            openingBalance:
              opening.debit ||
              opening.credit,

            openingBalanceType:
              opening.debit
                ? "Dr"
                : "Cr",
          };
        }
      );

    return {
      summaries,

      totals:
        summaries.reduce(
          (result, item) => ({
            debit: round2(
              result.debit +
                item.debit
            ),

            credit: round2(
              result.credit +
                item.credit
            ),
          }),
          {
            debit: 0,
            credit: 0,
          }
        ),

      entries,
    };
  };

/* =========================================================
   LEDGER DETAILS DATA
========================================================= */

const getLedgerDetailsData =
  async ({
    companyId,
    financialYearId,
    branchId,
    accountId,
    fromDate,
    toDate,
    search,
    page = 1,
    limit = 50,
  }) => {
    const account =
      await Account.findOne({
        _id: accountId,

        company:
          companyId,

        isActive: {
          $ne: false,
        },
      }).lean();

    if (!account) {
      return null;
    }

    const allEntries =
      await buildEntries({
        companyId,
        financialYearId,
        branchId,
      });

    const filtered =
      allEntries.filter(
        (entry) => {
          if (
            entry.accountId !==
            idOf(accountId)
          ) {
            return false;
          }

          const date =
            new Date(
              entry.date
            );

          if (
            fromDate &&
            date <
              new Date(
                fromDate
              )
          ) {
            return false;
          }

          if (toDate) {
            const end =
              new Date(
                toDate
              );

            end.setHours(
              23,
              59,
              59,
              999
            );

            if (
              date > end
            ) {
              return false;
            }
          }

          if (search) {
            const text =
              `${entry.number} ${entry.narration} ${entry.source}`
                .toLowerCase();

            if (
              !text.includes(
                search.toLowerCase()
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );

    const opening =
      getAccountOpening(
        account
      );

    let running =
      round2(
        opening.debit -
          opening.credit
      );

    const rows =
      filtered.map(
        (entry) => {
          running =
            round2(
              running +
                entry.debit -
                entry.credit
            );

          return {
            ...entry,

            balance:
              Math.abs(
                running
              ),

            balanceType:
              running >= 0
                ? "Dr"
                : "Cr",
          };
        }
      );

    const totalDebit =
      round2(
        rows.reduce(
          (sum, item) =>
            sum + item.debit,
          0
        )
      );

    const totalCredit =
      round2(
        rows.reduce(
          (sum, item) =>
            sum + item.credit,
          0
        )
      );

    const safePage =
      Math.max(
        1,
        Number(page) || 1
      );

    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 50
        )
      );

    const totalRecords =
      rows.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalRecords /
            safeLimit
        )
      );

    const start =
      (safePage - 1) *
      safeLimit;

    return {
      account,

      openingBalance:
        opening.debit ||
        opening.credit,

      openingBalanceType:
        opening.debit
          ? "Dr"
          : "Cr",

      totalDebit,

      totalCredit,

      closingBalance:
        Math.abs(running),

      closingBalanceType:
        running >= 0
          ? "Dr"
          : "Cr",

      entries:
        rows.slice(
          start,
          start + safeLimit
        ),

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        totalRecords,

        totalPages,
      },
    };
  };

module.exports = {
  round2,
  buildEntries,
  getLedgerSummaryData,
  getLedgerDetailsData,
};