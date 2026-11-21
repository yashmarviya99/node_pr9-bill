const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const Account = require("../models/Account");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");

const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Journal = require("../models/Journal");

/* =========================================================
   HELPERS
========================================================= */

const round2 = (value) =>
    Math.round(
        (Number(value || 0) + Number.EPSILON) * 100
    ) / 100;

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("en-IN");
};

const money = (value) =>
    `Rs. ${Number(value || 0).toFixed(2)}`;

const isValidObjectId = (value) =>
    mongoose.Types.ObjectId.isValid(value);

const sameId = (a, b) =>
    Boolean(a && b && String(a) === String(b));

/* =========================================================
   TRANSACTION AMOUNT
========================================================= */

const getTransactionAmount = (transaction) => {
    const fields = [
        "totalAmount",
        "returnAmount",
        "invoiceAmount",
        "netAmount",
        "amount",
    ];

    for (const field of fields) {
        if (
            transaction?.[field] !== undefined &&
            transaction?.[field] !== null
        ) {
            const amount = Number(
                transaction[field]
            );

            if (!Number.isNaN(amount)) {
                return round2(amount);
            }
        }
    }

    return 0;
};

/* =========================================================
   ACCOUNT OPENING BALANCE
========================================================= */

const getAccountOpeningBalance = (
    account
) => {
    const amount = round2(
        account?.openingBalance
    );

    if (!amount) {
        return {
            debit: 0,
            credit: 0,
        };
    }

    const status = String(
        account?.openingBalanceStatus ||
        account?.openingBalanceType ||
        account?.balanceType ||
        ""
    ).toLowerCase();

    if (
        status === "cr" ||
        status === "credit"
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
   COMPANY ACCESS
========================================================= */

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
    });
};

/* =========================================================
   FINANCIAL YEAR
========================================================= */

const getFinancialYear = async (
    companyId,
    financialYearId
) => {
    if (financialYearId) {
        return FinancialYear.findOne({
            _id: financialYearId,
            company: companyId,
        });
    }

    let financialYear =
        await FinancialYear.findOne({
            company: companyId,
            isActive: true,
        }).sort({
            startDate: -1,
        });

    if (!financialYear) {
        financialYear =
            await FinancialYear.findOne({
                company: companyId,
            }).sort({
                startDate: -1,
            });
    }

    return financialYear;
};

/* =========================================================
   BASE TRANSACTION FILTER
========================================================= */

