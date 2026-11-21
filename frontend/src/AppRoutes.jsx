import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import DashboardLayout from "./layouts/DashboardLayout";

// Auth & Setup Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Payment from "./pages/auth/Payment";
import ForgotPassword from "./pages/auth/ForgotPassword";
import CompanySelect from "./pages/company/CompanySelect";
import AdminPayments from "./pages/admin/Payments";
import AdminPanel from "./pages/admin/AdminPanel";

// Main Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Master Accounts
import AccountCreate from "./pages/master/account/AccountCreate";
import AccountList from "./pages/master/account/AccountList";

// Master Products
import ProductCreate from "./pages/master/product/ProductCreate";
import ProductList from "./pages/master/product/ProductList";

// Master Other
import OtherTransactions from "./pages/master/other/OtherTransactions";

// Transactions
import TransactionEntry from "./pages/transactions/TransactionEntry";
import TransactionList from "./pages/transactions/TransactionList";
import CashBankBook from "./pages/transactions/CashBankBook";
import JournalBook from "./pages/transactions/JournalBook";
import EmployeeManagement from "./pages/transactions/EmployeeManagement";

// Reports
import LedgerSummary from "./pages/ledger/LedgerSummary";
import LedgerDetails from "./pages/ledger/LedgerDetails";
import StockReports from "./pages/stock/StockReports";
import FinancialReports from "./pages/financial/FinancialReports";

// Settings
import SettingsPage from "./pages/settings/SettingsPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public / Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/payment" element={<Payment />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/company-select" element={<CompanySelect />} />
      <Route path="/company/create" element={<CompanySelect />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/admin/payments" element={<AdminPayments />} />

      {/* Authenticated Application routes wrapped in DashboardLayout */}
      <Route element={<DashboardLayout />}>
        {/* Main Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Master: Accounts / Customers / Suppliers */}
        <Route path="/master/account/create" element={<AccountCreate defaultAccountType="customer" />} />
        <Route path="/master/account/edit/:id" element={<AccountCreate />} />
        <Route path="/master/customer/create" element={<AccountCreate defaultAccountType="customer" />} />
        <Route path="/master/supplier/create" element={<AccountCreate defaultAccountType="supplier" />} />
        <Route path="/master/account/list" element={<AccountList pageTitle="ACCOUNT MASTER LIST" />} />
        <Route path="/master/customer/list" element={<AccountList filterType="customer" pageTitle="CUSTOMER LIST" />} />
        <Route path="/master/supplier/list" element={<AccountList filterType="supplier" pageTitle="SUPPLIER LIST" />} />

        {/* Master: Products */}
        <Route path="/master/product/create" element={<ProductCreate />} />
        <Route path="/master/product/edit/:id" element={<ProductCreate />} />
        <Route path="/master/product/list" element={<ProductList />} />

        {/* Master: Other Transactions */}
        <Route path="/master/other-expense" element={<OtherTransactions type="expense" />} />
        <Route path="/master/other-sale" element={<OtherTransactions type="sale" />} />
        <Route path="/master/saving" element={<OtherTransactions type="saving" />} />

        {/* Transactions: Sales, Purchases, Returns, Challan, Quotation */}
        <Route path="/transactions/sale-entry" element={<TransactionEntry transactionType="sale" />} />
        <Route path="/transactions/sale-list" element={<TransactionList transactionType="sale" />} />
        <Route path="/transactions/purchase-entry" element={<TransactionEntry transactionType="purchase" />} />
        <Route path="/transactions/purchase-list" element={<TransactionList transactionType="purchase" />} />
        <Route path="/transactions/sale-return" element={<TransactionEntry transactionType="sale_return" />} />
        <Route path="/transactions/sale-return-list" element={<TransactionList transactionType="sale_return" />} />
        <Route path="/transactions/purchase-return" element={<TransactionEntry transactionType="purchase_return" />} />
        <Route path="/transactions/purchase-return-list" element={<TransactionList transactionType="purchase_return" />} />
        <Route path="/transactions/challan" element={<TransactionEntry transactionType="challan" />} />
        <Route path="/transactions/challan-list" element={<TransactionList transactionType="challan" />} />
        <Route path="/transactions/quotation" element={<TransactionEntry transactionType="quotation" />} />
        <Route path="/transactions/quotation-list" element={<TransactionList transactionType="quotation" />} />

        {/* Transactions: Books */}
        <Route path="/transactions/cash-book" element={<CashBankBook mode="cash" />} />
        <Route path="/transactions/bank-book" element={<CashBankBook mode="bank" />} />
        <Route path="/transactions/journal-book" element={<JournalBook />} />
        <Route path="/transactions/income-expense" element={<OtherTransactions type="expense" />} />

        {/* Transactions: Employees */}
        <Route path="/transactions/job-in" element={<EmployeeManagement initialMode="job-in" />} />
        <Route path="/transactions/job-out" element={<EmployeeManagement initialMode="job-out" />} />
        <Route path="/transactions/employee-details" element={<EmployeeManagement initialMode="details" />} />

        {/* Reports: Ledger */}
        <Route path="/reports/ledger/summary" element={<LedgerSummary />} />
        <Route path="/reports/ledger/details" element={<LedgerDetails />} />

        {/* Reports: Stock */}
        <Route path="/reports/stock" element={<StockReports reportType="stock" />} />
        <Route path="/reports/stock/product-details" element={<StockReports reportType="details" />} />
        <Route path="/reports/stock/product-expense" element={<StockReports reportType="expense" />} />
        <Route path="/reports/stock/product-profit" element={<StockReports reportType="profit" />} />

        {/* Reports: Financial */}
        <Route path="/reports/financial/trial-balance" element={<FinancialReports type="trial-balance" />} />
        <Route path="/reports/financial/balance-sheet" element={<FinancialReports type="balance-sheet" />} />

        {/* Settings */}
        <Route path="/settings/invoice-settings" element={<SettingsPage initialTab="invoice" />} />
        <Route path="/settings/access-control" element={<SettingsPage initialTab="access" />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}