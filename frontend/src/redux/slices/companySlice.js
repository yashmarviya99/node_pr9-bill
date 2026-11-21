import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeCompanyId: sessionStorage.getItem("businessBillActiveCompanyId") || "",
  activeCompany: null,
  companies: [],
  activeBranchId: sessionStorage.getItem("businessBillActiveBranchId") || "",
  activeBranch: null,
  branches: [],
  loading: false,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setActiveCompany: (state, action) => {
      const company = action.payload;
      state.activeCompany = company;
      state.activeCompanyId = company?._id || "";
      if (company?._id) {
        sessionStorage.setItem("businessBillActiveCompanyId", company._id);
      } else {
        sessionStorage.removeItem("businessBillActiveCompanyId");
      }
    },
    setActiveBranch: (state, action) => {
      const branch = action.payload;
      state.activeBranch = branch;
      state.activeBranchId = branch?._id || "";
      if (branch?._id) {
        sessionStorage.setItem("businessBillActiveBranchId", branch._id);
      } else {
        sessionStorage.removeItem("businessBillActiveBranchId");
      }
    },
    setCompanies: (state, action) => {
      state.companies = action.payload;
    },
    setBranches: (state, action) => {
      state.branches = action.payload;
    },
    setCompanyLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setActiveCompany,
  setActiveBranch,
  setCompanies,
  setBranches,
  setCompanyLoading,
} = companySlice.actions;

export default companySlice.reducer;
