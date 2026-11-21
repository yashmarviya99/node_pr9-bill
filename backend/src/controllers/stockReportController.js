const mongoose = require("mongoose");

const Product = require("../models/Product");
const Stock = require("../models/Stock");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const SaleReturn = require("../models/SaleReturn");
const PurchaseReturn = require("../models/PurchaseReturn");
const Company = require("../models/Company");
const FinancialYear = require("../models/FinancialYear");

const round2 = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) /
  100;

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const parseDate = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const checkCompanyAccess = async (companyId, userId) => {
  const company = await Company.findOne({
    _id: companyId,
    owner: userId,
    isActive: true,
  }).lean();

  if (!company) {
    const error = new Error(
      "Company not found or access denied"
    );

    error.statusCode = 403;

    throw error;
  }

  return company;
};

const getFinancialYear = async ({
  companyId,
  financialYearId,
}) => {
  let financialYear = null;

  if (financialYearId) {
    if (!isValidObjectId(financialYearId)) {
      const error = new Error(
        "Invalid financialYearId"
      );

      error.statusCode = 400;

      throw error;
    }

    financialYear =
      await FinancialYear.findOne({
        _id: financialYearId,
        company: companyId,
      }).lean();
  } else {
    financialYear =
      await FinancialYear.findOne({
        company: companyId,
        isActive: true,
      })
        .sort({
          startDate: -1,
        })
        .lean();
  }

  if (!financialYear) {
    const error = new Error(
      "Financial year not found"
    );

    error.statusCode = 404;

    throw error;
  }

  return financialYear;
};

const validateDateRange = ({
  financialYear,
  fromDate,
  toDate,
}) => {
  const fyStart = new Date(
    financialYear.startDate
  );

  const fyEnd = new Date(
    financialYear.endDate
  );

  fyStart.setHours(0, 0, 0, 0);
  fyEnd.setHours(23, 59, 59, 999);

  let startDate =
    parseDate(fromDate, false) ||
    new Date(fyStart);

  let endDate =
    parseDate(toDate, true) ||
    new Date(fyEnd);

  if (fromDate && !parseDate(fromDate, false)) {
    const error = new Error(
      "Invalid fromDate"
    );

    error.statusCode = 400;

    throw error;
  }

  if (toDate && !parseDate(toDate, true)) {
    const error = new Error(
      "Invalid toDate"
    );

    error.statusCode = 400;

    throw error;
  }

  if (startDate < fyStart) {
    const error = new Error(
      "fromDate must belong to the selected Financial Year"
    );

    error.statusCode = 400;

    throw error;
  }

  if (endDate > fyEnd) {
    const error = new Error(
      "toDate must belong to the selected Financial Year"
    );

    error.statusCode = 400;

    throw error;
  }

  if (startDate > endDate) {
    const error = new Error(
      "fromDate cannot be greater than toDate"
    );

    error.statusCode = 400;

    throw error;
  }

  return {
    startDate,
    endDate,
    fyStart,
    fyEnd,
  };
};

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

const getItemProductId = (item) => {
  if (!item || !item.product) {
    return null;
  }

  const productId =
    item.product._id || item.product;

  return productId
    ? productId.toString()
    : null;
};

const getItemQuantity = (item) => {
  return Number(
    item?.quantity || 0
  );
};

const addMovement = (
  map,
  item,
  type
) => {
  const productId =
    getItemProductId(item);

  if (!productId) {
    return;
  }

  const quantity =
    getItemQuantity(item);

  if (!quantity) {
    return;
  }

  if (!map.has(productId)) {
    map.set(productId, {
      purchaseQuantity: 0,
      saleQuantity: 0,
      saleReturnQuantity: 0,
      purchaseReturnQuantity: 0,
    });
  }

  const movement =
    map.get(productId);

  if (type === "purchase") {
    movement.purchaseQuantity +=
      quantity;
  }

  if (type === "sale") {
    movement.saleQuantity +=
      quantity;
  }

  if (type === "sale_return") {
    movement.saleReturnQuantity +=
      quantity;
  }

  if (type === "purchase_return") {
    movement.purchaseReturnQuantity +=
      quantity;
  }
};

