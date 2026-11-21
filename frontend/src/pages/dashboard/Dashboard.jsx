import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Briefcase,
  ShoppingCart,
  ShoppingBag,
  RotateCcw,
  BookOpen,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Eye,
  MapPin,
  Building,
  Phone,
  Mail,
  Globe,
  RefreshCw,
  Radio,
  CheckCircle2,
  Navigation,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import api from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/currency";

// Common coordinates for Gujarat / Indian cities
const CITY_COORDINATES = {
  rajkot: [22.3039, 70.8022],
  ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311],
  vadodara: [22.3072, 73.1812],
  gandhinagar: [23.2156, 72.6369],
  bhavnagar: [21.7645, 72.1519],
  jamnagar: [22.4707, 70.0577],
  junagadh: [21.5222, 70.4579],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
};

function RealOperationsMap({ companyInfo }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const cityName = (companyInfo?.city || "Rajkot").trim().toLowerCase();
  const defaultCoords = CITY_COORDINATES[cityName] || [22.3039, 70.8022];
  const [lat, lng] = defaultCoords;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Custom pulse marker with company branding
    const customIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #2BC481; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #2BC481; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(43, 196, 129, 0.6); border: 2.5px solid #ffffff; z-index: 2;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    const popupContent = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 170px;">
        <div style="font-weight: 800; color: #1e293b; font-size: 13px; margin-bottom: 2px;">
          ${companyInfo?.companyName || "Yash Enterprise"}
        </div>
        <div style="color: #64748b; font-size: 11px;">
          ${companyInfo?.address || "Main Road"}, ${companyInfo?.city || "Rajkot"}, ${companyInfo?.state || "Gujarat"}
        </div>
        <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; background: #e6f9f0; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid #bbf7d0;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #2BC481;"></span>
          Operational HQ Branch
        </div>
      </div>
    `;

    marker.bindPopup(popupContent).openPopup();
    mapInstanceRef.current = map;

    // Invalidate size after layout settles
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, companyInfo]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[360px] flex flex-col">
      {/* Real Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full flex-1 min-h-[300px] z-0"
        style={{ minHeight: "300px" }}
      />

      {/* Top Floating Controls */}
      <div className="absolute top-3 right-3 z-[400] flex items-center space-x-2">
        <button
          onClick={handleRecenter}
          className="bg-white/95 backdrop-blur hover:bg-white text-gray-700 hover:text-green-700 shadow-md border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold transition flex items-center space-x-1"
          title="Recenter Map to Company HQ"
        >
          <Navigation className="h-3.5 w-3.5 text-[#2BC481]" />
          <span>Recenter HQ</span>
        </button>
      </div>

      {/* Floating Info Overlay Bar on Bottom */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md rounded-lg p-2.5 text-xs border border-slate-700 text-white flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-emerald-500/20 text-[#2BC481]">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">
              {companyInfo?.city || "Rajkot"}, {companyInfo?.state || "Gujarat"},{" "}
              {companyInfo?.country || "India"}
            </div>
            <div className="text-[10px] text-gray-400">
              Coordinates: {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="rounded bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 text-[10px] border border-emerald-500/30 flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Real-Time GPS</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [topTab, setTopTab] = useState("sale"); // 'sale', 'purchase', 'customer', 'supplier'
  const [viewEntityModal, setViewEntityModal] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeCompany?._id, activeFinancialYear?._id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const compId =
        activeCompany?._id ||
        sessionStorage.getItem("businessBillActiveCompanyId");
      const fyId =
        activeFinancialYear?._id ||
        sessionStorage.getItem("businessBillActiveFinancialYearId");
      const branchId = sessionStorage.getItem("businessBillActiveBranchId");

      const res = await api.get("/dashboard", {
        params: {
          companyId: compId || undefined,
          financialYearId: fyId || undefined,
          branchId: branchId || undefined,
        },
      });

      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const cashbook = data?.cashbook || {};
  const bankbook = data?.bankbook || {};
  const monthly = data?.monthlyPerformance || [];
  const monthComparison = data?.monthComparison || {};
  const companyInfo = data?.company || activeCompany || {};

  const topSales = data?.topProducts?.sales || data?.top10Products || [];
  const topPurchases = data?.topProducts?.purchases || data?.top10Purchases || [];
  const topCustomers = data?.topCustomers || data?.top10Customers || [];
  const topSuppliers = data?.topSuppliers || data?.top10Suppliers || [];

  // 12 months order from April to March
  const monthOrder = [
    "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
  ];

  // Map monthly performance data to ensure all 12 FY months are represented
  const chartData = monthOrder.map((m) => {
    const found = monthly.find(
      (item) => item.month?.toLowerCase().startsWith(m.toLowerCase())
    );
    return {
      month: m,
      Sale: found?.sales || 0,
      Purchase: found?.purchases || 0,
      "Sale Return": found?.saleReturns || 0,
      "Purchase Return": found?.purchaseReturns || 0,
    };
  });

  const salesTrend =
    monthComparison.salesChange ?? monthComparison.percentageChange?.sales ?? 0;
  const purchasesTrend =
    monthComparison.purchasesChange ?? monthComparison.percentageChange?.purchases ?? 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Controls / Real-Time Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold text-gray-800 text-xs sm:text-sm">
            {companyInfo?.companyName || "BUSINESS BILL"}
          </span>
          <span className="text-gray-400 text-xs">|</span>
          <span className="text-xs text-gray-500 font-medium">
            Financial Year:{" "}
            <strong className="text-gray-700">
              {data?.financialYear?.name || activeFinancialYear?.name || "2026-27"}
            </strong>
          </span>
          <span className="hidden sm:inline-block rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
            Real-time Connected
          </span>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center space-x-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-green-600" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 6 Real-Time Summary Cards with Specified Brand Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Total Sale */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#2BC481" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              REAL TIME
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(summary.totalSales || summary.totalSale || 0)}
            </div>
            <div className="text-xs font-semibold text-green-50 mt-0.5">Total Sale</div>
          </div>
          <Link
            to="/transactions/sale-list"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 2. Total Sale Return */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#8972A8" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <RotateCcw className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              RETURN
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(summary.totalSaleReturns || summary.totalSaleReturn || 0)}
            </div>
            <div className="text-xs font-semibold text-purple-100 mt-0.5">Total Sale Return</div>
          </div>
          <Link
            to="/transactions/sale-return"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 3. Total Purchase */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#FBBC4B" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              PURCHASE
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(summary.totalPurchases || summary.totalPurchase || 0)}
            </div>
            <div className="text-xs font-semibold text-amber-100 mt-0.5">Total Purchase</div>
          </div>
          <Link
            to="/transactions/purchase-list"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 4. Total Purchase Return */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#DF6B6B" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              DEBIT
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(summary.totalPurchaseReturns || summary.totalPurchaseReturn || 0)}
            </div>
            <div className="text-xs font-semibold text-red-100 mt-0.5">Total Purchase Return</div>
          </div>
          <Link
            to="/transactions/purchase-return"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 5. Total CashBook */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#48B6AD" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              CASH
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(
                cashbook.currentBalance ??
                cashbook.summary?.currentBalance ??
                cashbook.summary?.net ??
                0
              )}
            </div>
            <div className="text-xs font-semibold text-teal-100 mt-0.5">Total CashBook</div>
          </div>
          <Link
            to="/transactions/cash-book"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 6. Total Bankbook */}
        <div
          className="rounded-xl shadow-sm text-white p-4 flex flex-col justify-between transition hover:shadow-md"
          style={{ backgroundColor: "#5E72E4" }}
        >
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-white/20 p-2.5">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
              BANK
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-black truncate">
              {formatCurrency(
                bankbook.currentBalance ??
                bankbook.summary?.currentBalance ??
                bankbook.summary?.net ??
                0
              )}
            </div>
            <div className="text-xs font-semibold text-indigo-100 mt-0.5">Total Bankbook</div>
          </div>
          <Link
            to="/transactions/bank-book"
            className="mt-3 inline-flex items-center space-x-1 text-[11px] font-bold text-white hover:underline pt-2 border-t border-white/20"
          >
            <span>View Details</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Monthly Performance Graph (Apr -> Mar) */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-gray-800">
              Monthly Sale, Sale Return, Purchase & Purchase Return
            </h3>
            <p className="text-xs text-gray-400">
              Current Financial Year:{" "}
              {data?.financialYear?.name || activeFinancialYear?.name || "2026-27"} (1st April to 31st March)
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`
                }
              />
              <Tooltip
                formatter={(val) => formatCurrency(val)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Bar dataKey="Purchase" fill="#FBBC4B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Purchase Return" fill="#DF6B6B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Sale" fill="#2BC481" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Sale Return" fill="#8972A8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Report & Monthly Performance Comparison (Exact 50% - 50% Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Side: Top 10 Report (50% Width) */}
        <div className="w-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="border-b bg-[#4A4A4A] px-4 py-2.5 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm">Top 10 Report</h3>
              <span className="text-[11px] text-gray-300">Selected Financial Period</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b text-xs font-semibold bg-gray-50">
              <button
                onClick={() => setTopTab("sale")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  topTab === "sale"
                    ? "border-[#2BC481] text-[#2BC481] bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Product Sale
              </button>
              <button
                onClick={() => setTopTab("purchase")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  topTab === "purchase"
                    ? "border-[#FBBC4B] text-amber-600 bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Product Buy
              </button>
              <button
                onClick={() => setTopTab("customer")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  topTab === "customer"
                    ? "border-[#37AD47] text-[#37AD47] bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Customers
              </button>
              <button
                onClick={() => setTopTab("supplier")}
                className={`flex-1 py-2.5 text-center transition border-b-2 ${
                  topTab === "supplier"
                    ? "border-purple-600 text-purple-600 bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Top Suppliers
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-3 overflow-x-auto">
              {topTab === "sale" || topTab === "purchase" ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E9EFFF] text-gray-700 font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3 w-12">SR.</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Total Qty.</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(topTab === "sale" ? topSales : topPurchases).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-400 font-medium">
                          No transactions recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      (topTab === "sale" ? topSales : topPurchases).slice(0, 10).map((prod, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition">
                          <td className="py-2 px-3 text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-gray-800">
                            {prod.name || prod.productName}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-700">
                            {formatNumber(prod.quantity)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            {formatCurrency(prod.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E9EFFF] text-gray-700 font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3 w-12">SR.</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(topTab === "customer" ? topCustomers : topSuppliers).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-gray-400 font-medium">
                          No parties recorded yet in this period.
                        </td>
                      </tr>
                    ) : (
                      (topTab === "customer" ? topCustomers : topSuppliers).map((party, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition">
                          <td className="py-2 px-3 text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-gray-800">
                            {party.name || party.customerName || party.supplierName}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            {formatCurrency(party.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => setViewEntityModal(party)}
                              className="rounded bg-emerald-50 text-[#37AD47] px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-100 transition inline-flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Monthly Performance Comparison (50% Width) */}
        <div className="w-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="border-b bg-[#4A4A4A] px-4 py-2.5 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm">Monthly Performance Comparison</h3>
              <span className="text-[11px] text-emerald-400 font-semibold">Prev vs Current</span>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Sales Comparison Card */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-700">Gross Sales</span>
                  <span
                    className={`inline-flex items-center space-x-1 text-xs font-bold ${
                      salesTrend >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {salesTrend >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>{formatNumber(salesTrend)}%</span>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Previous Month ({monthComparison.previousMonth?.label || "Oct"})
                    </div>
                    <div className="font-semibold text-gray-700">
                      {formatCurrency(monthComparison.previousMonth?.sales || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Current Month ({monthComparison.currentMonth?.label || "Nov"})
                    </div>
                    <div className="font-bold text-emerald-700">
                      {formatCurrency(monthComparison.currentMonth?.sales || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchases Comparison Card */}
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-700">Purchases</span>
                  <span
                    className={`inline-flex items-center space-x-1 text-xs font-bold ${
                      purchasesTrend >= 0 ? "text-amber-600" : "text-blue-600"
                    }`}
                  >
                    {purchasesTrend >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span>{formatNumber(purchasesTrend)}%</span>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Previous Month ({monthComparison.previousMonth?.label || "Oct"})
                    </div>
                    <div className="font-semibold text-gray-700">
                      {formatCurrency(monthComparison.previousMonth?.purchases || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Current Month ({monthComparison.currentMonth?.label || "Nov"})
                    </div>
                    <div className="font-bold text-amber-700">
                      {formatCurrency(monthComparison.currentMonth?.purchases || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Business Volume Card */}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-900">Net Business Volume</span>
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Healthy</span>
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between text-xs">
                  <span className="text-gray-600 font-medium">Net Sales - Purchases</span>
                  <span className="font-black text-sm text-emerald-800">
                    {formatCurrency(
                      (summary.totalSales || 0) - (summary.totalPurchases || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Operations Map & Company Contact & Coordination (Exact 50% - 50% Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Side: Real Interactive Business Operations Map (50% Width) */}
        <div className="w-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="border-b bg-[#4A4A4A] px-4 py-2.5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-[#2BC481]" />
              <h3 className="font-bold text-xs sm:text-sm">Business Operations Map</h3>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-semibold">
              <Radio className="h-3 w-3 animate-pulse" />
              <span>Real-Time Map</span>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-100 relative min-h-[360px]">
            <RealOperationsMap companyInfo={companyInfo} />
          </div>
        </div>

        {/* Right Side: Company Information Details (50% Width) */}
        <div className="w-full rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="border-b bg-[#4A4A4A] px-4 py-2.5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-[#2BC481]" />
                <h3 className="font-bold text-xs sm:text-sm">Company Contact & Coordination</h3>
              </div>
              <span className="text-[11px] text-gray-300">Registered Details</span>
            </div>

            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div>
                <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">
                  REGISTERED ENTITY
                </div>
                <div className="font-black text-lg text-gray-900 mt-0.5">
                  {companyInfo?.companyName || "Yash Enterprise"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-800">Operational Address</div>
                    <p className="text-gray-600 leading-relaxed mt-0.5 font-medium">
                      {companyInfo?.address || "Main Road"},{" "}
                      {companyInfo?.city || "Rajkot"},{" "}
                      {companyInfo?.state || "Gujarat"} -{" "}
                      {companyInfo?.pincode || "360001"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-800">
                      {companyInfo?.phone || "9876543210"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-800">
                      {companyInfo?.email || "yashmarviya99@gmail.com"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-[11px]">
                <div>
                  <span className="text-gray-400">GST Registration:</span>{" "}
                  <strong className="text-gray-800 font-mono text-xs">
                    {companyInfo?.gstNumber || "24ABCDE1234F1Z5"}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400">Business Type:</span>{" "}
                  <strong className="text-gray-800 uppercase font-semibold">
                    {companyInfo?.businessType || "Trading & Wholesale"}
                  </strong>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400">Active Financial Year:</span>{" "}
                  <strong className="text-emerald-700 font-bold">
                    {data?.financialYear?.name || activeFinancialYear?.name || "2026-27"}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400">Operational Status:</span>{" "}
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>100% Operational</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Entity Modal for Top Customers / Top Suppliers */}
      {viewEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden text-gray-800 animate-in fade-in">
            <div className="bg-[#4A4A4A] px-5 py-3 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Account / Party Information</h3>
              <button
                onClick={() => setViewEntityModal(null)}
                className="text-gray-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <div className="text-gray-400 text-[11px]">Party / Ledger Name</div>
                <div className="font-bold text-base text-gray-900">
                  {viewEntityModal.name || viewEntityModal.customerName || viewEntityModal.supplierName}
                </div>
              </div>

              {viewEntityModal.phone && (
                <div>
                  <div className="text-gray-400 text-[11px]">Phone Number</div>
                  <div className="font-semibold text-gray-800">{viewEntityModal.phone}</div>
                </div>
              )}

              {viewEntityModal.city && (
                <div>
                  <div className="text-gray-400 text-[11px]">City / Location</div>
                  <div className="font-semibold text-gray-800">{viewEntityModal.city}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div>
                  <div className="text-gray-400 text-[11px]">Total Volume</div>
                  <div className="font-extrabold text-base text-[#2BC481]">
                    {formatCurrency(viewEntityModal.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-[11px]">Transactions</div>
                  <div className="font-bold text-sm text-gray-800">
                    {viewEntityModal.transactionCount || 1} transactions
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  onClick={() => setViewEntityModal(null)}
                  className="rounded-lg bg-[#37AD47] px-4 py-2 font-semibold text-white text-xs hover:bg-[#2f963e] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
