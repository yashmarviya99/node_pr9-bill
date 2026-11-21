import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import companyReducer from "./slices/companySlice";
import financialYearReducer from "./slices/financialYearSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    company: companyReducer,
    financialYear: financialYearReducer,
  },
});

export default store;
