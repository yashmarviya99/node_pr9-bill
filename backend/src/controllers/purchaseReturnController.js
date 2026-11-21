const mongoose = require("mongoose");

const PurchaseReturn = require("../models/PurchaseReturn");
const Purchase = require("../models/Purchase");
const Stock = require("../models/Stock");
const Supplier = require("../models/Supplier");
const Account = require("../models/Account");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const FinancialYear = require("../models/FinancialYear");

const {
  purchaseReturnCreateSchema,
} = require("../validators/purchaseReturnValidator");

const {
  generatePurchaseReturnPdf,
} = require("../templates/purchaseReturn/purchaseReturnPdf");

/* =========================================================
   CREATE PURCHASE RETURN
========================================================= */

const createPurchaseReturn = async (
  req,
  res,
  next
) => {
  try {
    const parsed =
      purchaseReturnCreateSchema.parse(
        req.body
      );

    const {
      companyId,
      branchId,
      financialYearId,
      originalPurchaseId,
      accountId,
      supplierId,
      adjustmentAccountId,
      returnNumber,
      returnDate,
      items,
      adjustmentAmount,
      roundOff,
      narration,
    } = parsed;

    /* -----------------------------------------------------
       Validate ObjectIds
    ----------------------------------------------------- */

    const ids = [
      companyId,
      branchId,
      financialYearId,
      originalPurchaseId,
      accountId,
      supplierId,
      adjustmentAccountId,
    ].filter(Boolean);

    for (const id of ids) {
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ObjectId: ${id}`,
        });
      }
    }

    /* -----------------------------------------------------
       Company
    ----------------------------------------------------- */

    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    /* -----------------------------------------------------
       Branch
    ----------------------------------------------------- */

    if (branchId) {
      const branch =
        await Branch.findOne({
          _id: branchId,
          company: companyId,
        });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        });
      }
    }

    /* -----------------------------------------------------
       Financial Year
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Return Date
    ----------------------------------------------------- */

    const selectedReturnDate =
      new Date(returnDate);

    if (
      Number.isNaN(
        selectedReturnDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid return date",
      });
    }

    /* -----------------------------------------------------
       Duplicate Return Number
    ----------------------------------------------------- */

    const existingReturn =
      await PurchaseReturn.findOne({
        company: companyId,
        financialYear: financialYearId,
        returnNumber,
        isActive: true,
      });

    if (existingReturn) {
      return res.status(409).json({
        success: false,
        message:
          "Purchase return number already exists",
      });
    }

    /* -----------------------------------------------------
       Original Purchase
    ----------------------------------------------------- */

    const originalPurchase =
      await Purchase.findOne({
        _id: originalPurchaseId,
        company: companyId,
        financialYear:
          financialYearId,
        isActive: true,
      });

    if (!originalPurchase) {
      return res.status(404).json({
        success: false,
        message:
          "Original purchase not found",
      });
    }

    /* -----------------------------------------------------
       Account
    ----------------------------------------------------- */

    const account =
      await Account.findOne({
        _id: accountId,
        company: companyId,
        isActive: true,
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    /* -----------------------------------------------------
       Supplier
    ----------------------------------------------------- */

    const supplier =
      await Supplier.findOne({
        _id: supplierId,
        company: companyId,
        isActive: true,
      });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    /* -----------------------------------------------------
       Adjustment Account
    ----------------------------------------------------- */

    let adjustmentAccount = null;

    if (adjustmentAccountId) {
      adjustmentAccount =
        await Account.findOne({
          _id: adjustmentAccountId,
          company: companyId,
          isActive: true,
        });

      if (!adjustmentAccount) {
        return res.status(404).json({
          success: false,
          message:
            "Adjustment account not found",
        });
      }
    }

    /* -----------------------------------------------------
       Adjustment Amount
    ----------------------------------------------------- */

    const finalAdjustmentAmount =
      Number(
        adjustmentAmount || 0
      );

    if (
      finalAdjustmentAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Adjustment amount cannot be negative",
      });
    }

    /* -----------------------------------------------------
       Previous Purchase Returns
    ----------------------------------------------------- */

    const previousReturns =
      await PurchaseReturn.find({
        originalPurchase:
          originalPurchaseId,
        isActive: true,
      });

    const returnedQuantityMap = {};

    previousReturns.forEach(
      (purchaseReturn) => {
        purchaseReturn.items.forEach(
          (item) => {
            const productId =
              item.product.toString();

            returnedQuantityMap[
              productId
            ] =
              (returnedQuantityMap[
                productId
              ] || 0) +
              Number(
                item.quantity || 0
              );
          }
        );
      }
    );

    /* -----------------------------------------------------
       Original Purchase Product Map
    ----------------------------------------------------- */

    const originalPurchaseMap = {};

    originalPurchase.items.forEach(
      (item) => {
        originalPurchaseMap[
          item.product.toString()
        ] = item;
      }
    );

    /* -----------------------------------------------------
       Calculate Items
    ----------------------------------------------------- */

    let productAmount = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const processedItems = [];

    for (const item of items) {
      const productId =
        item.productId.toString();

      const originalItem =
        originalPurchaseMap[
          productId
        ];

      if (!originalItem) {
        return res.status(400).json({
          success: false,
          message:
            "Product was not found in original purchase",
        });
      }

      const alreadyReturned =
        returnedQuantityMap[
          productId
        ] || 0;

      const availableQuantity =
        Number(
          originalItem.quantity || 0
        ) -
        alreadyReturned;

      if (
        Number(item.quantity) >
        availableQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Return quantity for product ${productId} cannot exceed available purchase quantity`,
        });
      }

      const quantity =
        Number(
          item.quantity || 0
        );

      const rate =
        Number(
          item.rate ??
            originalItem.rate ??
            0
        );

      const discountPercent =
        Number(
          item.discountPercent ||
            0
        );

      const gstRate =
        Number(
          item.gstRate ??
            originalItem.gstRate ??
            0
        );

      const grossAmount =
        quantity * rate;

      const itemDiscount =
        (grossAmount *
          discountPercent) /
        100;

      const itemTaxable =
        grossAmount -
        itemDiscount;

      const itemGst =
        (itemTaxable *
          gstRate) /
        100;

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      if (
        originalPurchase.taxType ===
        "cgst_sgst"
      ) {
        itemCgst =
          itemGst / 2;

        itemSgst =
          itemGst / 2;
      } else if (
        originalPurchase.taxType ===
        "igst"
      ) {
        itemIgst = itemGst;
      }

      const itemReturnAmount =
        itemTaxable +
        itemGst;

      productAmount +=
        grossAmount;

      discountAmount +=
        itemDiscount;

      taxableAmount +=
        itemTaxable;

      cgstAmount +=
        itemCgst;

      sgstAmount +=
        itemSgst;

      igstAmount +=
        itemIgst;

      processedItems.push({
        product: productId,
        quantity,
        rate,
        discountPercent,
        discountAmount:
          itemDiscount,
        taxableAmount:
          itemTaxable,
        gstRate,
        cgstAmount:
          itemCgst,
        sgstAmount:
          itemSgst,
        igstAmount:
          itemIgst,
        returnAmount:
          itemReturnAmount,
      });
    }

    /* -----------------------------------------------------
       Total
    ----------------------------------------------------- */

    const calculatedTotal =
      taxableAmount +
      cgstAmount +
      sgstAmount +
      igstAmount;

    const finalRoundOff =
      Number(roundOff || 0);

    const totalAmount =
      calculatedTotal +
      finalRoundOff;

    /* -----------------------------------------------------
       Create Purchase Return
    ----------------------------------------------------- */

    const purchaseReturn =
      await PurchaseReturn.create({
        company: companyId,
        branch:
          branchId || null,
        financialYear:
          financialYearId,
        originalPurchase:
          originalPurchaseId,
        account: accountId,
        supplier: supplierId,
        adjustmentAccount:
          adjustmentAccountId ||
          null,
        returnNumber,
        returnDate:
          selectedReturnDate,
        taxType:
          originalPurchase.taxType,
        items: processedItems,
        productAmount,
        discountAmount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        adjustmentAmount:
          finalAdjustmentAmount,
        roundOff:
          finalRoundOff,
        returnAmount:
          totalAmount,
        totalAmount,
        narration,
        isActive: true,
      });

    /* -----------------------------------------------------
       Decrease Stock
    ----------------------------------------------------- */

    for (const item of processedItems) {
      const stock =
        await Stock.findOne({
          company: companyId,
          branch:
            branchId || null,
          financialYear:
            financialYearId,
          product: item.product,
        });

      if (stock) {
        stock.quantity -=
          Number(
            item.quantity || 0
          );

        if (stock.quantity < 0) {
          stock.quantity = 0;
        }

        stock.lastTransactionType =
          "purchase_return";

        stock.lastTransaction = null;

        await stock.save();
      }
    }

    /* -----------------------------------------------------
       Populate
    ----------------------------------------------------- */

    const populatedPurchaseReturn =
      await PurchaseReturn.findById(
        purchaseReturn._id
      )
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate(
          "originalPurchase"
        )
        .populate("account")
        .populate("supplier")
        .populate(
          "adjustmentAccount"
        )
        .populate("items.product");

    return res.status(201).json({
      success: true,
      message:
        "Purchase return created successfully",
      data:
        populatedPurchaseReturn,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET PURCHASE RETURNS
========================================================= */

const getPurchaseReturns = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      supplierId,
      page = 1,
      limit = 50,
      search,
    } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId is required",
      });
    }

    const company =
      await Company.findOne({
        _id: companyId,
        owner: req.user.userId,
      });

    if (!company) {
      return res.status(403).json({
        success: false,
        message:
          "Company not found or access denied",
      });
    }

    const filter = {
      company: companyId,
      isActive: true,
    };

    if (branchId) {
      filter.branch = branchId;
    }

    if (financialYearId) {
      filter.financialYear =
        financialYearId;
    }

    if (supplierId) {
      filter.supplier =
        supplierId;
    }

    if (search) {
      filter.returnNumber = {
        $regex: search,
        $options: "i",
      };
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
      purchaseReturns,
      total,
    ] = await Promise.all([
      PurchaseReturn.find(filter)
        .populate("company")
        .populate("branch")
        .populate("financialYear")
        .populate(
          "originalPurchase"
        )
        .populate("account")
        .populate("supplier")
        .populate(
          "adjustmentAccount"
        )
        .populate(
          "items.product"
        )
        .sort({
          returnDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      PurchaseReturn.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: purchaseReturns,
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
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET PURCHASE RETURN BY ID
========================================================= */

const getPurchaseReturnById =
  async (
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
            "Invalid purchase return id",
        });
      }

      const purchaseReturn =
        await PurchaseReturn.findById(
          id
        )
          .populate("company")
          .populate("branch")
          .populate(
            "financialYear"
          )
          .populate(
            "originalPurchase"
          )
          .populate("account")
          .populate("supplier")
          .populate(
            "adjustmentAccount"
          )
          .populate(
            "items.product"
          );

      if (!purchaseReturn) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase return not found",
        });
      }

      const companyId =
        purchaseReturn
          .company?._id ||
        purchaseReturn.company;

      const company =
        await Company.findOne({
          _id: companyId,
          owner:
            req.user.userId,
        });

      if (!company) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      return res.status(200).json({
        success: true,
        data: purchaseReturn,
      });
    } catch (error) {
      next(error);
    }
  };

