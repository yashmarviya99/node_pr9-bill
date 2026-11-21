import React, { useState, useEffect } from "react";
import { X, DollarSign, CheckCircle } from "lucide-react";
import api from "../../services/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

export default function PaymentModal({ isOpen, onClose, transaction, onSuccess }) {
  if (!isOpen || !transaction) return null;

  const [loading, setLoading] = useState(false);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState(transaction.remainingAmount || transaction.remaining || 0);
  const [narration, setNarration] = useState("");

  useEffect(() => {
    fetchCashBankAccounts();
  }, []);

  const fetchCashBankAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      if (res.data?.success) {
        const filtered = (res.data.accounts || []).filter(
          (a) => a.accountType === "cash" || a.accountType === "bank"
        );
        setCashBankAccounts(filtered);
        if (filtered.length > 0) {
          setSelectedAccountId(filtered[0]._id);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmt = Number(amount || 0);
    if (payAmt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      await api.post("/payments", {
        accountId: transaction.account?._id || transaction.account,
        paymentAccountId: selectedAccountId,
        amount: payAmt,
        paymentMode: paymentMode.toLowerCase(),
        paymentDate: new Date().toISOString(),
        paymentNumber: `PAY-${Date.now().toString().slice(-5)}`,
        referenceNumber: transaction.invoiceNumber || "",
        narration: narration.trim() || `Payment against invoice ${transaction.invoiceNumber}`,
      });

      toast.success("Payment recorded successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden text-gray-800 text-xs">
        <div className="flex items-center justify-between bg-[#4A4A4A] px-5 py-3 text-white">
          <div className="flex items-center space-x-1.5 font-bold text-sm">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span>RECORD PAYMENT / RECEIPT</span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 border space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-bold text-gray-800">{transaction.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Party Name:</span>
              <span className="font-semibold text-gray-800">{transaction.account?.name || transaction.accountName}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold pt-1 border-t">
              <span>Remaining Amount:</span>
              <span>{formatCurrency(transaction.remainingAmount ?? transaction.remaining ?? 0)}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Online">Online / UPI</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Deposit / Withdraw Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
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
            <label className="block font-semibold mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 font-bold text-green-700 outline-none focus:border-green-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Payment Narration</label>
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Cheque / reference or transaction note"
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-1.5 font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-5 py-1.5 font-bold shadow inline-flex items-center space-x-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{loading ? "Recording..." : "Save Payment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
