import api from "./api";

const authApi = {
  register: async (data) => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  login: async (data) => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  adminLogin: async (data) => {
    const response = await api.post("/auth/admin/login", data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  getRegistrationPaymentStatus: async () => {
    const response = await api.get("/auth/registration-payment/status");
    return response.data;
  },

  submitRegistrationPayment: async (data) => {
    const response = await api.post("/auth/registration-payment", data);
    return response.data;
  },

  getPendingRegistrationPayments: async () => {
    const response = await api.get("/auth/admin/registration-payments/pending");
    return response.data;
  },

  verifyRegistrationPayment: async (userId) => {
    const response = await api.post(
      `/auth/admin/registration-payment/${userId}/verify`
    );
    return response.data;
  },

  rejectRegistrationPayment: async (userId, reason) => {
    const response = await api.post(
      `/auth/admin/registration-payment/${userId}/reject`,
      { reason }
    );
    return response.data;
  },

  // ─── OTP Password Reset ──────────────────────────────────────────────────
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  verifyOtp: async (email, otp) => {
    const response = await api.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  resetPassword: async (email, otp, newPassword) => {
    const response = await api.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },
};

export default authApi;
