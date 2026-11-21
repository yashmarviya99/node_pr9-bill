const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticateToken = async (req) => {
  const token =
    req.cookies &&
    req.cookies.accessToken;

  if (!token) {
    const error = new Error(
      "Authentication required"
    );

    error.statusCode = 401;

    throw error;
  }

  if (!process.env.JWT_ACCESS_SECRET) {
    const error = new Error(
      "Authentication service is not configured"
    );

    error.statusCode = 500;

    throw error;
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET
  );

  if (
    !decoded ||
    !decoded.userId
  ) {
    const error = new Error(
      "Invalid authentication token"
    );

    error.statusCode = 401;

    throw error;
  }

  const user =
    await User.findById(
      decoded.userId
    )
      .select(
        "_id name username email role isActive isSuspended registrationStatus paymentStatus subscriptionStatus"
      )
      .lean();

  if (!user) {
    const error = new Error(
      "User account not found"
    );

    error.statusCode = 401;

    throw error;
  }

  if (user.isSuspended) {
    const error = new Error(
      "Your account is suspended"
    );

    error.statusCode = 403;

    throw error;
  }

  return user;
};

const setRequestUser = (
  req,
  user
) => {
  req.user = {
    userId:
      user._id.toString(),

    role:
      user.role,

    name:
      user.name,

    username:
      user.username,

    email:
      user.email,

    isActive:
      user.isActive,

    registrationStatus:
      user.registrationStatus,

    paymentStatus:
      user.paymentStatus,

    subscriptionStatus:
      user.subscriptionStatus,
  };
};

const protect = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await authenticateToken(req);

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not active",
      });
    }

    setRequestUser(
      req,
      user
    );

    next();
  } catch (error) {
    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Access token expired",
      });
    }

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    return res.status(
      error.statusCode || 401
    ).json({
      success: false,
      message:
        error.message ||
        "Authentication failed",
    });
  }
};

const registrationProtect =
  async (
    req,
    res,
    next
  ) => {
    try {
      const user =
        await authenticateToken(req);

      setRequestUser(
        req,
        user
      );

      next();
    } catch (error) {
      if (
        error.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Access token expired",
        });
      }

      if (
        error.name ===
        "JsonWebTokenError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid authentication token",
        });
      }

      return res.status(
        error.statusCode || 401
      ).json({
        success: false,
        message:
          error.message ||
          "Authentication failed",
      });
    }
  };

const authorizeAdmin = (
  req,
  res,
  next
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required",
    });
  }

  if (
    req.user.role !==
    "admin"
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Admin access required",
    });
  }

  next();
};

module.exports = {
  protect,
  registrationProtect,
  authorizeAdmin,
};