require("dotenv").config();

const app = require("./app");

const connectDB = require("./config/db");

const PORT =
  Number(
    process.env.PORT
  ) || 5000;

const validateEnvironment =
  () => {
    const requiredVariables = [
      "MONGODB_URI",
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
    ];

    const missingVariables =
      requiredVariables.filter(
        (variable) =>
          !String(
            process.env[
              variable
            ] || ""
          ).trim()
      );

    if (
      missingVariables.length
    ) {
      throw new Error(
        `Missing required environment variables: ${missingVariables.join(
          ", "
        )}`
      );
    }

    if (
      process.env
        .JWT_ACCESS_SECRET
        .length < 32
    ) {
      throw new Error(
        "JWT_ACCESS_SECRET must be at least 32 characters"
      );
    }

    if (
      process.env
        .JWT_REFRESH_SECRET
        .length < 32
    ) {
      throw new Error(
        "JWT_REFRESH_SECRET must be at least 32 characters"
      );
    }

    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      if (
        !process.env.CLIENT_URL
      ) {
        throw new Error(
          "CLIENT_URL is required in production"
        );
      }

      if (
        !process.env
          .COOKIE_SAME_SITE
      ) {
        console.warn(
          "COOKIE_SAME_SITE is not configured. Production default will be used."
        );
      }
    }
  };

const startServer =
  async () => {
    try {
      validateEnvironment();

      await connectDB();

      app.listen(
        PORT,
        () => {
          console.log(
            `Business Bill API running on port ${PORT}`
          );

          console.log(
            `Environment: ${
              process.env.NODE_ENV ||
              "development"
            }`
          );
        }
      );
    } catch (error) {
      console.error(
        "Failed to start server:",
        error.message
      );

      process.exit(1);
    }
  };

startServer();