const buildBaseFilter = ({
    companyId,
    branchId,
    financialYearId,
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

/* =========================================================
   DATE RANGE
========================================================= */

const getDateRange = (
    financialYear,
    fromDate,
    toDate
) => {
    const fyStart = new Date(
        financialYear.startDate
    );
    fyStart.setHours(0, 0, 0, 0);

    const fyEnd = new Date(
        financialYear.endDate
    );
    fyEnd.setHours(23, 59, 59, 999);

    if (
        Number.isNaN(
            fyStart.getTime()
        ) ||
        Number.isNaN(
            fyEnd.getTime()
        )
    ) {
        const error = new Error(
            "Financial year has invalid start or end date"
        );

        error.statusCode = 400;

        throw error;
    }

    let from = fromDate
        ? new Date(fromDate)
        : new Date(fyStart);

    let to = toDate
        ? new Date(toDate)
        : new Date(fyEnd);

    if (
        Number.isNaN(
            from.getTime()
        )
    ) {
        const error = new Error(
            "Invalid fromDate"
        );

        error.statusCode = 400;

        throw error;
    }

    if (
        Number.isNaN(
            to.getTime()
        )
    ) {
        const error = new Error(
            "Invalid toDate"
        );

        error.statusCode = 400;

        throw error;
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (from < fyStart) {
        from = new Date(fyStart);
    }

    if (to > fyEnd) {
        to = new Date(fyEnd);
    }

    if (from > to) {
        const error = new Error(
            "From date cannot be greater than To date"
        );

        error.statusCode = 400;

        throw error;
    }

    return {
        fyStart,
        fyEnd,
        from,
        to,
    };
};

/* =========================================================
   ADD ACCOUNT ENTRY
========================================================= */

const addEntry = (
    map,
    accountId,
    debit,
    credit
) => {
    if (!accountId) {
        return;
    }

    const key = String(accountId);

    if (!map.has(key)) {
        map.set(key, {
            debit: 0,
            credit: 0,
        });
    }

    const item = map.get(key);

    item.debit = round2(
        item.debit +
        Number(debit || 0)
    );

    item.credit = round2(
        item.credit +
        Number(credit || 0)
    );
};

/* =========================================================
   TRANSACTION TEXT
========================================================= */

const transactionText = (
    type,
    number,
    narration
) => {
    return `${type}${number
            ? ` - ${number}`
            : ""
        }${narration
            ? ` - ${narration}`
            : ""
        }`;
};

/* =========================================================
   LOAD ALL LEDGER TRANSACTIONS
========================================================= */

const loadLedgerTransactions =
    async ({
        companyId,
        branchId,
        financialYearId,
        startDate,
        endDate,
    }) => {
        const base =
            buildBaseFilter({
                companyId,
                branchId,
                financialYearId,
            });

        const dateFilter = (
            field
        ) => ({
            [field]: {
                $gte: startDate,
                $lte: endDate,
            },
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
            Sale.find({
                ...base,
                ...dateFilter(
                    "invoiceDate"
                ),
            }).sort({
                invoiceDate: 1,
                createdAt: 1,
            }),

            Purchase.find({
                ...base,
                ...dateFilter(
                    "invoiceDate"
                ),
            }).sort({
                invoiceDate: 1,
                createdAt: 1,
            }),

            SaleReturn.find({
                ...base,
                ...dateFilter(
                    "returnDate"
                ),
            }).sort({
                returnDate: 1,
                createdAt: 1,
            }),

            PurchaseReturn.find({
                ...base,
                ...dateFilter(
                    "returnDate"
                ),
            }).sort({
                returnDate: 1,
                createdAt: 1,
            }),

            Payment.find({
                ...base,
                ...dateFilter(
                    "paymentDate"
                ),
            }).sort({
                paymentDate: 1,
                createdAt: 1,
            }),

            Receipt.find({
                ...base,
                ...dateFilter(
                    "receiptDate"
                ),
            }).sort({
                receiptDate: 1,
                createdAt: 1,
            }),

            Income.find({
                ...base,
                ...dateFilter(
                    "incomeDate"
                ),
            }).sort({
                incomeDate: 1,
                createdAt: 1,
            }),

            Expense.find({
                ...base,
                ...dateFilter(
                    "expenseDate"
                ),
            }).sort({
                expenseDate: 1,
                createdAt: 1,
            }),

            Journal.find({
                ...base,
                ...dateFilter(
                    "journalDate"
                ),
            }).sort({
                journalDate: 1,
                createdAt: 1,
            }),
        ]);

        return {
            sales,
            purchases,
            saleReturns,
            purchaseReturns,
            payments,
            receipts,
            incomes,
            expenses,
            journals,
        };
    };

/* =========================================================
   APPLY TRANSACTIONS TO LEDGER SUMMARY
========================================================= */

const applyTransactionsToSummary = (
    transactions,
    summaryMap
) => {
    /* -------------------------------------------------------
       SALE
    ------------------------------------------------------- */

    for (const sale of transactions.sales) {
        const amount =
            getTransactionAmount(
                sale
            );

        if (amount > 0) {
            addEntry(
                summaryMap,
                sale.account,
                amount,
                0
            );
        }

        if (
            sale.paymentAccount &&
            Number(
                sale.paidAmount || 0
            ) > 0
        ) {
            addEntry(
                summaryMap,
                sale.paymentAccount,
                Number(
                    sale.paidAmount
                ),
                0
            );
        }
    }

    /* -------------------------------------------------------
       PURCHASE
    ------------------------------------------------------- */

    for (const purchase of
        transactions.purchases) {
        const amount =
            getTransactionAmount(
                purchase
            );

        if (amount > 0) {
            addEntry(
                summaryMap,
                purchase.account,
                0,
                amount
            );
        }

        if (
            purchase.paymentAccount &&
            Number(
                purchase.paidAmount || 0
            ) > 0
        ) {
            addEntry(
                summaryMap,
                purchase.paymentAccount,
                0,
                Number(
                    purchase.paidAmount
                )
            );
        }
    }

    /* -------------------------------------------------------
       SALE RETURN
    ------------------------------------------------------- */

    for (const item of
        transactions.saleReturns) {
        const amount =
            getTransactionAmount(
                item
            );

        if (amount > 0) {
            addEntry(
                summaryMap,
                item.account,
                0,
                amount
            );
        }

        if (
            item.refundAccount &&
            Number(
                item.refundAmount || 0
            ) > 0
        ) {
            addEntry(
                summaryMap,
                item.refundAccount,
                Number(
                    item.refundAmount
                ),
                0
            );
        }
    }

    /* -------------------------------------------------------
       PURCHASE RETURN
    ------------------------------------------------------- */

    for (const item of
        transactions.purchaseReturns) {
        const amount =
            getTransactionAmount(
                item
            );

        if (amount > 0) {
            addEntry(
                summaryMap,
                item.account,
                amount,
                0
            );
        }

        if (
            item.adjustmentAccount &&
            Number(
                item.adjustmentAmount || 0
            ) > 0
        ) {
            addEntry(
                summaryMap,
                item.adjustmentAccount,
                0,
                Number(
                    item.adjustmentAmount
                )
            );
        }
    }

    /* -------------------------------------------------------
       PAYMENT
    ------------------------------------------------------- */

    for (const item of
        transactions.payments) {
        const amount =
            Number(
                item.amount || 0
            );

        if (amount <= 0) {
            continue;
        }

        addEntry(
            summaryMap,
            item.account,
            amount,
            0
        );

        addEntry(
            summaryMap,
            item.paymentAccount,
            0,
            amount
        );
    }

    /* -------------------------------------------------------
       RECEIPT
    ------------------------------------------------------- */

    for (const item of
        transactions.receipts) {
        const amount =
            Number(
                item.amount || 0
            );

        if (amount <= 0) {
            continue;
        }

        addEntry(
            summaryMap,
            item.account,
            0,
            amount
        );

        addEntry(
            summaryMap,
            item.receiptAccount,
            amount,
            0
        );
    }

    /* -------------------------------------------------------
       INCOME
    ------------------------------------------------------- */

    for (const item of
        transactions.incomes) {
        const amount =
            Number(
                item.amount || 0
            );

        if (amount <= 0) {
            continue;
        }

        addEntry(
            summaryMap,
            item.account,
            amount,
            0
        );

        addEntry(
            summaryMap,
            item.incomeAccount,
            0,
            amount
        );
    }

    /* -------------------------------------------------------
       EXPENSE
    ------------------------------------------------------- */

    for (const item of
        transactions.expenses) {
        const amount =
            Number(
                item.amount || 0
            );

        if (amount <= 0) {
            continue;
        }

        addEntry(
            summaryMap,
            item.expenseAccount,
            amount,
            0
        );

        addEntry(
            summaryMap,
            item.account,
            0,
            amount
        );
    }

    /* -------------------------------------------------------
       JOURNAL
    ------------------------------------------------------- */

    for (const item of
        transactions.journals) {
        const amount =
            Number(
                item.amount || 0
            );

        if (amount <= 0) {
            continue;
        }

        addEntry(
            summaryMap,
            item.debitAccount,
            amount,
            0
        );

        addEntry(
            summaryMap,
            item.creditAccount,
            0,
            amount
        );
    }
};

/* =========================================================
   BUILD LEDGER SUMMARY DATA
========================================================= */

const buildSummaryData = async ({
    companyId,
    branchId,
    financialYear,
    accountId,
    search,
}) => {
    const accountFilter = {
        company: companyId,
    };

    if (accountId) {
        accountFilter._id =
            accountId;
    }

    if (search) {
        accountFilter.name = {
            $regex: search,
            $options: "i",
        };
    }

    const [
        accounts,
        financialYears,
        transactions,
    ] = await Promise.all([
        Account.find(
            accountFilter
        ).sort({
            name: 1,
        }),

        FinancialYear.find({
            company: companyId,
        })
            .sort({
                startDate: -1,
            })
            .limit(4)
            .select(
                "_id name startDate endDate isActive"
            ),

        loadLedgerTransactions({
            companyId,
            branchId,
            financialYearId:
                financialYear._id,
            startDate: (() => {
                const d = new Date(financialYear.startDate);
                d.setHours(0, 0, 0, 0);
                return d;
            })(),
            endDate: (() => {
                const d = new Date(financialYear.endDate);
                d.setHours(23, 59, 59, 999);
                return d;
            })(),
        }),
    ]);

    if (
        accountId &&
        accounts.length === 0
    ) {
        const error = new Error(
            "Account not found"
        );

        error.statusCode = 404;

        throw error;
    }

    const transactionMap =
        new Map();

    applyTransactionsToSummary(
        transactions,
        transactionMap
    );

    const summaries =
        accounts.map(
            (account) => {
                const opening =
                    getAccountOpeningBalance(
                        account
                    );

                const movement =
                    transactionMap.get(
                        String(account._id)
                    ) || {
                        debit: 0,
                        credit: 0,
                    };

                const debit =
                    round2(
                        opening.debit +
                        movement.debit
                    );

                const credit =
                    round2(
                        opening.credit +
                        movement.credit
                    );

                const difference =
                    round2(
                        debit - credit
                    );

                return {
                    accountId:
                        account._id,

                    _id:
                        account._id,

                    name:
                        account.name,

                    accountName:
                        account.name,

                    accountType:
                        account.accountType ||
                        null,

                    accountGroup:
                        account.accountGroup ||
                        null,

                    accountDetails: {
                        address:
                            account.address ||
                            account.shippingAddress ||
                            "",

                        mobile:
                            account.contactPersonMobile ||
                            account.mobile ||
                            account.phone ||
                            "",

                        city:
                            account.city || "",
                    },

                    address:
                        account.address ||
                        account.shippingAddress ||
                        "",

                    city:
                        account.city || "",

                    phone:
                        account.contactPersonMobile ||
                        account.mobile ||
                        account.phone ||
                        "",

                    debitOpening:
                        debit,

                    creditOpening:
                        credit,

                    debit,

                    credit,

                    balance:
                        Math.abs(
                            difference
                        ),

                    balanceType:
                        difference >= 0
                            ? "Dr"
                            : "Cr",

                    openingBalance:
                        round2(
                            account.openingBalance
                        ),

                    openingBalanceStatus:
                        account.openingBalanceStatus ||
                        account.openingBalanceType ||
                        account.balanceType ||
                        "Dr",
                };
            }
        );

    const totals =
        summaries.reduce(
            (result, item) => {
                result.debitOpening =
                    round2(
                        result.debitOpening +
                        item.debitOpening
                    );

                result.creditOpening =
                    round2(
                        result.creditOpening +
                        item.creditOpening
                    );

                return result;
            },
            {
                debitOpening: 0,
                creditOpening: 0,
            }
        );

    const totalDifference =
        round2(
            totals.debitOpening -
            totals.creditOpening
        );

    totals.balance =
        Math.abs(
            totalDifference
        );

    totals.balanceType =
        totalDifference >= 0
            ? "Dr"
            : "Cr";

    return {
        summaries,
        totals,
        financialYears,
        transactions,
    };
};

/* =========================================================
   GET LEDGER SUMMARY
========================================================= */

const getLedgerSummary = async (
    req,
    res,
    next
) => {
    try {
        const companyId =
            req.query.companyId ||
            req.headers["x-company-id"];

        const financialYearId =
            req.query.financialYearId ||
            req.headers["x-financial-year-id"];

        const branchId =
            req.query.branchId ||
            req.headers["x-branch-id"];

        const {
            accountId,
            search,
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

        for (const [
            value,
            label,
        ] of [
                [
                    financialYearId,
                    "financial year ID",
                ],
                [
                    branchId,
                    "branch ID",
                ],
                [
                    accountId,
                    "account ID",
                ],
            ]) {
            if (
                value &&
                !isValidObjectId(
                    value
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Invalid ${label}`,
                });
            }
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

        const data =
            await buildSummaryData({
                companyId,
                branchId,
                financialYear,
                accountId,
                search,
            });

        return res.status(200).json({
            success: true,

            message:
                "Ledger summary fetched successfully",

            financialYear: {
                id:
                    financialYear._id,

                name:
                    financialYear.name ||
                    null,

                startDate:
                    financialYear.startDate ||
                    null,

                endDate:
                    financialYear.endDate ||
                    null,

                isActive:
                    financialYear.isActive ||
                    false,
            },

            availableFinancialYears:
                data.financialYears,

            filters: {
                companyId,

                branchId:
                    branchId || null,

                financialYearId:
                    financialYear._id,

                accountId:
                    accountId || null,

                search:
                    search || "",
            },

            count:
                data.summaries.length,

            summaries:
                data.summaries,

            summary:
                data.summaries,

            totals:
                data.totals,

            dataSource: {
                sales:
                    data.transactions
                        .sales.length,

                purchases:
                    data.transactions
                        .purchases.length,

                saleReturns:
                    data.transactions
                        .saleReturns.length,

                purchaseReturns:
                    data.transactions
                        .purchaseReturns.length,

                payments:
                    data.transactions
                        .payments.length,

                receipts:
                    data.transactions
                        .receipts.length,

                incomes:
                    data.transactions
                        .incomes.length,

                expenses:
                    data.transactions
                        .expenses.length,

                journals:
                    data.transactions
                        .journals.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/* =========================================================
   BUILD LEDGER DETAILS
========================================================= */

const buildLedgerDetails =
    async ({
        companyId,
        branchId,
        accountId,
        financialYear,
        fromDate,
        toDate,
    }) => {
        const {
            fyStart,
            fyEnd,
            from,
            to,
        } = getDateRange(
            financialYear,
            fromDate,
            toDate
        );

        const account =
            await Account.findOne({
                _id: accountId,
                company: companyId,
            });

        if (!account) {
            const error = new Error(
                "Account not found for this company"
            );

            error.statusCode = 404;

            throw error;
        }

        const allTransactions =
            await loadLedgerTransactions({
                companyId,
                branchId,
                financialYearId:
                    financialYear._id,
                startDate: fyStart,
                endDate: fyEnd,
            });

        const details = [];

        const push = (
            date,
            voucherNumber,
            particulars,
            debit,
            credit,
            type = "Transaction",
            narration = ""
        ) => {
            const transactionDate =
                new Date(date);

            if (
                Number.isNaN(
                    transactionDate.getTime()
                )
            ) {
                return;
            }

            if (
                transactionDate <
                fyStart ||
                transactionDate >
                fyEnd
            ) {
                return;
            }

            details.push({
                date:
                    transactionDate,

                voucherNumber:
                    voucherNumber || "-",

                invoiceNumber:
                    voucherNumber || "-",

                particulars:
                    particulars ||
                    type ||
                    "Transaction",

                type:
                    type ||
                    "Transaction",

                narration:
                    narration || "",

                debit:
                    round2(debit),

                credit:
                    round2(credit),
            });
        };

        /* -------------------------------------------------------
           SALES
        ------------------------------------------------------- */

        for (const item of
            allTransactions.sales) {
            const amount =
                getTransactionAmount(
                    item
                );

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.invoiceDate,
                    item.invoiceNumber,
                    transactionText(
                        "Sale",
                        item.invoiceNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Sale",
                    item.narration
                );
            }

            if (
                sameId(
                    item.paymentAccount,
                    accountId
                ) &&
                Number(
                    item.paidAmount || 0
                ) > 0
            ) {
                push(
                    item.invoiceDate,
                    item.invoiceNumber,
                    transactionText(
                        "Sale Payment",
                        item.invoiceNumber,
                        item.narration
                    ),
                    Number(
                        item.paidAmount
                    ),
                    0,
                    "Sale Payment",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           PURCHASES
        ------------------------------------------------------- */

        for (const item of
            allTransactions.purchases) {
            const amount =
                getTransactionAmount(
                    item
                );

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.invoiceDate,
                    item.invoiceNumber,
                    transactionText(
                        "Purchase",
                        item.invoiceNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Purchase",
                    item.narration
                );
            }

            if (
                sameId(
                    item.paymentAccount,
                    accountId
                ) &&
                Number(
                    item.paidAmount || 0
                ) > 0
            ) {
                push(
                    item.invoiceDate,
                    item.invoiceNumber,
                    transactionText(
                        "Purchase Payment",
                        item.invoiceNumber,
                        item.narration
                    ),
                    0,
                    Number(
                        item.paidAmount
                    ),
                    "Purchase Payment",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           SALE RETURNS
        ------------------------------------------------------- */

        for (const item of
            allTransactions.saleReturns) {
            const amount =
                getTransactionAmount(
                    item
                );

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.returnDate,
                    item.returnNumber,
                    transactionText(
                        "Sale Return",
                        item.returnNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Sale Return",
                    item.narration
                );
            }

            if (
                sameId(
                    item.refundAccount,
                    accountId
                ) &&
                Number(
                    item.refundAmount || 0
                ) > 0
            ) {
                push(
                    item.returnDate,
                    item.returnNumber,
                    transactionText(
                        "Sale Return Refund",
                        item.returnNumber,
                        item.narration
                    ),
                    Number(
                        item.refundAmount
                    ),
                    0,
                    "Sale Return Refund",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           PURCHASE RETURNS
        ------------------------------------------------------- */

        for (const item of
            allTransactions.purchaseReturns) {
            const amount =
                getTransactionAmount(
                    item
                );

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.returnDate,
                    item.returnNumber,
                    transactionText(
                        "Purchase Return",
                        item.returnNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Purchase Return",
                    item.narration
                );
            }

            if (
                sameId(
                    item.adjustmentAccount,
                    accountId
                ) &&
                Number(
                    item.adjustmentAmount || 0
                ) > 0
            ) {
                push(
                    item.returnDate,
                    item.returnNumber,
                    transactionText(
                        "Purchase Return Adjustment",
                        item.returnNumber,
                        item.narration
                    ),
                    0,
                    Number(
                        item.adjustmentAmount
                    ),
                    "Purchase Return Adjustment",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           PAYMENTS
        ------------------------------------------------------- */

        for (const item of
            allTransactions.payments) {
            const amount =
                Number(
                    item.amount || 0
                );

            if (amount <= 0) {
                continue;
            }

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.paymentDate,
                    item.paymentNumber,
                    transactionText(
                        "Payment",
                        item.paymentNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Payment",
                    item.narration
                );
            }

            if (
                sameId(
                    item.paymentAccount,
                    accountId
                )
            ) {
                push(
                    item.paymentDate,
                    item.paymentNumber,
                    transactionText(
                        "Payment - Cash/Bank",
                        item.paymentNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Payment",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           RECEIPTS
        ------------------------------------------------------- */

        for (const item of
            allTransactions.receipts) {
            const amount =
                Number(
                    item.amount || 0
                );

            if (amount <= 0) {
                continue;
            }

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.receiptDate,
                    item.receiptNumber,
                    transactionText(
                        "Receipt",
                        item.receiptNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Receipt",
                    item.narration
                );
            }

            if (
                sameId(
                    item.receiptAccount,
                    accountId
                )
            ) {
                push(
                    item.receiptDate,
                    item.receiptNumber,
                    transactionText(
                        "Receipt - Cash/Bank",
                        item.receiptNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Receipt",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           INCOME
        ------------------------------------------------------- */

        for (const item of
            allTransactions.incomes) {
            const amount =
                Number(
                    item.amount || 0
                );

            if (amount <= 0) {
                continue;
            }

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.incomeDate,
                    item.incomeNumber,
                    transactionText(
                        "Income",
                        item.incomeNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Income",
                    item.narration
                );
            }

            if (
                sameId(
                    item.incomeAccount,
                    accountId
                )
            ) {
                push(
                    item.incomeDate,
                    item.incomeNumber,
                    transactionText(
                        "Income Account",
                        item.incomeNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Income",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           EXPENSE
        ------------------------------------------------------- */

        for (const item of
            allTransactions.expenses) {
            const amount =
                Number(
                    item.amount || 0
                );

            if (amount <= 0) {
                continue;
            }

            if (
                sameId(
                    item.expenseAccount,
                    accountId
                )
            ) {
                push(
                    item.expenseDate,
                    item.expenseNumber,
                    transactionText(
                        "Expense",
                        item.expenseNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Expense",
                    item.narration
                );
            }

            if (
                sameId(
                    item.account,
                    accountId
                )
            ) {
                push(
                    item.expenseDate,
                    item.expenseNumber,
                    transactionText(
                        "Expense Payment",
                        item.expenseNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Expense",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           JOURNALS
        ------------------------------------------------------- */

        for (const item of
            allTransactions.journals) {
            const amount =
                Number(
                    item.amount || 0
                );

            if (amount <= 0) {
                continue;
            }

            if (
                sameId(
                    item.debitAccount,
                    accountId
                )
            ) {
                push(
                    item.journalDate,
                    item.journalNumber,
                    transactionText(
                        "Journal",
                        item.journalNumber,
                        item.narration
                    ),
                    amount,
                    0,
                    "Journal",
                    item.narration
                );
            }

            if (
                sameId(
                    item.creditAccount,
                    accountId
                )
            ) {
                push(
                    item.journalDate,
                    item.journalNumber,
                    transactionText(
                        "Journal",
                        item.journalNumber,
                        item.narration
                    ),
                    0,
                    amount,
                    "Journal",
                    item.narration
                );
            }
        }

        /* -------------------------------------------------------
           SORT
        ------------------------------------------------------- */

        details.sort(
            (a, b) => {
                const dateDiff =
                    new Date(
                        a.date
                    ).getTime() -
                    new Date(
                        b.date
                    ).getTime();

                if (
                    dateDiff !== 0
                ) {
                    return dateDiff;
                }

                return String(
                    a.voucherNumber
                ).localeCompare(
                    String(
                        b.voucherNumber
                    )
                );
            }
        );

        /* -------------------------------------------------------
           OPENING BALANCE
        ------------------------------------------------------- */

        const opening =
            getAccountOpeningBalance(
                account
            );

        let openingDebit =
            opening.debit;

        let openingCredit =
            opening.credit;

        for (const item of details) {
            if (
                new Date(item.date) <
                from
            ) {
                openingDebit =
                    round2(
                        openingDebit +
                        item.debit
                    );

                openingCredit =
                    round2(
                        openingCredit +
                        item.credit
                    );
            }
        }

        /* -------------------------------------------------------
           SELECTED PERIOD
        ------------------------------------------------------- */

        const filtered =
            details.filter(
                (item) => {
                    const date =
                        new Date(
                            item.date
                        );

                    return (
                        date >= from &&
                        date <= to
                    );
                }
            );

        /* -------------------------------------------------------
           RUNNING BALANCE
        ------------------------------------------------------- */

        let runningBalance =
            round2(
                openingDebit -
                openingCredit
            );

        const finalDetails =
            filtered.map(
                (item) => {
                    runningBalance =
                        round2(
                            runningBalance +
                            item.debit -
                            item.credit
                        );

                    return {
                        ...item,
                        balance:
                            runningBalance,
                    };
                }
            );

        /* -------------------------------------------------------
           TOTALS
        ------------------------------------------------------- */

        const totalDebit =
            round2(
                finalDetails.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.debit || 0
                        ),
                    0
                )
            );

        const totalCredit =
            round2(
                finalDetails.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.credit || 0
                        ),
                    0
                )
            );

        return {
            account,
            financialYear,

            filters: {
                fromDate: from,
                toDate: to,
            },

            openingBalance: {
                debit:
                    round2(
                        openingDebit
                    ),

                credit:
                    round2(
                        openingCredit
                    ),

                balance:
                    round2(
                        openingDebit -
                        openingCredit
                    ),
            },

            details:
                finalDetails,

            totals: {
                debit:
                    totalDebit,

                credit:
                    totalCredit,

                balance:
                    runningBalance,
            },
        };
    };

/* =========================================================
   GET LEDGER DETAILS
========================================================= */

const getLedgerDetails = async (
    req,
    res,
    next
) => {
    try {
        const companyId =
            req.query.companyId ||
            req.headers["x-company-id"];

        const financialYearId =
            req.query.financialYearId ||
            req.headers["x-financial-year-id"];

        const branchId =
            req.query.branchId ||
            req.headers["x-branch-id"];

        const {
            accountId,
            fromDate,
            toDate,
        } = req.query;

        if (
            !companyId ||
            !accountId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "companyId and accountId query parameters are required",
            });
        }

        for (const [
            value,
            label,
        ] of [
                [
                    companyId,
                    "company ID",
                ],
                [
                    accountId,
                    "account ID",
                ],
                [
                    financialYearId,
                    "financial year ID",
                ],
                [
                    branchId,
                    "branch ID",
                ],
            ]) {
            if (
                value &&
                !isValidObjectId(
                    value
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Invalid ${label}`,
                });
            }
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

        const result =
            await buildLedgerDetails({
                companyId,
                branchId,
                accountId,
                financialYear,
                fromDate,
                toDate,
            });

        const opDebit = round2(result.openingBalance?.debit || 0);
        const opCredit = round2(result.openingBalance?.credit || 0);
        const netOp = round2(opDebit - opCredit);
        const openingBalanceNum = Math.abs(netOp);
        const openingBalanceType = netOp >= 0 ? "debit" : "credit";

        const ledgerObj = {
            account: result.account,
            financialYear,
            openingBalance: openingBalanceNum,
            openingBalanceType,
            openingDebit: opDebit,
            openingCredit: opCredit,
            entries: result.details,
            details: result.details,
            totals: result.totals,
        };

        return res.status(200).json({
            success: true,

            message:
                "Ledger details fetched successfully",

            account: {
                id:
                    result.account._id,

                _id:
                    result.account._id,

                name:
                    result.account.name,

                accountType:
                    result.account.accountType ||
                    null,

                accountGroup:
                    result.account.accountGroup ||
                    null,
            },

            financialYear: {
                id:
                    financialYear._id,

                _id:
                    financialYear._id,

                name:
                    financialYear.name ||
                    null,

                startDate:
                    financialYear.startDate,

                endDate:
                    financialYear.endDate,
            },

            filters: {
                companyId,

                branchId:
                    branchId || null,

                financialYearId:
                    financialYear._id,

                accountId,

                fromDate:
                    result.filters
                        .fromDate,

                toDate:
                    result.filters
                        .toDate,
            },

            openingBalance:
                result.openingBalance,

            count:
                result.details.length,

            details:
                result.details,

            entries:
                result.details,

            totals:
                result.totals,

            ledger:
                ledgerObj,
        });
    } catch (error) {
        next(error);
    }
};

/* =========================================================
   SAFE PDF FILE NAME
========================================================= */

const safeFileName = (
    value,
    fallback
) =>
    String(
        value || fallback
    )
        .replace(
            /[^a-z0-9]+/gi,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .toLowerCase() ||
    fallback;

/* =========================================================
   DRAW PDF CELL
========================================================= */

const drawCell = (
    doc,
    x,
    y,
    width,
    height,
    text,
    align = "left",
    font = "Helvetica",
    size = 8
) => {
    doc
        .font(font)
        .fontSize(size);

    doc
        .rect(
            x,
            y,
            width,
            height
        )
        .stroke();

    doc.text(
        String(
            text ?? "-"
        ),
        x + 3,
        y + 7,
        {
            width:
                width - 6,

            height:
                height - 10,

            align,
        }
    );
};

/* =========================================================
   LEDGER SUMMARY PDF
========================================================= */

const getLedgerSummaryPdf =
    async (
        req,
        res,
        next
    ) => {
        try {
            const companyId =
                req.query.companyId ||
                req.headers["x-company-id"];

            const financialYearId =
                req.query.financialYearId ||
                req.headers["x-financial-year-id"];

            const branchId =
                req.query.branchId ||
                req.headers["x-branch-id"];

            const {
                accountId,
                search,
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

            for (const [
                value,
                label,
            ] of [
                    [
                        financialYearId,
                        "financial year ID",
                    ],
                    [
                        branchId,
                        "branch ID",
                    ],
                    [
                        accountId,
                        "account ID",
                    ],
                ]) {
                if (
                    value &&
                    !isValidObjectId(
                        value
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `Invalid ${label}`,
                    });
                }
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

            const data =
                await buildSummaryData({
                    companyId,
                    branchId,
                    financialYear,
                    accountId,
                    search,
                });

            const fileName =
                `ledger-summary-${safeFileName(
                    financialYear.name,
                    "report"
                )}.pdf`;

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${fileName}"`
            );

            const doc =
                new PDFDocument({
                    size: "A4",
                    margin: 30,
                    bufferPages: true,
                });

            doc.pipe(res);

            doc
                .fontSize(18)
                .font("Helvetica-Bold")
                .text(
                    "LEDGER SUMMARY",
                    {
                        align: "center",
                    }
                );

            doc.moveDown(
                0.4
            );

            doc
                .fontSize(11)
                .text(
                    company.companyName ||
                    company.name ||
                    "Company",
                    {
                        align: "center",
                    }
                );

            doc
                .fontSize(9)
                .font("Helvetica")
                .text(
                    `Financial Year: ${financialYear.name ||
                    `${formatDate(
                        financialYear.startDate
                    )} - ${formatDate(
                        financialYear.endDate
                    )}`
                    }`,
                    {
                        align: "center",
                    }
                );

            if (search) {
                doc.text(
                    `Search: ${search}`,
                    {
                        align: "center",
                    }
                );
            }

            doc.moveDown(
                0.8
            );

            const left = 30;

            const columns = {
                account: 220,
                debit: 100,
                credit: 100,
                balance: 115,
            };

            const headerHeight = 24;
            const rowHeight = 24;

            let y = doc.y;

            const drawHeader =
                () => {
                    let x = left;

                    for (const [
                        title,
                        width,
                        align,
                    ] of [
                            [
                                "Account",
                                columns.account,
                                "left",
                            ],
                            [
                                "Debit",
                                columns.debit,
                                "right",
                            ],
                            [
                                "Credit",
                                columns.credit,
                                "right",
                            ],
                            [
                                "Balance",
                                columns.balance,
                                "right",
                            ],
                        ]) {
                        drawCell(
                            doc,
                            x,
                            y,
                            width,
                            headerHeight,
                            title,
                            align,
                            "Helvetica-Bold",
                            8
                        );

                        x += width;
                    }

                    y +=
                        headerHeight;
                };

            drawHeader();

            for (const item of
                data.summaries) {
                if (y > 760) {
                    doc.addPage();

                    y = 40;

                    drawHeader();
                }

                let x = left;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.account,
                    rowHeight,
                    item.accountName,
                    "left"
                );

                x +=
                    columns.account;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.debit,
                    rowHeight,
                    money(
                        item.debitOpening
                    ),
                    "right"
                );

                x +=
                    columns.debit;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.credit,
                    rowHeight,
                    money(
                        item.creditOpening
                    ),
                    "right"
                );

                x +=
                    columns.credit;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.balance,
                    rowHeight,
                    `${money(
                        item.balance
                    )} ${item.balanceType
                    }`,
                    "right"
                );

                y +=
                    rowHeight;
            }

            if (y > 760) {
                doc.addPage();

                y = 40;
            }

            let x = left;

            drawCell(
                doc,
                x,
                y,
                columns.account,
                rowHeight,
                "TOTAL",
                "right",
                "Helvetica-Bold",
                8
            );

            x +=
                columns.account;

            drawCell(
                doc,
                x,
                y,
                columns.debit,
                rowHeight,
                money(
                    data.totals
                        .debitOpening
                ),
                "right",
                "Helvetica-Bold",
                8
            );

            x +=
                columns.debit;

            drawCell(
                doc,
                x,
                y,
                columns.credit,
                rowHeight,
                money(
                    data.totals
                        .creditOpening
                ),
                "right",
                "Helvetica-Bold",
                8
            );

            x +=
                columns.credit;

            drawCell(
                doc,
                x,
                y,
                columns.balance,
                rowHeight,
                `${money(
                    data.totals
                        .balance
                )} ${data.totals
                    .balanceType
                }`,
                "right",
                "Helvetica-Bold",
                8
            );

            doc
                .font("Helvetica")
                .fontSize(7)
                .text(
                    "Generated by Business Bill",
                    30,
                    805,
                    {
                        width: 535,
                        align: "center",
                    }
                );

            doc.end();
        } catch (error) {
            next(error);
        }
    };

/* =========================================================
   LEDGER DETAILS PDF
========================================================= */

const getLedgerDetailsPdf =
    async (
        req,
        res,
        next
    ) => {
        try {
            const companyId =
                req.query.companyId ||
                req.headers["x-company-id"];

            const financialYearId =
                req.query.financialYearId ||
                req.headers["x-financial-year-id"];

            const branchId =
                req.query.branchId ||
                req.headers["x-branch-id"];

            const {
                accountId,
                fromDate,
                toDate,
            } = req.query;

            if (
                !companyId ||
                !accountId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "companyId and accountId query parameters are required",
                });
            }

            for (const [
                value,
                label,
            ] of [
                    [
                        companyId,
                        "company ID",
                    ],
                    [
                        accountId,
                        "account ID",
                    ],
                    [
                        financialYearId,
                        "financial year ID",
                    ],
                    [
                        branchId,
                        "branch ID",
                    ],
                ]) {
                if (
                    value &&
                    !isValidObjectId(
                        value
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `Invalid ${label}`,
                    });
                }
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

            const result =
                await buildLedgerDetails({
                    companyId,
                    branchId,
                    accountId,
                    financialYear,
                    fromDate,
                    toDate,
                });

            const fileName =
                `ledger-details-${safeFileName(
                    result.account.name,
                    "account"
                )}.pdf`;

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${fileName}"`
            );

            const doc =
                new PDFDocument({
                    size: "A4",
                    margin: 30,
                    bufferPages: true,
                });

            doc.pipe(res);

            doc
                .fontSize(18)
                .font("Helvetica-Bold")
                .text(
                    "LEDGER DETAILS",
                    {
                        align: "center",
                    }
                );

            doc.moveDown(
                0.5
            );

            doc
                .fontSize(11)
                .text(
                    company.companyName ||
                    company.name ||
                    "Company"
                );

            doc
                .fontSize(9)
                .font("Helvetica");

            const address = [
                company.address,
                company.city,
                company.state,
                company.pincode,
            ]
                .filter(Boolean)
                .join(", ");

            const contact = [
                company.mobile,
                company.phone,
                company.email,
            ]
                .filter(Boolean)
                .join(" | ");

            if (address) {
                doc.text(
                    address
                );
            }

            if (contact) {
                doc.text(
                    contact
                );
            }

            doc.moveDown(
                0.4
            );

            doc
                .font("Helvetica-Bold")
                .text(
                    `Account: ${result.account.name ||
                    "Account"
                    }`
                );

            doc
                .font("Helvetica")
                .text(
                    `Financial Year: ${financialYear.name ||
                    `${formatDate(
                        financialYear.startDate
                    )} - ${formatDate(
                        financialYear.endDate
                    )}`
                    }`
                );

            doc.text(
                `Period: ${formatDate(
                    result.filters
                        .fromDate
                )} - ${formatDate(
                    result.filters
                        .toDate
                )}`
            );

            doc.text(
                `Opening Balance: ${money(
                    result.openingBalance
                        .balance
                )}`
            );

            doc.moveDown(
                0.6
            );

            const left = 30;

            const columns = {
                date: 60,
                voucher: 85,
                particulars: 190,
                debit: 70,
                credit: 70,
                balance: 60,
            };

            const headerHeight = 24;
            const rowHeight = 30;

            let y = doc.y;

            const drawHeader =
                () => {
                    let x = left;

                    for (const [
                        title,
                        width,
                        align,
                    ] of [
                            [
                                "Date",
                                columns.date,
                                "center",
                            ],
                            [
                                "Invoice / Voucher",
                                columns.voucher,
                                "center",
                            ],
                            [
                                "Particulars",
                                columns.particulars,
                                "left",
                            ],
                            [
                                "Debit",
                                columns.debit,
                                "right",
                            ],
                            [
                                "Credit",
                                columns.credit,
                                "right",
                            ],
                            [
                                "Balance",
                                columns.balance,
                                "right",
                            ],
                        ]) {
                        drawCell(
                            doc,
                            x,
                            y,
                            width,
                            headerHeight,
                            title,
                            align,
                            "Helvetica-Bold",
                            8
                        );

                        x += width;
                    }

                    y +=
                        headerHeight;
                };

            drawHeader();

            for (const item of
                result.details) {
                if (y > 760) {
                    doc.addPage();

                    y = 40;

                    drawHeader();
                }

                let x = left;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.date,
                    rowHeight,
                    formatDate(
                        item.date
                    ),
                    "center",
                    "Helvetica",
                    7
                );

                x +=
                    columns.date;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.voucher,
                    rowHeight,
                    item.voucherNumber,
                    "center",
                    "Helvetica",
                    7
                );

                x +=
                    columns.voucher;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.particulars,
                    rowHeight,
                    item.particulars,
                    "left",
                    "Helvetica",
                    7
                );

                x +=
                    columns.particulars;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.debit,
                    rowHeight,
                    money(
                        item.debit
                    ),
                    "right",
                    "Helvetica",
                    7
                );

                x +=
                    columns.debit;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.credit,
                    rowHeight,
                    money(
                        item.credit
                    ),
                    "right",
                    "Helvetica",
                    7
                );

                x +=
                    columns.credit;

                drawCell(
                    doc,
                    x,
                    y,
                    columns.balance,
                    rowHeight,
                    money(
                        item.balance
                    ),
                    "right",
                    "Helvetica",
                    7
                );

                y +=
                    rowHeight;
            }

            if (y > 760) {
                doc.addPage();

                y = 40;
            }

            drawCell(
                doc,
                left,
                y,
                columns.date +
                columns.voucher +
                columns.particulars,
                28,
                "TOTAL",
                "right",
                "Helvetica-Bold",
                8
            );

            let totalX =
                left +
                columns.date +
                columns.voucher +
                columns.particulars;

            drawCell(
                doc,
                totalX,
                y,
                columns.debit,
                28,
                money(
                    result.totals
                        .debit
                ),
                "right",
                "Helvetica-Bold",
                8
            );

            totalX +=
                columns.debit;

            drawCell(
                doc,
                totalX,
                y,
                columns.credit,
                28,
                money(
                    result.totals
                        .credit
                ),
                "right",
                "Helvetica-Bold",
                8
            );

            totalX +=
                columns.credit;

            drawCell(
                doc,
                totalX,
                y,
                columns.balance,
                28,
                money(
                    result.totals
                        .balance
                ),
                "right",
                "Helvetica-Bold",
                8
            );

            doc
                .font("Helvetica")
                .fontSize(7)
                .text(
                    "Generated by Business Bill",
                    30,
                    805,
                    {
                        width: 535,
                        align: "center",
                    }
                );

            doc.end();
        } catch (error) {
            next(error);
        }
    };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
    getLedgerSummary,
    getLedgerSummaryPdf,
    getLedgerDetails,
    getLedgerDetailsPdf,
};