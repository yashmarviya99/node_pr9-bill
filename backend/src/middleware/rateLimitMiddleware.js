const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 2000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/health" ||
    req.path === "/api/health" ||
    req.path.includes("health") ||
    !isProduction,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

const passwordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 15 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
  message: {
    success: false,
    message: "Too many password-related requests. Please try again later.",
  },
});

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  passwordRateLimiter,
};
