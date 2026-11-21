import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const activeCompanyId = sessionStorage.getItem("businessBillActiveCompanyId");
    const activeFinancialYearId = sessionStorage.getItem("businessBillActiveFinancialYearId");
    const activeBranchId = sessionStorage.getItem("businessBillActiveBranchId");

    if (activeCompanyId) {
      config.headers["x-company-id"] = activeCompanyId;
      if (config.method === "get") {
        config.params = config.params || {};
        if (!config.params.companyId) {
          config.params.companyId = activeCompanyId;
        }
        if (activeBranchId && !config.params.branchId) {
          config.params.branchId = activeBranchId;
        }
        if (activeFinancialYearId && !config.params.financialYearId) {
          config.params.financialYearId = activeFinancialYearId;
        }
      } else if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
        if (!config.data.companyId) {
          config.data.companyId = activeCompanyId;
        }
        if (activeBranchId && !config.data.branchId) {
          config.data.branchId = activeBranchId;
        }
        if (activeFinancialYearId && !config.data.financialYearId) {
          config.data.financialYearId = activeFinancialYearId;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        success: false,
        message: "Server is not reachable. Please check whether the backend server is running.",
        originalError: error,
      });
    }

    const status = error.response.status;
    const data = error.response.data || {};

    let message = data.message || "Something went wrong.";

    return Promise.reject({
      success: false,
      message,
      status,
      data,
    });
  }
);

export default api;