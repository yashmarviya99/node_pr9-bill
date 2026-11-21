import api from "./api";

const paymentApi = {
  getRegistrationPaymentStatus:
    async () => {
      const response =
        await api.get(
          "/auth/registration-payment/status"
        );

      return response.data;
    },

  submitRegistrationPayment:
    async (data) => {
      const response =
        await api.post(
          "/auth/registration-payment",
          data
        );

      return response.data;
    },
};

export default paymentApi;