/* =========================================================
   PURCHASE RETURN PDF
========================================================= */

const getPurchaseReturnPdf =
  async (
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
            "Invalid purchase return id",
        });
      }

      const purchaseReturn =
        await PurchaseReturn.findById(
          id
        )
          .populate("company")
          .populate("branch")
          .populate(
            "financialYear"
          )
          .populate(
            "originalPurchase"
          )
          .populate("account")
          .populate("supplier")
          .populate(
            "adjustmentAccount"
          )
          .populate(
            "items.product"
          );

      if (!purchaseReturn) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase return not found",
        });
      }

      const companyId =
        purchaseReturn
          .company?._id ||
        purchaseReturn.company;

      const company =
        await Company.findOne({
          _id: companyId,
          owner:
            req.user.userId,
        });

      if (!company) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      const returnNumber =
        String(
          purchaseReturn.returnNumber ||
            id
        ).replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        );

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="purchase-return-${returnNumber}.pdf"`
      );

      return generatePurchaseReturnPdf(
        purchaseReturn,
        res
      );
    } catch (error) {
      next(error);
    }
  };

/* =========================================================
   DELETE PURCHASE RETURN
========================================================= */

const deletePurchaseReturn =
  async (
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
            "Invalid purchase return id",
        });
      }

      const purchaseReturn =
        await PurchaseReturn.findById(
          id
        );

      if (!purchaseReturn) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase return not found",
        });
      }

      const company =
        await Company.findOne({
          _id:
            purchaseReturn.company,
          owner:
            req.user.userId,
        });

      if (!company) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied",
        });
      }

      /* -----------------------------------------------------
         Restore Stock
      ----------------------------------------------------- */

      for (const item of purchaseReturn.items) {
        const stock =
          await Stock.findOne({
            company:
              purchaseReturn.company,
            branch:
              purchaseReturn.branch ||
              null,
            financialYear:
              purchaseReturn.financialYear,
            product:
              item.product,
          });

        if (stock) {
          stock.quantity +=
            Number(
              item.quantity || 0
            );

          stock.lastTransactionType =
            "purchase";

          stock.lastTransaction =
            null;

          await stock.save();
        }
      }

      await PurchaseReturn.findByIdAndDelete(
        id
      );

      return res.status(200).json({
        success: true,
        message:
          "Purchase return deleted and stock restored successfully",
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  getPurchaseReturnPdf,
  deletePurchaseReturn,
};