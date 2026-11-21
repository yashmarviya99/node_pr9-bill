import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeFinancialYearId: sessionStorage.getItem("businessBillActiveFinancialYearId") || "",
  activeFinancialYear: null,
  financialYears: [],
  loading: false,
};

const financialYearSlice = createSlice({
  name: "financialYear",
  initialState,
  reducers: {
    setActiveFinancialYear: (state, action) => {
      const fy = action.payload;
      state.activeFinancialYear = fy;
      state.activeFinancialYearId = fy?._id || "";
      if (fy?._id) {
        sessionStorage.setItem("businessBillActiveFinancialYearId", fy._id);
      } else {
        sessionStorage.removeItem("businessBillActiveFinancialYearId");
      }
    },
    setFinancialYears: (state, action) => {
      state.financialYears = action.payload;
    },
    setFinancialYearLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setActiveFinancialYear,
  setFinancialYears,
  setFinancialYearLoading,
} = financialYearSlice.actions;

export default financialYearSlice.reducer;
