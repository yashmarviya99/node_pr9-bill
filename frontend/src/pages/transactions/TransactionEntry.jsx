import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FileText,
  Plus,
  Minus,
  Save,
  RotateCcw,
  List,
  AlertCircle,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import api from "../../services/api";
import { isDateInFinancialYear, formatISODate } from "../../utils/date";
import { formatCurrency, formatNumber } from "../../utils/currency";
import { calculateLineItem } from "../../utils/gst";
import toast from "react-hot-toast";

export default function TransactionEntry({ transactionType = "sale" }) {
  // transactionType: 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'challan' | 'quotation'
  const navigate = useNavigate();
  const location = useLocation();

  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const isSale = transactionType === "sale";
  const isPurchase = transactionType === "purchase";
  const isSaleReturn = transactionType === "sale_return";
  const isPurchaseReturn = transactionType === "purchase_return";
  const isChallan = transactionType === "challan";
  const isQuotation = transactionType === "quotation";

  // Account type filter
  const accountTypeFilter = isPurchase || isPurchaseReturn ? "supplier" : "customer";

  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);

  // Form Header State
  const [invoiceDate, setInvoiceDate] = useState(formatISODate(new Date()));
  const [invoiceNumber, setInvoiceNumber] = useState(isPurchase ? "" : "Auto Generated");
  const [accountId, setAccountId] = useState("");
  const [fromType, setFromType] = useState(isSale ? "Sale" : isPurchase ? "Purchase" : isChallan ? "Challan" : "Quotation");
  const [originalInvoiceId, setOriginalInvoiceId] = useState("");

  // Product items table state
  const [items, setItems] = useState([
    {
      productId: "",
      productName: "",
      description: "",
      quantity: 1,
      uom: "PCS",
      rate: 0,
      amount: 0,
      discountPercent: 0,
      taxableAmount: 0,
      gstRate: 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      invoiceAmount: 0,
    },
  ]);

  // Bottom Section State
  const [narration, setNarration] = useState("");
  const [terms, setTerms] = useState("Goods once sold will not be taken back or exchanged.");
  const [paymentMode, setPaymentMode] = useState("Cash"); // 'Cash', 'Bank', 'Online'
  const [cashBankBookId, setCashBankBookId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNarration, setPaymentNarration] = useState("");

  // Other charges
  const [transportAmount, setTransportAmount] = useState(0);
  const [labourAmount, setLabourAmount] = useState(0);

  // Validation errors map
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, [activeCompany, transactionType]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // 1. Fetch parties (customers or suppliers)
      const accRes = await api.get("/accounts", {
        params: { accountType: accountTypeFilter },
      });
      if (accRes.data?.success) {
        setAccounts(accRes.data.accounts || []);
      }

      // 2. Fetch products
      const prodRes = await api.get("/products");
      if (prodRes.data?.success) {
        setProducts(prodRes.data.products || []);
      }

      // 3. Fetch cash & bank accounts
      const cbRes = await api.get("/accounts");
      if (cbRes.data?.success) {
        const cbList = (cbRes.data.accounts || []).filter(
          (a) => a.accountType === "cash" || a.accountType === "bank"
        );
        setCashBankAccounts(cbList);
        if (cbList.length > 0) {
          setCashBankBookId(cbList[0]._id);
        }
      }

      // 4. If returns, fetch original invoices
      if (isSaleReturn) {
        const sRes = await api.get("/sales");
        if (sRes.data?.success) setExistingInvoices(sRes.data.sales || []);
      } else if (isPurchaseReturn) {
        const pRes = await api.get("/purchases");
        if (pRes.data?.success) setExistingInvoices(pRes.data.purchases || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Financial Year validation on date change
  const handleDateChange = (val) => {
    setInvoiceDate(val);
    if (!isDateInFinancialYear(val, activeFinancialYear)) {
      setErrors((prev) => ({
        ...prev,
        date: "Change the Financial Year",
      }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.date;
        return copy;
      });
    }
  };

  // Product row manipulation
  const handleProductChange = (index, prodId) => {
    const selectedProd = products.find((p) => p._id === prodId);
    if (!selectedProd) return;

    const rate = isPurchase ? (selectedProd.purchasePrice || 0) : (selectedProd.sellingPrice || 0);
    const gstRate = selectedProd.gstRate || 0;

    const rowCalc = calculateLineItem({
      quantity: items[index].quantity,
      rate,
      discountPercent: items[index].discountPercent,
      gstRate,
      isInterState: false,
    });

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: prodId,
      productName: selectedProd.name,
      description: selectedProd.description || selectedProd.name,
      uom: selectedProd.uom || "PCS",
      rate,
      gstRate,
      ...rowCalc,
    };
    setItems(newItems);
  };

  const handleRowFieldChange = (index, field, value) => {
    const newItems = [...items];
    const currentRow = { ...newItems[index], [field]: value };

    // Recompute row totals
    const rowCalc = calculateLineItem({
      quantity: Number(field === "quantity" ? value : currentRow.quantity),
      rate: Number(field === "rate" ? value : currentRow.rate),
      discountPercent: Number(field === "discountPercent" ? value : currentRow.discountPercent),
      gstRate: Number(field === "gstRate" ? value : currentRow.gstRate),
      isInterState: false,
    });

    newItems[index] = {
      ...currentRow,
      ...rowCalc,
    };
    setItems(newItems);
  };

  const addRow = (index) => {
    const newRow = {
      productId: "",
      productName: "",
      description: "",
      quantity: 1,
      uom: "PCS",
      rate: 0,
      amount: 0,
      discountPercent: 0,
      taxableAmount: 0,
      gstRate: 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      invoiceAmount: 0,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, newRow);
    setItems(updated);
  };

  const removeRow = (index) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Real-Time Calculations
  const productAmount = items.reduce((acc, it) => acc + (it.amount || 0), 0);
  const discountAmount = items.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
  const taxableAmount = items.reduce((acc, it) => acc + (it.taxableAmount || 0), 0);
  const cgstAmount = items.reduce((acc, it) => acc + (it.cgstAmount || 0), 0);
  const sgstAmount = items.reduce((acc, it) => acc + (it.sgstAmount || 0), 0);
  const igstAmount = items.reduce((acc, it) => acc + (it.igstAmount || 0), 0);
  const otherCharges = Number(transportAmount || 0) + Number(labourAmount || 0);
  const calculatedInvoiceAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount + otherCharges;
  const roundedTotalAmount = Math.round(calculatedInvoiceAmount);
  const roundOff = Math.round((roundedTotalAmount - calculatedInvoiceAmount) * 100) / 100;

  const validateForm = () => {
    const newErr = {};
    if (!invoiceDate) newErr.date = "Invoice Date is required";
    if (errors.date) newErr.date = errors.date;
    if (!accountId) newErr.account = "Please select an Account";
    if (!fromType) newErr.from = "Please select From option";
    if (isPurchase && !invoiceNumber.trim()) newErr.invoiceNumber = "Purchase invoice number is required";
    if (items.some((it) => !it.productId)) newErr.products = "All rows must have a product selected";
    if (items.some((it) => Number(it.quantity) <= 0 || isNaN(Number(it.quantity)))) {
      newErr.quantity = "Please Enter a Valid Number for Quantity";
    }
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSave = async (isSaveAndNew = false) => {
    if (!validateForm()) {
      toast.error("Please resolve validation errors before saving");
      return;
    }

    try {
      setLoading(true);

      const formattedItems = items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        description: it.description,
        hsnSac: it.hsnSac || "",
        uom: it.uom,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        discountPercent: Number(it.discountPercent || 0),
        gstRate: Number(it.gstRate || 0),
      }));

      const payload = {
        invoiceDate,
        accountId,
        items: formattedItems,
        transportAmount: Number(transportAmount || 0),
        labourAmount: Number(labourAmount || 0),
        roundOff,
        paymentMode: isChallan || isQuotation ? "credit" : paymentMode.toLowerCase(),
        paymentAccountId: cashBankBookId || undefined,
        paymentAmount: isChallan || isQuotation ? 0 : Number(paymentAmount || 0),
        narration: narration.trim(),
        termsAndConditions: terms.trim(),
      };

      if (isPurchase) {
        payload.invoiceNumber = invoiceNumber.trim();
      }

      // Endpoint selection
      let endpoint = "/sales";
      if (isPurchase) endpoint = "/purchases";
      else if (isSaleReturn) endpoint = "/sale-returns";
      else if (isPurchaseReturn) endpoint = "/purchase-returns";
      else if (isChallan) endpoint = "/challans";
      else if (isQuotation) endpoint = "/quotations";

      const res = await api.post(endpoint, payload);

      if (res.data?.success) {
        toast.success(`${transactionType.toUpperCase()} saved successfully!`);

        if (isSaveAndNew) {
          // Reset form for next entry
          setItems([
            {
              productId: "",
              productName: "",
              description: "",
              quantity: 1,
              uom: "PCS",
              rate: 0,
              amount: 0,
              discountPercent: 0,
              taxableAmount: 0,
              gstRate: 18,
              cgstPercent: 9,
              sgstPercent: 9,
              igstPercent: 0,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 0,
              invoiceAmount: 0,
            },
          ]);
          setPaymentAmount(0);
          setNarration("");
          if (isPurchase) setInvoiceNumber("");
        } else {
          // Redirect to appropriate list
          if (isSale) navigate("/transactions/sale-list");
          else if (isPurchase) navigate("/transactions/purchase-list");
          else if (isSaleReturn) navigate("/transactions/sale-return-list");
          else if (isPurchaseReturn) navigate("/transactions/purchase-return-list");
          else if (isChallan) navigate("/transactions/challan-list");
          else if (isQuotation) navigate("/transactions/quotation-list");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const titleText = isSale
    ? "SALE ENTRY FORM"
    : isPurchase
    ? "PURCHASE ENTRY FORM"
    : isSaleReturn
    ? "SALE RETURN ENTRY FORM"
    : isPurchaseReturn
    ? "PURCHASE RETURN ENTRY FORM"
    : isChallan
    ? "CHALLAN ENTRY FORM"
    : "QUOTATION ENTRY FORM";

  const listUrl = isSale
    ? "/transactions/sale-list"
    : isPurchase
    ? "/transactions/purchase-list"
    : isSaleReturn
    ? "/transactions/sale-return-list"
    : isPurchaseReturn
    ? "/transactions/purchase-return-list"
    : isChallan
    ? "/transactions/challan-list"
    : "/transactions/quotation-list";

  const listButtonLabel = isSale
    ? "SALE LIST"
    : isPurchase
    ? "PURCHASE LIST"
    : isSaleReturn
    ? "SALE RETURN LIST"
    : isPurchaseReturn
    ? "PURCHASE RETURN LIST"
    : isChallan
    ? "CHALLAN LIST"
    : "QUOTATION LIST";

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in">
      {/* Title Bar (Page 17) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {titleText}
            </h2>
            <p className="text-[11px] text-gray-400">
              Tax Compliant Transaction Entry • Financial Year {activeFinancialYear?.name || "2026-27"}
            </p>
          </div>
        </div>

        <Link
          to={listUrl}
          className="rounded bg-[#FBBC4B] hover:bg-[#e0a63e] text-gray-900 px-4 py-1.5 text-xs font-bold shadow-sm transition inline-flex items-center space-x-1"
        >
          <List className="h-3.5 w-3.5" />
          <span>{listButtonLabel}</span>
        </Link>
      </div>

      {/* Invoice & Account Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Invoice Date */}
          <div>
            <label className="block font-semibold mb-1">Invoice Date *</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full rounded border px-3 py-2 outline-none ${
                errors.date ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-green-500"
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-red-600 font-bold text-[11px] flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.date}</span>
              </p>
            )}
          </div>

          {/* Account Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold">
                {isPurchase || isPurchaseReturn ? "Supplier Account *" : "Customer Account *"}
              </label>
              <Link
                to={isPurchase || isPurchaseReturn ? "/master/supplier/create" : "/master/customer/create"}
                className="text-blue-600 hover:underline font-bold text-[11px] flex items-center space-x-0.5"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Add/New</span>
              </Link>
            </div>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={`w-full rounded border px-3 py-2 outline-none bg-white ${
                errors.account ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-green-500"
              }`}
            >
              <option value="">-- Select Party Account --</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} {acc.gstNumber ? `(${acc.gstNumber})` : ""}
                </option>
              ))}
            </select>
            {errors.account && (
              <p className="mt-1 text-red-600 font-bold text-[11px]">{errors.account}</p>
            )}
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block font-semibold mb-1">
              {isPurchase ? "Purchase Invoice No. *" : "Invoice No."}
            </label>
            <input
              type="text"
              value={invoiceNumber}
              disabled={!isPurchase}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={isPurchase ? "Enter invoice no." : "Auto Generated"}
              className={`w-full rounded border px-3 py-2 outline-none uppercase font-bold ${
                !isPurchase ? "bg-gray-100 text-gray-500" : "border-gray-300 focus:border-green-500"
              } ${errors.invoiceNumber ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.invoiceNumber && (
              <p className="mt-1 text-red-600 font-bold text-[11px]">{errors.invoiceNumber}</p>
            )}
          </div>

          {/* From Dropdown */}
          <div>
            <label className="block font-semibold mb-1">From *</label>
            <select
              value={fromType}
              onChange={(e) => setFromType(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white font-medium"
            >
              <option value="Sale">Sale</option>
              <option value="Purchase">Purchase</option>
              <option value="Purchase Return">Purchase Return</option>
              <option value="Sale Return">Sale Return</option>
              <option value="Challan">Challan</option>
              <option value="Quotation">Quotation</option>
              <option value="Direct">Direct</option>
            </select>
          </div>
        </div>

        {/* If Return, select original invoice */}
        {(isSaleReturn || isPurchaseReturn) && (
          <div className="pt-2 border-t">
            <label className="block font-semibold mb-1">Select Original Invoice Reference</label>
            <select
              value={originalInvoiceId}
              onChange={(e) => setOriginalInvoiceId(e.target.value)}
              className="w-full sm:w-1/2 rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
            >
              <option value="">-- Select Original Invoice --</option>
              {existingInvoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} • {new Date(inv.invoiceDate).toLocaleDateString("en-IN")} • {formatCurrency(inv.totalAmount)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Product Details Section (Page 17 & 18) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm text-gray-800 uppercase">PRODUCT DETAILS</span>
            <Link
              to="/master/product/create"
              className="text-blue-600 hover:underline font-bold text-[11px] flex items-center space-x-0.5"
            >
              <Plus className="h-3 w-3" />
              <span>New Product</span>
            </Link>
          </div>
          {errors.products && (
            <span className="text-red-600 font-bold text-[11px]">{errors.products}</span>
          )}
          {errors.quantity && (
            <span className="text-red-600 font-bold text-[11px]">{errors.quantity}</span>
          )}
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-[#4A4A4A] text-white font-bold">
              <tr>
                <th className="py-2 px-2 border-r border-gray-600 w-8 text-center">#</th>
                <th className="py-2 px-2 border-r border-gray-600 min-w-[180px]">Product Name *</th>
                <th className="py-2 px-2 border-r border-gray-600 min-w-[140px]">Description</th>
                <th className="py-2 px-2 border-r border-gray-600 w-20 text-center">Qty *</th>
                <th className="py-2 px-2 border-r border-gray-600 w-16 text-center">UOM</th>
                <th className="py-2 px-2 border-r border-gray-600 w-24 text-right">Rate (₹)</th>
                <th className="py-2 px-2 border-r border-gray-600 w-24 text-right">Amount</th>
                <th className="py-2 px-2 border-r border-gray-600 w-16 text-center">Disc%</th>
                <th className="py-2 px-2 border-r border-gray-600 w-24 text-right">Taxable</th>
                <th className="py-2 px-2 border-r border-gray-600 w-16 text-center">GST%</th>
                <th className="py-2 px-2 border-r border-gray-600 w-24 text-right">Total (₹)</th>
                <th className="py-2 px-2 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-2 text-center font-bold text-gray-500 border-r">
                    {index + 1}
                  </td>

                  {/* Product Dropdown */}
                  <td className="py-1 px-2 border-r">
                    <select
                      value={row.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 outline-none focus:border-green-500 bg-white text-xs font-semibold"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Description */}
                  <td className="py-1 px-2 border-r">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleRowFieldChange(index, "description", e.target.value)}
                      placeholder="Specifications"
                      className="w-full rounded border border-gray-200 px-2 py-1 outline-none focus:border-green-500 text-xs"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-1 px-2 border-r text-center">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.quantity}
                      onChange={(e) => handleRowFieldChange(index, "quantity", e.target.value)}
                      className="w-full text-center rounded border border-gray-300 px-1 py-1 font-bold outline-none focus:border-green-500 text-xs"
                    />
                  </td>

                  {/* UOM */}
                  <td className="py-1 px-2 border-r text-center font-medium text-gray-600">
                    {row.uom || "PCS"}
                  </td>

                  {/* Rate */}
                  <td className="py-1 px-2 border-r text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => handleRowFieldChange(index, "rate", e.target.value)}
                      className="w-full text-right rounded border border-gray-300 px-2 py-1 font-semibold outline-none focus:border-green-500 text-xs"
                    />
                  </td>

                  {/* Amount (Qty x Rate) */}
                  <td className="py-2 px-2 border-r text-right font-medium text-gray-800">
                    {formatCurrency(row.amount)}
                  </td>

                  {/* Discount % */}
                  <td className="py-1 px-2 border-r text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={row.discountPercent}
                      onChange={(e) => handleRowFieldChange(index, "discountPercent", e.target.value)}
                      className="w-full text-center rounded border border-gray-200 px-1 py-1 outline-none focus:border-green-500 text-xs"
                    />
                  </td>

                  {/* Taxable Amount */}
                  <td className="py-2 px-2 border-r text-right font-semibold text-gray-800">
                    {formatCurrency(row.taxableAmount)}
                  </td>

                  {/* GST % */}
                  <td className="py-1 px-2 border-r text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={row.gstRate}
                      onChange={(e) => handleRowFieldChange(index, "gstRate", e.target.value)}
                      className="w-12 text-center rounded border border-gray-200 px-1 py-1 outline-none focus:border-green-500 font-bold text-xs"
                    />
                  </td>

                  {/* Total Line Amount */}
                  <td className="py-2 px-2 border-r text-right font-extrabold text-green-700">
                    {formatCurrency(row.invoiceAmount)}
                  </td>

                  {/* + and - Controls (Page 18) */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        type="button"
                        onClick={() => addRow(index)}
                        className="rounded bg-green-600 hover:bg-green-700 text-white p-1 transition"
                        title="Add row below"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      {/* First row cannot be deleted */}
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="rounded bg-red-500 hover:bg-red-600 text-white p-1 transition"
                          title="Delete row"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section (Page 18): Left, Center, Right Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Narration & Terms (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Narration</label>
            <textarea
              rows="3"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Notes or transaction remarks"
              className="w-full rounded border border-gray-300 p-2 outline-none focus:border-green-500 text-xs"
            ></textarea>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Terms & Conditions</label>
            <textarea
              rows="3"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded border border-gray-300 p-2 outline-none focus:border-green-500 text-xs"
            ></textarea>
          </div>
        </div>

        {/* Center: Payment Mode & Cash/Bank Book (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 text-xs">
          {!isChallan && !isQuotation ? (
            <>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white font-semibold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Cash / Bank Book Name</label>
                <select
                  value={cashBankBookId}
                  onChange={(e) => setCashBankBookId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
                >
                  {cashBankAccounts.map((cb) => (
                    <option key={cb._id} value={cb._id}>
                      {cb.name} ({cb.accountType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Payment Amount Recorded (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-bold text-green-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Narration</label>
                <input
                  type="text"
                  value={paymentNarration}
                  onChange={(e) => setPaymentNarration(e.target.value)}
                  placeholder="Payment remarks or reference"
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-xs italic">
              Note: Challans and Quotations do not record any payment or cash/bank transactions.
            </div>
          )}
        </div>

        {/* Right Side: Real-Time Summary (Page 18) (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-xs space-y-2">
          <h4 className="font-extrabold text-xs text-gray-800 uppercase border-b pb-1.5">
            Real-Time Summary
          </h4>

          <div className="flex justify-between py-1">
            <span className="text-gray-500">Product Amount:</span>
            <span className="font-semibold text-gray-800">{formatCurrency(productAmount)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-gray-500">Discount Amount:</span>
            <span className="font-semibold text-red-600">-{formatCurrency(discountAmount)}</span>
          </div>

          <div className="flex justify-between py-1 border-t">
            <span className="text-gray-700 font-bold">Taxable Amount:</span>
            <span className="font-bold text-gray-900">{formatCurrency(taxableAmount)}</span>
          </div>

          <div className="flex justify-between py-0.5 text-gray-600">
            <span>CGST Amount:</span>
            <span>{formatCurrency(cgstAmount)}</span>
          </div>

          <div className="flex justify-between py-0.5 text-gray-600">
            <span>SGST Amount:</span>
            <span>{formatCurrency(sgstAmount)}</span>
          </div>

          <div className="flex justify-between py-0.5 text-gray-600">
            <span>IGST Amount:</span>
            <span>{formatCurrency(igstAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <label className="text-[10px] text-gray-500">Transport (₹)</label>
              <input
                type="number"
                min="0"
                value={transportAmount}
                onChange={(e) => setTransportAmount(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-right text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Labour (₹)</label>
              <input
                type="number"
                min="0"
                value={labourAmount}
                onChange={(e) => setLabourAmount(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-right text-xs"
              />
            </div>
          </div>

          <div className="flex justify-between py-1 border-t text-gray-700">
            <span>Invoice Amount:</span>
            <span>{formatCurrency(calculatedInvoiceAmount)}</span>
          </div>

          <div className="flex justify-between py-1 text-gray-500">
            <span>Round Off:</span>
            <span>{roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
          </div>

          <div className="flex justify-between py-2 border-t border-b border-gray-800 text-sm font-black text-gray-900 bg-green-50/50 px-2 rounded">
            <span>Total Amount:</span>
            <span className="text-[#37AD47]">{formatCurrency(roundedTotalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Save Action Buttons (Page 19) */}
      <div className="flex justify-end space-x-3 pt-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave(true)}
          className="rounded-lg bg-[#2BC481] hover:bg-[#25ab70] text-white px-6 py-2.5 text-xs font-bold shadow transition inline-flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>SAVE & NEW</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSave(false)}
          className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2.5 text-xs font-bold shadow-md transition inline-flex items-center space-x-1.5"
        >
          <Save className="h-4 w-4" />
          <span>SAVE</span>
        </button>
      </div>
    </div>
  );
}
