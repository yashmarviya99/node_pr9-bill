import api from "./api";

const healthApi = {
  check: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};

export default healthApi;