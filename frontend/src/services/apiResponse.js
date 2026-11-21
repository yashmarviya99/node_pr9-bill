export const getApiData = (response) => {
  if (!response) {
    return null;
  }

  if (response.data !== undefined) {
    return response.data;
  }

  return response;
};

export const getApiMessage = (
  response,
  fallbackMessage = "Operation completed successfully."
) => {
  if (!response) {
    return fallbackMessage;
  }

  return (
    response.message ||
    response.data?.message ||
    fallbackMessage
  );
};

export const isApiSuccess = (response) => {
  if (!response) {
    return false;
  }

  if (typeof response.success === "boolean") {
    return response.success;
  }

  if (
    response.data &&
    typeof response.data.success === "boolean"
  ) {
    return response.data.success;
  }

  return true;
};

export const getApiErrorMessage = (
  error,
  fallbackMessage = "Something went wrong."
) => {
  if (!error) {
    return fallbackMessage;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.data?.message) {
    return error.data.message;
  }

  return fallbackMessage;
};