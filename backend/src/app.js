const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const mongoose = require("mongoose");

const {
  generalRateLimiter,
} = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const branchRoutes = require("./routes/branchRoutes");
const financialYearRoutes = require("./routes/financialYearRoutes");
const customerRoutes = require("./routes/customerRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const productRoutes = require("./routes/productRoutes");
const accountRoutes = require("./routes/accountRoutes");

const saleRoutes = require("./routes/saleRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");

const saleReturnRoutes = require("./routes/saleReturnRoutes");
const purchaseReturnRoutes = require("./routes/purchaseReturnRoutes");

const challanRoutes = require("./routes/challanRoutes");
const quotationRoutes = require("./routes/quotationRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");

const paymentRoutes = require("./routes/paymentRoutes");
const cashBookRoutes = require("./routes/cashBookRoutes");
const bankBookRoutes = require("./routes/bankBookRoutes");

const receiptRoutes = require("./routes/receiptRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const journalRoutes = require("./routes/journalRoutes");

const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const settingRoutes = require("./routes/settingRoutes");

const app = express();

const isProduction =
  process.env.NODE_ENV ===
  "production";

/*
|--------------------------------------------------------------------------
| Proxy
|--------------------------------------------------------------------------
*/

if (isProduction) {
  app.set(
    "trust proxy",
    1
  );
}

/*
|--------------------------------------------------------------------------
| Mongoose Security
|--------------------------------------------------------------------------
*/

// mongoose.set("sanitizeFilter", false);

/*
|--------------------------------------------------------------------------
| Security Headers
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: false,

    contentSecurityPolicy:
      isProduction
        ? undefined
        : false,
  })
);

/*
|--------------------------------------------------------------------------
| General Rate Limiter
|--------------------------------------------------------------------------
*/

app.use(
  generalRateLimiter
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins =
  String(
    process.env.CLIENT_URL || ""
  )
    .split(",")
    .map((origin) =>
      origin.trim()
    )
    .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "CORS origin is not allowed"
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-company-id",
      "x-branch-id",
      "x-financial-year-id",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Request Body Limits
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit:
      process.env.JSON_BODY_LIMIT ||
      "2mb",

    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,

    limit:
      process.env.JSON_BODY_LIMIT ||
      "2mb",

    parameterLimit: 100,
  })
);

/*
|--------------------------------------------------------------------------
| Cookies
|--------------------------------------------------------------------------
*/

app.use(
  cookieParser()
);

/*
|--------------------------------------------------------------------------
| Basic Request Sanitization
|--------------------------------------------------------------------------
|
| Reject MongoDB operator-style keys such as:
| $where
| $ne
| $gt
| user.password
|
|--------------------------------------------------------------------------
*/

const containsUnsafeMongoKey =
  (value) => {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return false;
    }

    if (
      Array.isArray(value)
    ) {
      return value.some(
        containsUnsafeMongoKey
      );
    }

    return Object.entries(
      value
    ).some(
      ([key, childValue]) => {
        if (
          key.startsWith("$") ||
          key.includes(".")
        ) {
          return true;
        }

        return containsUnsafeMongoKey(
          childValue
        );
      }
    );
  };

app.use(
  (req, res, next) => {
    if (
      containsUnsafeMongoKey(
        req.body
      ) ||
      containsUnsafeMongoKey(
        req.query
      ) ||
      containsUnsafeMongoKey(
        req.params
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data",
      });
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "Business Bill API is running",
      environment:
        process.env.NODE_ENV ||
        "development",
    });
  }
);

app.get(
  "/api/health",
  (req, res) => {
    const databaseState =
      mongoose.connection.readyState;

    res.status(
      databaseState === 1
        ? 200
        : 503
    ).json({
      success:
        databaseState === 1,

      message:
        databaseState === 1
          ? "Business Bill API is healthy"
          : "Database connection is not ready",

      database:
        databaseState === 1
          ? "connected"
          : "disconnected",

      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/companies",
  companyRoutes
);

app.use(
  "/api/branches",
  branchRoutes
);

app.use(
  "/api/financial-years",
  financialYearRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/suppliers",
  supplierRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/accounts",
  accountRoutes
);

app.use(
  "/api/sales",
  saleRoutes
);

app.use(
  "/api/purchases",
  purchaseRoutes
);

app.use(
  "/api/sale-returns",
  saleReturnRoutes
);

app.use(
  "/api/purchase-returns",
  purchaseReturnRoutes
);

app.use(
  "/api/challans",
  challanRoutes
);

app.use(
  "/api/quotations",
  quotationRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/cash-book",
  cashBookRoutes
);

app.use(
  "/api/bank-book",
  bankBookRoutes
);

app.use(
  "/api/receipts",
  receiptRoutes
);

app.use(
  "/api/incomes",
  incomeRoutes
);

app.use(
  "/api/expenses",
  expenseRoutes
);

app.use(
  "/api/journals",
  journalRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/ledger",
  ledgerRoutes
);

app.use(
  "/api/reports",
  reportRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/employees",
  employeeRoutes
);

app.use(
  "/api/settings",
  settingRoutes
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found",
      path:
        req.originalUrl,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "Server Error:",
      err
    );

    if (
      err.name ===
      "ZodError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Validation failed",

        errors:
          err.issues.map(
            (issue) => ({
              field:
                issue.path.join(
                  "."
                ),

              message:
                issue.message,
            })
          ),
      });
    }

    if (
      err.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Database validation failed",

        errors:
          Object.values(
            err.errors
          ).map(
            (item) =>
              item.message
          ),
      });
    }

    if (
      err.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid data format",
      });
    }

    if (
      err.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication failed",
      });
    }

    if (
      err.message ===
      "CORS origin is not allowed"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "CORS origin is not allowed",
      });
    }

    if (
      err.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large",
      });
    }

    const statusCode =
      err.statusCode || 500;

    const response = {
      success: false,

      message:
        statusCode >= 500 &&
        isProduction
          ? "Internal server error"
          : err.message ||
            "Internal server error",
    };

    if (
      !isProduction &&
      err.stack
    ) {
      response.stack =
        err.stack;
    }

    return res
      .status(statusCode)
      .json(response);
  }
);

module.exports = app;