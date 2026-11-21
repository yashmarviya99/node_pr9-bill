import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ChevronDown,
  ChevronRight,
  Bell,
  User,
  Building,
  Calendar,
  LogOut,
  BookOpen,
  DollarSign,
  FileText,
  ShoppingCart,
  ShoppingBag,
  RotateCcw,
  FileCheck,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  Users,
  Shield,
  Briefcase,
  Layers,
  PieChart,
  Settings,
  PlusCircle,
  CreditCard,
  Sliders,
  Repeat,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { logout } from "../redux/slices/authSlice";
import api from "../services/api";
import toast from "react-hot-toast";

export default function Navbar({ onOpenCompanyModal, onOpenFYModal }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const { activeCompany, activeBranch } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  // Desktop dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "System Ready", time: "Just now", read: false },
    { id: 2, title: "Financial Year 2026-27 Active", time: "1 hr ago", read: true },
  ]);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState("transaction"); // Default expand transaction

  const navRef = useRef(null);

  // Close desktop dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const toggleMobileSection = (name) => {
    setMobileExpandedSection(mobileExpandedSection === name ? null : name);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    dispatch(logout());
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const companyDisplayName = activeCompany?.companyName || "BUSINESS BILL";
  const branchDisplayName = activeBranch?.name || activeBranch?.branchName || "HEAD OFFICE";
  const fyDisplayName = activeFinancialYear?.name || "2026-27";

  return (
    <header className="sticky top-0 z-40 bg-[#4A4A4A] text-white shadow-md text-xs sm:text-sm select-none" ref={navRef}>
      <div className="mx-auto flex h-13 max-w-full items-center justify-between px-2 sm:px-4">
        {/* Left Side: Mobile Menu Button + Brand Logo + Desktop Nav */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Mobile Hamburger Button (visible on < lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-gray-200 hover:text-white hover:bg-white/10 focus:outline-none transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-red-400" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo / Brand */}
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 font-bold text-white pr-2 border-r border-gray-600/70 hover:text-green-400 transition"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-600 font-extrabold text-white text-base shadow-sm">
              b
            </div>
            <span className="font-extrabold tracking-tight text-xs sm:text-sm hidden sm:inline">
              BUSINESS BILL
            </span>
          </Link>

          {/* ── DESKTOP NAVIGATION MENU (visible on lg+) ── */}
          <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1">
            {/* 1. TRANSACTION DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("transaction")}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition uppercase font-semibold text-xs ${
                  openDropdown === "transaction"
                    ? "bg-gray-700 text-[#37AD47] shadow-inner"
                    : "hover:bg-gray-700/80 text-gray-200"
                }`}
              >
                <span>Transaction</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {openDropdown === "transaction" && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider border-b pb-1 mb-1">
                    Transaction Menu
                  </div>
                  <div className="grid grid-cols-2 gap-0.5 max-h-96 overflow-y-auto">
                    <Link
                      to="/transactions/cash-book"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[#48B6AD]" />
                      <span>Cash book</span>
                    </Link>
                    <Link
                      to="/transactions/sale-entry"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-[#2BC481]" />
                      <span>Sale</span>
                    </Link>
                    <Link
                      to="/transactions/bank-book"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-[#8972A8]" />
                      <span>Bank book</span>
                    </Link>
                    <Link
                      to="/transactions/sale-return"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-[#DF6B6B]" />
                      <span>Sale return</span>
                    </Link>
                    <Link
                      to="/transactions/journal-book"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <span>Journal book</span>
                    </Link>
                    <Link
                      to="/transactions/purchase-entry"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 text-[#FBBC4B]" />
                      <span>Purchases</span>
                    </Link>
                    <Link
                      to="/transactions/purchase-return"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                      <span>Purchase return</span>
                    </Link>
                    <Link
                      to="/transactions/challan"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <FileCheck className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Challan</span>
                    </Link>
                    <Link
                      to="/transactions/quotation"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-500" />
                      <span>Quotation</span>
                    </Link>
                    <Link
                      to="/transactions/income-expense"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-[#2BC481]" />
                      <span>Income</span>
                    </Link>
                    <Link
                      to="/transactions/income-expense"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span>Expenses</span>
                    </Link>
                    <Link
                      to="/transactions/job-in"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-teal-600" />
                      <span>Job in</span>
                    </Link>
                    <Link
                      to="/transactions/job-out"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                      <span>Job out</span>
                    </Link>
                    <Link
                      to="/transactions/employee-details"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <Users className="h-3.5 w-3.5 text-sky-600" />
                      <span>Employee details</span>
                    </Link>
                    <Link
                      to="/master/customer/list"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                      <span>Customer details</span>
                    </Link>
                    <Link
                      to="/master/supplier/list"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] hover:text-[#37AD47] transition"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                      <span>Supplier details</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <Link
              to="/transactions/sale-entry"
              className="px-2 py-1.5 rounded hover:bg-gray-700/80 text-gray-200 transition font-semibold uppercase text-xs"
            >
              Sale
            </Link>
            <Link
              to="/transactions/purchase-entry"
              className="px-2 py-1.5 rounded hover:bg-gray-700/80 text-gray-200 transition font-semibold uppercase text-xs"
            >
              Purchase
            </Link>
            <Link
              to="/transactions/bank-book"
              className="px-2 py-1.5 rounded hover:bg-gray-700/80 text-gray-200 transition font-semibold uppercase text-xs"
            >
              Bank
            </Link>
            <Link
              to="/reports/ledger/summary"
              className="px-2 py-1.5 rounded hover:bg-gray-700/80 text-gray-200 transition font-semibold uppercase text-xs"
            >
              Ledger
            </Link>
            <Link
              to="/reports/stock"
              className="px-2 py-1.5 rounded hover:bg-gray-700/80 text-gray-200 transition font-semibold uppercase text-xs"
            >
              Stock
            </Link>

            {/* 2. REPORT DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("report")}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition uppercase font-semibold text-xs ${
                  openDropdown === "report"
                    ? "bg-gray-700 text-[#37AD47] shadow-inner"
                    : "hover:bg-gray-700/80 text-gray-200"
                }`}
              >
                <span>Report</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {openDropdown === "report" && (
                <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs">
                  <div className="border-b px-3 py-1 font-bold text-[#37AD47] flex items-center space-x-1 text-[11px]">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>LEDGER</span>
                  </div>
                  <Link
                    to="/reports/ledger/summary"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Ledger summary
                  </Link>
                  <Link
                    to="/reports/ledger/details"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Ledger details
                  </Link>

                  <div className="border-b border-t mt-1 px-3 py-1 font-bold text-[#48B6AD] flex items-center space-x-1 text-[11px]">
                    <Layers className="h-3.5 w-3.5" />
                    <span>STOCK</span>
                  </div>
                  <Link
                    to="/reports/stock"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Stock
                  </Link>
                  <Link
                    to="/reports/stock/product-details"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Product details
                  </Link>
                  <Link
                    to="/reports/stock/product-expense"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Product expense
                  </Link>
                  <Link
                    to="/reports/stock/product-profit"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Product profit
                  </Link>

                  <div className="border-b border-t mt-1 px-3 py-1 font-bold text-[#8972A8] flex items-center space-x-1 text-[11px]">
                    <PieChart className="h-3.5 w-3.5" />
                    <span>FINANCIAL REPORT</span>
                  </div>
                  <Link
                    to="/reports/financial/trial-balance"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Trial balance
                  </Link>
                  <Link
                    to="/reports/financial/balance-sheet"
                    onClick={() => setOpenDropdown(null)}
                    className="block px-4 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    Balance sheet
                  </Link>
                </div>
              )}
            </div>

            {/* 3. MASTER DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("master")}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition uppercase font-semibold text-xs ${
                  openDropdown === "master"
                    ? "bg-gray-700 text-[#37AD47] shadow-inner"
                    : "hover:bg-gray-700/80 text-gray-200"
                }`}
              >
                <span>Master</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {openDropdown === "master" && (
                <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs">
                  <div className="px-3 py-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider border-b pb-1 mb-1">
                    Master Menu
                  </div>
                  <Link
                    to="/master/product/create"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-[#2BC481]" />
                    <span>Product (for new add)</span>
                  </Link>
                  <Link
                    to="/master/account/create"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-blue-500" />
                    <span>Account (for new add)</span>
                  </Link>
                  <Link
                    to="/master/customer/create"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Customer (for new add)</span>
                  </Link>
                  <Link
                    to="/master/supplier/create"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Supplier (for new add)</span>
                  </Link>
                  <div className="border-t my-1"></div>
                  <Link
                    to="/master/other-expense"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    <span>Other expense</span>
                  </Link>
                  <Link
                    to="/master/other-sale"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <span>Other sale</span>
                  </Link>
                  <Link
                    to="/master/saving"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#E9EFFF] transition"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                    <span>Saving</span>
                  </Link>
                </div>
              )}
            </div>

            {/* 4. SETTING DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("setting")}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition uppercase font-semibold text-xs ${
                  openDropdown === "setting"
                    ? "bg-gray-700 text-[#37AD47] shadow-inner"
                    : "hover:bg-gray-700/80 text-gray-200"
                }`}
              >
                <span>Settings</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {openDropdown === "setting" && (
                <div className="absolute left-0 mt-1.5 w-52 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs">
                  <div className="px-3 py-1 font-bold text-[11px] text-gray-400 uppercase tracking-wider border-b pb-1 mb-1">
                    Setting Menu
                  </div>
                  <Link
                    to="/settings/invoice-settings"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] transition"
                  >
                    <Sliders className="h-3.5 w-3.5 text-[#37AD47]" />
                    <span>Invoice setting</span>
                  </Link>
                  <Link
                    to="/settings/access-control"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] transition"
                  >
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span>Access control</span>
                  </Link>
                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-purple-50 text-purple-700 font-semibold transition"
                    >
                      <Settings className="h-3.5 w-3.5 text-purple-600" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Side: Company Badge + Notifications + Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Active Company / Branch Badge */}
          <button
            type="button"
            onClick={onOpenCompanyModal}
            className="flex items-center space-x-1.5 rounded-lg bg-gray-700/90 hover:bg-gray-600 px-2 sm:px-2.5 py-1 text-xs text-white transition border border-gray-600/80 shadow-sm max-w-[150px] sm:max-w-[240px] truncate"
            title="Click to change company or branch"
          >
            <Building className="h-3.5 w-3.5 text-[#2BC481] shrink-0" />
            <span className="font-semibold truncate">
              {companyDisplayName}
            </span>
            <span className="hidden md:inline text-gray-300">({fyDisplayName})</span>
          </button>

          {/* Bell Icon / Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 rounded-full hover:bg-gray-700 text-gray-200 transition"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.some((n) => !n.read) && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b px-3 pb-1.5">
                  <span className="font-bold text-gray-700">Notifications</span>
                  <span className="text-[10px] text-gray-400">Server Info</span>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`px-3 py-2 hover:bg-gray-50 ${!n.read ? "bg-green-50/50" : ""}`}>
                      <div className="font-medium text-gray-800">{n.title}</div>
                      <div className="text-[10px] text-gray-400">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("profile")}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition ${
                openDropdown === "profile" ? "bg-gray-700 text-[#37AD47]" : "hover:bg-gray-700 text-white"
              }`}
            >
              <div className="h-6 w-6 rounded-full bg-[#37AD47] flex items-center justify-center text-white font-bold text-xs">
                {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold max-w-[90px] truncate hidden sm:inline text-xs">
                {user?.name || user?.username || "Account"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {openDropdown === "profile" && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white py-2 shadow-2xl ring-1 ring-black/10 z-50 text-gray-800 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b px-3 py-2 mb-1">
                  <div className="font-bold text-gray-900 truncate">{user?.name || user?.username}</div>
                  <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
                  <div className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 uppercase">
                    {user?.role || "user"}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOpenDropdown(null);
                    if (onOpenCompanyModal) onOpenCompanyModal();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] transition text-left"
                >
                  <Repeat className="h-3.5 w-3.5 text-blue-600" />
                  <span>Switch Company</span>
                </button>

                <button
                  onClick={() => {
                    setOpenDropdown(null);
                    if (onOpenFYModal) onOpenFYModal();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-[#E9EFFF] transition text-left"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  <span>Set Financial Year</span>
                </button>

                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-purple-50 text-purple-700 font-semibold transition"
                  >
                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div className="border-t my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-red-50 text-red-600 transition text-left font-semibold"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MOBILE SLIDE-OVER DRAWER (Visible on Mobile / Tablet) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white text-gray-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between bg-[#4A4A4A] px-4 py-3.5 text-white">
              <div className="flex items-center space-x-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 font-extrabold text-white text-sm">
                  b
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight leading-tight">BUSINESS BILL</div>
                  <div className="text-[10px] text-green-400 font-medium">Accounting & Invoicing</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Active Company / FY Quick Strip */}
            <div className="bg-[#E9EFFF] border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between">
              <div className="truncate pr-2">
                <div className="text-xs font-bold text-gray-800 truncate">{companyDisplayName}</div>
                <div className="text-[11px] text-gray-500 truncate">{branchDisplayName} • FY {fyDisplayName}</div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenCompanyModal) onOpenCompanyModal();
                }}
                className="shrink-0 rounded bg-[#37AD47] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-[#2f963e]"
              >
                Switch
              </button>
            </div>

            {/* Quick Action Grid */}
            <div className="p-3 bg-gray-50 border-b grid grid-cols-4 gap-1.5 text-center">
              <Link
                to="/transactions/sale-entry"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-green-500 shadow-xs transition"
              >
                <ShoppingCart className="h-4 w-4 text-[#2BC481]" />
                <span className="text-[10px] font-bold text-gray-700 mt-1">Sale</span>
              </Link>
              <Link
                to="/transactions/purchase-entry"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-amber-500 shadow-xs transition"
              >
                <ShoppingBag className="h-4 w-4 text-[#FBBC4B]" />
                <span className="text-[10px] font-bold text-gray-700 mt-1">Purchase</span>
              </Link>
              <Link
                to="/transactions/bank-book"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-purple-500 shadow-xs transition"
              >
                <CreditCard className="h-4 w-4 text-[#8972A8]" />
                <span className="text-[10px] font-bold text-gray-700 mt-1">Bank</span>
              </Link>
              <Link
                to="/transactions/cash-book"
                onClick={() => setMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-teal-500 shadow-xs transition"
              >
                <BookOpen className="h-4 w-4 text-[#48B6AD]" />
                <span className="text-[10px] font-bold text-gray-700 mt-1">Cash</span>
              </Link>
            </div>

            {/* Drawer Body: Mobile Accordions for TRANSACTION, REPORT, MASTER, SETTING */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {/* ── 1. TRANSACTION ACCORDION ── */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSection("transaction")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left font-bold text-xs uppercase tracking-wider transition ${
                    mobileExpandedSection === "transaction"
                      ? "bg-green-50/80 text-[#37AD47] border-l-4 border-[#37AD47]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-[#2BC481]" />
                    <span>Transaction</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileExpandedSection === "transaction" ? "rotate-180 text-[#37AD47]" : "text-gray-400"
                    }`}
                  />
                </button>

                {mobileExpandedSection === "transaction" && (
                  <div className="bg-gray-50/60 px-2 py-1.5 grid grid-cols-2 gap-1 text-xs">
                    <Link
                      to="/transactions/cash-book"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[#48B6AD]" />
                      <span>Cash book</span>
                    </Link>
                    <Link
                      to="/transactions/sale-entry"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-[#2BC481]" />
                      <span>Sale</span>
                    </Link>
                    <Link
                      to="/transactions/bank-book"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-[#8972A8]" />
                      <span>Bank book</span>
                    </Link>
                    <Link
                      to="/transactions/sale-return"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-[#DF6B6B]" />
                      <span>Sale return</span>
                    </Link>
                    <Link
                      to="/transactions/journal-book"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <span>Journal book</span>
                    </Link>
                    <Link
                      to="/transactions/purchase-entry"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 text-[#FBBC4B]" />
                      <span>Purchases</span>
                    </Link>
                    <Link
                      to="/transactions/purchase-return"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                      <span>Purchase return</span>
                    </Link>
                    <Link
                      to="/transactions/challan"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <FileCheck className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Challan</span>
                    </Link>
                    <Link
                      to="/transactions/quotation"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-500" />
                      <span>Quotation</span>
                    </Link>
                    <Link
                      to="/transactions/income-expense"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-[#2BC481]" />
                      <span>Income</span>
                    </Link>
                    <Link
                      to="/transactions/income-expense"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span>Expenses</span>
                    </Link>
                    <Link
                      to="/transactions/job-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-teal-600" />
                      <span>Job in</span>
                    </Link>
                    <Link
                      to="/transactions/job-out"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                      <span>Job out</span>
                    </Link>
                    <Link
                      to="/transactions/employee-details"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <Users className="h-3.5 w-3.5 text-sky-600" />
                      <span>Employee</span>
                    </Link>
                    <Link
                      to="/master/customer/list"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                      <span>Customers</span>
                    </Link>
                    <Link
                      to="/master/supplier/list"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-white text-gray-700 font-medium"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                      <span>Suppliers</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* ── 2. REPORT ACCORDION ── */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSection("report")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left font-bold text-xs uppercase tracking-wider transition ${
                    mobileExpandedSection === "report"
                      ? "bg-green-50/80 text-[#37AD47] border-l-4 border-[#37AD47]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-4 w-4 text-[#8972A8]" />
                    <span>Report</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileExpandedSection === "report" ? "rotate-180 text-[#37AD47]" : "text-gray-400"
                    }`}
                  />
                </button>

                {mobileExpandedSection === "report" && (
                  <div className="bg-gray-50/60 px-3 py-2 space-y-2 text-xs">
                    {/* Ledger sub-group */}
                    <div className="text-[11px] font-bold text-[#37AD47] flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span>LEDGER</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-2">
                      <Link
                        to="/reports/ledger/summary"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Ledger Summary
                      </Link>
                      <Link
                        to="/reports/ledger/details"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Ledger Details
                      </Link>
                    </div>

                    {/* Stock sub-group */}
                    <div className="text-[11px] font-bold text-[#48B6AD] flex items-center gap-1 pt-1 border-t">
                      <Layers className="h-3 w-3" />
                      <span>STOCK</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-2">
                      <Link
                        to="/reports/stock"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Stock Report
                      </Link>
                      <Link
                        to="/reports/stock/product-details"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Product Details
                      </Link>
                      <Link
                        to="/reports/stock/product-expense"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Product Expense
                      </Link>
                      <Link
                        to="/reports/stock/product-profit"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Product Profit
                      </Link>
                    </div>

                    {/* Financial sub-group */}
                    <div className="text-[11px] font-bold text-[#8972A8] flex items-center gap-1 pt-1 border-t">
                      <PieChart className="h-3 w-3" />
                      <span>FINANCIAL</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-2">
                      <Link
                        to="/reports/financial/trial-balance"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Trial Balance
                      </Link>
                      <Link
                        to="/reports/financial/balance-sheet"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-1 text-gray-700 hover:text-green-700"
                      >
                        • Balance Sheet
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 3. MASTER ACCORDION ── */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSection("master")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left font-bold text-xs uppercase tracking-wider transition ${
                    mobileExpandedSection === "master"
                      ? "bg-green-50/80 text-[#37AD47] border-l-4 border-[#37AD47]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <PlusCircle className="h-4 w-4 text-[#2BC481]" />
                    <span>Master</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileExpandedSection === "master" ? "rotate-180 text-[#37AD47]" : "text-gray-400"
                    }`}
                  />
                </button>

                {mobileExpandedSection === "master" && (
                  <div className="bg-gray-50/60 px-3 py-2 space-y-1 text-xs">
                    <Link
                      to="/master/product/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-[#2BC481]" />
                      <span>Product (for new add)</span>
                    </Link>
                    <Link
                      to="/master/account/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-blue-500" />
                      <span>Account (for new add)</span>
                    </Link>
                    <Link
                      to="/master/customer/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Customer (for new add)</span>
                    </Link>
                    <Link
                      to="/master/supplier/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
                      <span>Supplier (for new add)</span>
                    </Link>
                    <Link
                      to="/master/other-expense"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span>Other expense</span>
                    </Link>
                    <Link
                      to="/master/other-sale"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      <span>Other sale</span>
                    </Link>
                    <Link
                      to="/master/saving"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-white text-gray-700"
                    >
                      <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                      <span>Saving</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* ── 4. SETTING ACCORDION ── */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMobileSection("setting")}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left font-bold text-xs uppercase tracking-wider transition ${
                    mobileExpandedSection === "setting"
                      ? "bg-green-50/80 text-[#37AD47] border-l-4 border-[#37AD47]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <span>Settings</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileExpandedSection === "setting" ? "rotate-180 text-[#37AD47]" : "text-gray-400"
                    }`}
                  />
                </button>

                {mobileExpandedSection === "setting" && (
                  <div className="bg-gray-50/60 px-3 py-2 space-y-1 text-xs">
                    <Link
                      to="/settings/invoice-settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-white text-gray-700"
                    >
                      <Sliders className="h-3.5 w-3.5 text-[#37AD47]" />
                      <span>Invoice setting</span>
                    </Link>
                    <Link
                      to="/settings/access-control"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-white text-gray-700"
                    >
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                      <span>Access control</span>
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center space-x-2 p-2 rounded bg-purple-50 text-purple-700 font-semibold"
                      >
                        <Settings className="h-3.5 w-3.5 text-purple-600" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer: User Profile + Logout */}
            <div className="border-t border-gray-200 p-3.5 bg-gray-50 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-full bg-[#37AD47] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-bold text-gray-800 truncate">
                    {user?.name || user?.username}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
                </div>
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800 uppercase">
                  {user?.role || "user"}
                </span>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenCompanyModal) onOpenCompanyModal();
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white py-1.5 text-center text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Change Co.
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenFYModal) onOpenFYModal();
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white py-1.5 text-center text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Set Fin. Year
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-red-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
