import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      return Promise.reject({
        success: false,
        message:
          "Server is not reachable. Please check whether the backend server is running.",
        originalError: error,
      });
    }

    const status = error.response.status;
    const responseData = error.response.data || {};

    let defaultMessage = "Something went wrong.";

    switch (status) {
      case 400:
        defaultMessage = "Invalid request.";
        break;

      case 401:
        defaultMessage = "Authentication required.";
        break;

      case 403:
        defaultMessage =
          "You do not have permission to perform this action.";
        break;

      case 404:
        defaultMessage = "Requested data was not found.";
        break;

      case 409:
        defaultMessage =
          "This data already exists or conflicts with existing data.";
        break;

      case 422:
        defaultMessage = "The submitted data is invalid.";
        break;

      case 429:
        defaultMessage =
          "Too many requests. Please try again after some time.";
        break;

      default:
        if (status >= 500) {
          defaultMessage =
            "Internal server error. Please try again later.";
        }
        break;
    }

    return Promise.reject({
      success: false,
      message: responseData.message || defaultMessage,
      status,
      data: responseData,
    });
  }
);

export default apiClient;