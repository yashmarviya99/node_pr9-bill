import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChangeCompanyModal from "../components/common/ChangeCompanyModal";
import SetFinancialYearModal from "../components/common/SetFinancialYearModal";
import { setUser } from "../redux/slices/authSlice";
import { setActiveCompany, setActiveBranch, setCompanies } from "../redux/slices/companySlice";
import { setActiveFinancialYear, setFinancialYears } from "../redux/slices/financialYearSlice";
import api from "../services/api";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { activeCompanyId, activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYearId } = useSelector((state) => state.financialYear);

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [fyModalOpen, setFYModalOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Get Me
        const meRes = await api.get("/auth/me");
        if (!meRes.data?.success) {
          navigate("/login", { replace: true });
          return;
        }

        const currentUser = meRes.data.user;
        dispatch(setUser(currentUser));

        // Check verification & payment
        if (currentUser.role !== "admin" && currentUser.paymentStatus !== "verified") {
          navigate("/payment", { replace: true });
          return;
        }

        // 2. Fetch Companies
        const compRes = await api.get("/companies");
        const userCompanies = compRes.data?.companies || [];
        dispatch(setCompanies(userCompanies));

        let currentComp = null;
        const storedCompId = sessionStorage.getItem("businessBillActiveCompanyId");
        if (storedCompId) {
          currentComp = userCompanies.find((c) => c._id === storedCompId);
        }
        if (!currentComp && userCompanies.length > 0) {
          currentComp = userCompanies[0];
          sessionStorage.setItem("businessBillActiveCompanyId", currentComp._id);
        }

        if (currentComp) {
          dispatch(setActiveCompany(currentComp));
          const storedBranchId = sessionStorage.getItem("businessBillActiveBranchId");
          const branch = currentComp.branches?.find((b) => b._id === storedBranchId) || currentComp.branches?.[0] || null;
          dispatch(setActiveBranch(branch));
        } else if (currentUser.role !== "admin") {
          navigate("/company-select", { replace: true });
          return;
        }

        // 3. Fetch Financial Years
        const fyRes = await api.get("/financial-years");
        const fys = fyRes.data?.financialYears || [];
        dispatch(setFinancialYears(fys));

        let currentFY = null;
        const storedFYId = sessionStorage.getItem("businessBillActiveFinancialYearId");
        if (storedFYId) {
          currentFY = fys.find((f) => f._id === storedFYId);
        }
        if (!currentFY) {
          currentFY = fys.find((f) => f.isCurrent) || fys[0];
        }
        if (currentFY) {
          dispatch(setActiveFinancialYear(currentFY));
          sessionStorage.setItem("businessBillActiveFinancialYearId", currentFY._id);
        }
      } catch (err) {
        if (err.status === 401) {
          navigate("/login", { replace: true });
        }
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, [dispatch, navigate]);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#37AD47] border-t-transparent"></div>
          <p className="text-xs font-semibold text-gray-600">Loading BUSINESS BILL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9] text-[#4A4A4A]">
      <Navbar
        onOpenCompanyModal={() => setCompanyModalOpen(true)}
        onOpenFYModal={() => setFYModalOpen(true)}
      />

      <main className="flex-1 w-full px-2 sm:px-4 py-4 max-w-full">
        <Outlet />
      </main>

      <Footer />

      <ChangeCompanyModal
        isOpen={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />

      <SetFinancialYearModal
        isOpen={fyModalOpen}
        onClose={() => setFYModalOpen(false)}
      />
    </div>
  );
}
