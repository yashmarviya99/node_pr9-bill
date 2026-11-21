import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Sliders, Shield, Save, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function SettingsPage({ initialTab = "invoice" }) {
  // tab: 'invoice' | 'access'
  const [tab, setTab] = useState(initialTab);
  const { activeCompany } = useSelector((state) => state.company);
  const { activeFinancialYear } = useSelector((state) => state.financialYear);

  const [loading, setLoading] = useState(false);

  // Invoice Settings State (Page 36)
  const [settings, setSettings] = useState({
    salePrefix: "SALE-",
    saleStartingNumber: 1,
    purchasePrefix: "PUR-",
    purchaseStartingNumber: 1,
    saleReturnPrefix: "SR-",
    saleReturnStartingNumber: 1,
    purchaseReturnPrefix: "PR-",
    purchaseReturnStartingNumber: 1,
    cashVoucherPrefix: "C-",
    cashStartingNumber: 1,
    bankVoucherPrefix: "B-",
    bankStartingNumber: 1,
    journalVoucherPrefix: "J-",
    journalStartingNumber: 1,
    defaultTermsAndConditions: "Goods once sold will not be taken back or exchanged.",
  });

  // Access Control / Year-End State (Page 36)
  const [closeModal, setCloseModal] = useState(false);
  const [nextFYName, setNextFYName] = useState("2027-28");
  const [nextStartDate, setNextStartDate] = useState("2027-04-01");
  const [nextEndDate, setNextEndDate] = useState("2028-03-31");

  useEffect(() => {
    fetchInvoiceSettings();
  }, [activeCompany, activeFinancialYear]);

  const fetchInvoiceSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings/invoice-settings");
      if (res.data?.success && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvoiceSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/settings/invoice-settings", settings);
      toast.success("Invoice settings saved successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseFinancialYear = async (e) => {
    e.preventDefault();
    if (!activeFinancialYear?._id) {
      toast.error("No active financial year found");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/settings/close-financial-year", {
        currentFinancialYearId: activeFinancialYear._id,
        nextFinancialYearName: nextFYName,
        nextStartDate,
        nextEndDate,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setCloseModal(false);
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || "Failed to close financial year");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-50 text-[#37AD47] rounded-lg">
            {tab === "invoice" ? <Sliders className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              {tab === "invoice" ? "INVOICE & VOUCHER SETTINGS" : "ACCESS CONTROL & FISCAL ROLLOVER"}
            </h2>
            <p className="text-[11px] text-gray-400">
              Company: {activeCompany?.companyName || "BUSINESS BILL"} • Current FY {activeFinancialYear?.name || "2026-27"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setTab("invoice")}
            className={`rounded px-3.5 py-1.5 text-xs font-bold transition inline-flex items-center space-x-1 ${
              tab === "invoice" ? "bg-[#4A4A4A] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Invoice Settings</span>
          </button>
          <button
            onClick={() => setTab("access")}
            className={`rounded px-3.5 py-1.5 text-xs font-bold transition inline-flex items-center space-x-1 ${
              tab === "access" ? "bg-[#37AD47] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Access Control</span>
          </button>
        </div>
      </div>

      {tab === "invoice" ? (
        /* INVOICE SETTINGS (Page 36) */
        <form onSubmit={handleSaveInvoiceSettings} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 text-xs text-gray-700">
          <div>
            <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-4">
              Voucher & Document Prefixes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold mb-1">Sale Prefix</label>
                <input
                  type="text"
                  value={settings.salePrefix}
                  onChange={(e) => setSettings({ ...settings, salePrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Purchase Prefix</label>
                <input
                  type="text"
                  value={settings.purchasePrefix}
                  onChange={(e) => setSettings({ ...settings, purchasePrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Sale Return Prefix</label>
                <input
                  type="text"
                  value={settings.saleReturnPrefix}
                  onChange={(e) => setSettings({ ...settings, saleReturnPrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Purchase Return Prefix</label>
                <input
                  type="text"
                  value={settings.purchaseReturnPrefix}
                  onChange={(e) => setSettings({ ...settings, purchaseReturnPrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Cash Voucher Prefix</label>
                <input
                  type="text"
                  value={settings.cashVoucherPrefix}
                  onChange={(e) => setSettings({ ...settings, cashVoucherPrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Bank Voucher Prefix</label>
                <input
                  type="text"
                  value={settings.bankVoucherPrefix}
                  onChange={(e) => setSettings({ ...settings, bankVoucherPrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Journal Voucher Prefix</label>
                <input
                  type="text"
                  value={settings.journalVoucherPrefix}
                  onChange={(e) => setSettings({ ...settings, journalVoucherPrefix: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider border-b pb-1.5 mb-4">
              Default Terms & Conditions
            </h3>
            <textarea
              rows="3"
              value={settings.defaultTermsAndConditions}
              onChange={(e) => setSettings({ ...settings, defaultTermsAndConditions: e.target.value })}
              className="w-full rounded border border-gray-300 p-3 outline-none focus:border-green-500"
            ></textarea>
          </div>

          <div className="pt-3 border-t flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2 font-bold shadow text-xs inline-flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>SAVE CONFIGURATION</span>
            </button>
          </div>
        </form>
      ) : (
        /* ACCESS CONTROL / FISCAL YEAR END (Page 36) */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 text-xs text-gray-700">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 uppercase">
              COMPLETION OF FINANCIAL YEAR & CARRY FORWARD
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Active Financial Year: <strong>{activeFinancialYear?.name || "2026-27"}</strong> (1st April to 31st March)
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <h4 className="font-bold text-blue-900 text-xs">When a financial year is completed:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-[11px]">
              <li>The previous financial year will be closed securely.</li>
              <li>Accounts and products will be carried forward to the new financial year.</li>
              <li>The previous year's closing balance will become the new year's opening balance.</li>
              <li>Any changes in previous balances will be reflected in opening balances.</li>
              <li>Previous-year historical transactions remain permanently available for audit and reports.</li>
              <li>New-year transactions will be maintained separately without data pollution.</li>
            </ol>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={() => setCloseModal(true)}
              className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-6 py-2.5 font-bold shadow text-xs inline-flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Close Financial Year & Carry Forward Balances</span>
            </button>
          </div>

          {/* Close Year Modal */}
          {closeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden p-6 text-gray-800 animate-in fade-in space-y-4">
                <div className="flex items-center space-x-2 text-green-700 font-bold text-sm border-b pb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Initiate New Financial Year Rollover</span>
                </div>

                <form onSubmit={handleCloseFinancialYear} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">New Financial Year Name</label>
                    <input
                      type="text"
                      required
                      value={nextFYName}
                      onChange={(e) => setNextFYName(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-1.5 outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Start Date</label>
                      <input
                        type="date"
                        required
                        value={nextStartDate}
                        onChange={(e) => setNextStartDate(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={nextEndDate}
                        onChange={(e) => setNextEndDate(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setCloseModal(false)}
                      className="rounded px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded bg-[#37AD47] hover:bg-[#2f963e] text-white px-5 py-1.5 text-xs font-bold shadow"
                    >
                      {loading ? "Processing..." : "Confirm & Rollover"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