const loadMovements = async ({
  companyId,
  branchId,
  financialYearId,
  beforeDate,
  fromDate,
  toDate,
}) => {
  const movementMap = new Map();

  const baseFilter =
    buildBaseFilter({
      companyId,
      branchId,
      financialYearId,
    });

  const dateFilter = (
    field,
    start,
    end
  ) => ({
    ...baseFilter,
    [field]: {
      $gte: start,
      $lte: end,
    },
  });

  const [
    purchases,
    sales,
    saleReturns,
    purchaseReturns,
  ] = await Promise.all([
    Purchase.find(
      dateFilter(
        "invoiceDate",
        beforeDate
          ? new Date(
              "1900-01-01"
            )
          : fromDate,
        beforeDate || toDate
      )
    )
      .select(
        "items invoiceDate"
      )
      .lean(),

    Sale.find(
      dateFilter(
        "invoiceDate",
        beforeDate
          ? new Date(
              "1900-01-01"
            )
          : fromDate,
        beforeDate || toDate
      )
    )
      .select(
        "items invoiceDate"
      )
      .lean(),

    SaleReturn.find(
      dateFilter(
        "returnDate",
        beforeDate
          ? new Date(
              "1900-01-01"
            )
          : fromDate,
        beforeDate || toDate
      )
    )
      .select(
        "items returnDate"
      )
      .lean(),

    PurchaseReturn.find(
      dateFilter(
        "returnDate",
        beforeDate
          ? new Date(
              "1900-01-01"
            )
          : fromDate,
        beforeDate || toDate
      )
    )
      .select(
        "items returnDate"
      )
      .lean(),
  ]);

  for (const purchase of purchases) {
    for (const item of purchase.items || []) {
      addMovement(
        movementMap,
        item,
        "purchase"
      );
    }
  }

  for (const sale of sales) {
    for (const item of sale.items || []) {
      addMovement(
        movementMap,
        item,
        "sale"
      );
    }
  }

  for (const saleReturn of saleReturns) {
    for (
      const item of
        saleReturn.items || []
    ) {
      addMovement(
        movementMap,
        item,
        "sale_return"
      );
    }
  }

  for (
    const purchaseReturn of
      purchaseReturns
  ) {
    for (
      const item of
        purchaseReturn.items || []
    ) {
      addMovement(
        movementMap,
        item,
        "purchase_return"
      );
    }
  }

  return movementMap;
};

const getProductStockFromTransactions = async ({
  companyId,
  branchId,
  financialYearId,
  productId,
  fyStart,
  toDate,
}) => {
  const movementMap =
    await loadMovements({
      companyId,
      branchId,
      financialYearId,
      beforeDate: null,
      fromDate: fyStart,
      toDate,
    });

  const movement =
    movementMap.get(
      productId.toString()
    ) || {
      purchaseQuantity: 0,
      saleQuantity: 0,
      saleReturnQuantity: 0,
      purchaseReturnQuantity: 0,
    };

  return movement;
};

const getOpeningMovement = async ({
  companyId,
  branchId,
  financialYearId,
  productId,
  fyStart,
  fromDate,
}) => {
  if (
    !fromDate ||
    fromDate.getTime() <=
      fyStart.getTime()
  ) {
    return {
      purchaseQuantity: 0,
      saleQuantity: 0,
      saleReturnQuantity: 0,
      purchaseReturnQuantity: 0,
    };
  }

  const movementMap =
    await loadMovements({
      companyId,
      branchId,
      financialYearId,
      beforeDate: new Date(
        fromDate.getTime() - 1
      ),
      fromDate: fyStart,
      toDate: new Date(
        fromDate.getTime() - 1
      ),
    });

  return (
    movementMap.get(
      productId.toString()
    ) || {
      purchaseQuantity: 0,
      saleQuantity: 0,
      saleReturnQuantity: 0,
      purchaseReturnQuantity: 0,
    }
  );
};

const getStockQuantityFromStockModel =
  async ({
    companyId,
    branchId,
    financialYearId,
    productId,
  }) => {
    const stock =
      await Stock.findOne({
        company: companyId,
        branch: branchId || null,
        financialYear:
          financialYearId,
        product: productId,
      }).lean();

    return Number(
      stock?.quantity || 0
    );
  };

const getStockReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      companyId,
      branchId,
      financialYearId,
      productId,
      fromDate,
      toDate,
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
          "Invalid companyId",
      });
    }

    if (
      branchId &&
      !isValidObjectId(
        branchId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid branchId",
      });
    }

    if (
      productId &&
      !isValidObjectId(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid productId",
      });
    }

    await checkCompanyAccess(
      companyId,
      req.user.userId
    );

    const financialYear =
      await getFinancialYear({
        companyId,
        financialYearId,
      });

    const {
      startDate,
      endDate,
      fyStart,
      fyEnd,
    } = validateDateRange({
      financialYear,
      fromDate,
      toDate,
    });

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const currentLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const productFilter = {
      company: companyId,
      isActive: true,
    };

    if (productId) {
      productFilter._id =
        productId;
    }

    if (branchId) {
      productFilter.$or = [
        {
          branch: branchId,
        },
        {
          branch: null,
        },
      ];
    }

    const trimmedSearch =
      String(search || "").trim();

    if (trimmedSearch) {
      productFilter.$and = [
        {
          $or: [
            {
              name: {
                $regex:
                  trimmedSearch,
                $options: "i",
              },
            },
            {
              productCode: {
                $regex:
                  trimmedSearch,
                $options: "i",
              },
            },
            {
              category: {
                $regex:
                  trimmedSearch,
                $options: "i",
              },
            },
            {
              hsnSac: {
                $regex:
                  trimmedSearch,
                $options: "i",
              },
            },
          ],
        },
      ];
    }

    const total =
      await Product.countDocuments(
        productFilter
      );

    const products =
      await Product.find(
        productFilter
      )
        .sort({
          name: 1,
        })
        .skip(
          (currentPage - 1) *
            currentLimit
        )
        .limit(
          currentLimit
        )
        .lean();

    /*
      We calculate movement data from
      Purchase, Sale, Sale Return and
      Purchase Return.

      Challan is intentionally not included.
      Challan is only a delivery document
      and must not affect stock.
    */

    const movementMap =
      await loadMovements({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        beforeDate: null,
        fromDate: startDate,
        toDate: endDate,
      });

    const openingMovementMap =
      await loadMovements({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        beforeDate:
          startDate,
        fromDate: fyStart,
        toDate:
          new Date(
            startDate.getTime() - 1
          ),
      });

    const rows = [];

    for (const product of products) {
      const productKey =
        product._id.toString();

      const movement =
        movementMap.get(
          productKey
        ) || {
          purchaseQuantity: 0,
          saleQuantity: 0,
          saleReturnQuantity: 0,
          purchaseReturnQuantity: 0,
        };

      const openingMovement =
        openingMovementMap.get(
          productKey
        ) || {
          purchaseQuantity: 0,
          saleQuantity: 0,
          saleReturnQuantity: 0,
          purchaseReturnQuantity: 0,
        };

      const productOpeningStock =
        Number(
          product.openingStock ||
            0
        );

      const openingStock =
        round2(
          productOpeningStock +
            openingMovement.purchaseQuantity -
            openingMovement.saleQuantity +
            openingMovement.saleReturnQuantity -
            openingMovement.purchaseReturnQuantity
        );

      const purchaseQuantity =
        round2(
          movement.purchaseQuantity
        );

      const saleQuantity =
        round2(
          movement.saleQuantity
        );

      const saleReturnQuantity =
        round2(
          movement.saleReturnQuantity
        );

      const purchaseReturnQuantity =
        round2(
          movement.purchaseReturnQuantity
        );

      const closingStock =
        round2(
          openingStock +
            purchaseQuantity -
            saleQuantity +
            saleReturnQuantity -
            purchaseReturnQuantity
        );

      const stockModelQuantity =
        await getStockQuantityFromStockModel(
          {
            companyId,
            branchId,
            financialYearId:
              financialYear._id,
            productId:
              product._id,
          }
        );

      rows.push({
        productId:
          product._id,

        productCode:
          product.productCode ||
          "",

        productName:
          product.name,

        category:
          product.category ||
          "",

        uom:
          product.unit ||
          "PCS",

        hsnSac:
          product.hsnSac ||
          "",

        purchasePrice:
          round2(
            product.purchasePrice
          ),

        salePrice:
          round2(
            product.salePrice
          ),

        minimumStock:
          round2(
            product.minimumStock
          ),

        openingStock,

        purchaseQuantity,

        saleQuantity,

        saleReturnQuantity,

        purchaseReturnQuantity,

        closingStock,

        availableQuantity:
          closingStock,

        stockModelQuantity:
          round2(
            stockModelQuantity
          ),

        isLowStock:
          closingStock <=
          Number(
            product.minimumStock ||
              0
          ),
      });
    }

    /*
      Summary is calculated from
      the complete filtered product
      movement set, not only the current
      pagination page.
    */

    const allProducts =
      await Product.find(
        {
          ...productFilter,
        },
        {
          _id: 1,
          openingStock: 1,
        }
      ).lean();

    const summaryMovementMap =
      await loadMovements({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        beforeDate: null,
        fromDate: startDate,
        toDate: endDate,
      });

    const summaryOpeningMap =
      await loadMovements({
        companyId,
        branchId,
        financialYearId:
          financialYear._id,
        beforeDate:
          startDate,
        fromDate: fyStart,
        toDate:
          new Date(
            startDate.getTime() - 1
          ),
      });

    let totalOpeningStock = 0;
    let totalPurchaseQuantity = 0;
    let totalSaleQuantity = 0;
    let totalSaleReturnQuantity = 0;
    let totalPurchaseReturnQuantity = 0;
    let totalClosingStock = 0;

    for (
      const product of allProducts
    ) {
      const key =
        product._id.toString();

      const movement =
        summaryMovementMap.get(
          key
        ) || {
          purchaseQuantity: 0,
          saleQuantity: 0,
          saleReturnQuantity: 0,
          purchaseReturnQuantity: 0,
        };

      const openingMovement =
        summaryOpeningMap.get(
          key
        ) || {
          purchaseQuantity: 0,
          saleQuantity: 0,
          saleReturnQuantity: 0,
          purchaseReturnQuantity: 0,
        };

      const openingStock =
        round2(
          Number(
            product.openingStock ||
              0
          ) +
            openingMovement.purchaseQuantity -
            openingMovement.saleQuantity +
            openingMovement.saleReturnQuantity -
            openingMovement.purchaseReturnQuantity
        );

      const purchaseQuantity =
        round2(
          movement.purchaseQuantity
        );

      const saleQuantity =
        round2(
          movement.saleQuantity
        );

      const saleReturnQuantity =
        round2(
          movement.saleReturnQuantity
        );

      const purchaseReturnQuantity =
        round2(
          movement.purchaseReturnQuantity
        );

      const closingStock =
        round2(
          openingStock +
            purchaseQuantity -
            saleQuantity +
            saleReturnQuantity -
            purchaseReturnQuantity
        );

      totalOpeningStock =
        round2(
          totalOpeningStock +
            openingStock
        );

      totalPurchaseQuantity =
        round2(
          totalPurchaseQuantity +
            purchaseQuantity
        );

      totalSaleQuantity =
        round2(
          totalSaleQuantity +
            saleQuantity
        );

      totalSaleReturnQuantity =
        round2(
          totalSaleReturnQuantity +
            saleReturnQuantity
        );

      totalPurchaseReturnQuantity =
        round2(
          totalPurchaseReturnQuantity +
            purchaseReturnQuantity
        );

      totalClosingStock =
        round2(
          totalClosingStock +
            closingStock
        );
    }

    return res.status(200).json({
      success: true,

      message:
        "Stock report fetched successfully",

      filters: {
        companyId,
        branchId:
          branchId || null,
        financialYearId:
          financialYear._id,
        financialYear:
          financialYear.name ||
          null,
        fromDate:
          fromDate || null,
        toDate:
          toDate || null,
        productId:
          productId || null,
        search:
          trimmedSearch,
      },

      pagination: {
        page:
          currentPage,
        limit:
          currentLimit,
        total,
        totalPages:
          Math.ceil(
            total /
              currentLimit
          ),
      },

      summary: {
        totalOpeningStock,

        totalPurchaseQuantity,

        totalSaleQuantity,

        totalSaleReturnQuantity,

        totalPurchaseReturnQuantity,

        totalClosingStock,

        totalAvailableStock:
          totalClosingStock,
      },

      products: rows,

      stockRules: {
        purchase:
          "Increase stock",

        sale:
          "Decrease stock",

        saleReturn:
          "Increase stock",

        purchaseReturn:
          "Decrease stock",

        challan:
          "No stock movement",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockReport,
};