import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  UserPlus,
  UserMinus,
  Save,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
} from "lucide-react";
import api from "../../services/api";
import { formatDate, formatISODate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

export default function EmployeeManagement({ initialMode = "details" }) {
  // mode: 'job-in' | 'job-out' | 'details'
  const [mode, setMode] = useState(initialMode);
  const { activeCompany } = useSelector((state) => state.company);

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Job In Form State
  const [jobInForm, setJobInForm] = useState({
    name: "",
    contactMobile: "",
    contactEmail: "",
    address: "",
    designation: "Staff",
    salary: 15000,
    joiningDate: formatISODate(new Date()),
    notes: "",
  });

  // Job Out Form State
  const [selectedLeavingEmpId, setSelectedLeavingEmpId] = useState("");
  const [leavingDate, setLeavingDate] = useState(formatISODate(new Date()));
  const [leavingReason, setLeavingReason] = useState("Resigned");

  useEffect(() => {
    fetchEmployees();
  }, [activeCompany]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/employees");
      if (res.data?.success) {
        setEmployees(res.data.employees || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleJobInSubmit = async (e) => {
    e.preventDefault();
    if (!jobInForm.name.trim() || !jobInForm.contactMobile.trim()) {
      toast.error("Employee Name and Mobile Number are required");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/employees/job-in", jobInForm);
      if (res.data?.success) {
        toast.success("Employee added & employee ledger account created successfully!");
        setJobInForm({
          name: "",
          contactMobile: "",
          contactEmail: "",
          address: "",
          designation: "Staff",
          salary: 15000,
          joiningDate: formatISODate(new Date()),
          notes: "",
        });
        setMode("details");
        fetchEmployees();
      }
    } catch (err) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  const handleJobOutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeavingEmpId) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/employees/job-out/${selectedLeavingEmpId}`, {
        leavingDate,
        leavingReason,
      });
      if (res.data?.success) {
        toast.success("Employee account marked as closed / inactive successfully!");
        setSelectedLeavingEmpId("");
        setMode("details");
        fetchEmployees();
      }
    } catch (err) {
      toast.error(err.message || "Failed to close employee account");
    } finally {
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter((e) => e.jobStatus === "active");

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-gray-800 uppercase">
              EMPLOYEE & HR MANAGEMENT
            </h2>
            <p className="text-[11px] text-gray-400">
              Staff Accounts, Joining (Job In) & Exit (Job Out) Handlers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode("details")}
            className={`rounded px-3.5 py-1.5 text-xs font-bold transition inline-flex items-center space-x-1 ${
              mode === "details"
                ? "bg-[#4A4A4A] text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Employee Details</span>
          </button>
          <button
            onClick={() => setMode("job-in")}
            className={`rounded px-3.5 py-1.5 text-xs font-bold transition inline-flex items-center space-x-1 ${
              mode === "job-in"
                ? "bg-[#37AD47] text-white"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Job In (New Employee)</span>
          </button>
          <button
            onClick={() => setMode("job-out")}
            className={`rounded px-3.5 py-1.5 text-xs font-bold transition inline-flex items-center space-x-1 ${
              mode === "job-out"
                ? "bg-[#DF6B6B] text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <UserMinus className="h-3.5 w-3.5" />
            <span>Job Out (Exit Employee)</span>
          </button>
        </div>
      </div>

      {mode === "job-in" && (
        /* JOB IN FORM (Page 33) */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700">
          <div className="border-b pb-2">
            <h3 className="font-extrabold text-sm text-gray-900 uppercase">
              JOB IN: ADD NEW EMPLOYEE
            </h3>
            <p className="text-[11px] text-gray-500">
              Submitting this form automatically creates the staff account and links their salary ledger.
            </p>
          </div>

          <form onSubmit={handleJobInSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={jobInForm.name}
                  onChange={(e) => setJobInForm({ ...jobInForm, name: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9825123456"
                  value={jobInForm.contactMobile}
                  onChange={(e) => setJobInForm({ ...jobInForm, contactMobile: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={jobInForm.contactEmail}
                  onChange={(e) => setJobInForm({ ...jobInForm, contactEmail: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Address details"
                  value={jobInForm.address}
                  onChange={(e) => setJobInForm({ ...jobInForm, address: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Designation / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Manager, Accountant, Operator"
                  value={jobInForm.designation}
                  onChange={(e) => setJobInForm({ ...jobInForm, designation: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={jobInForm.salary}
                  onChange={(e) => setJobInForm({ ...jobInForm, salary: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Joining Date</label>
                <input
                  type="date"
                  value={jobInForm.joiningDate}
                  onChange={(e) => setJobInForm({ ...jobInForm, joiningDate: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Qualifications, emergency contact"
                  value={jobInForm.notes}
                  onChange={(e) => setJobInForm({ ...jobInForm, notes: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#37AD47] hover:bg-[#2f963e] text-white px-8 py-2 font-bold shadow text-xs inline-flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>SAVE & CREATE EMPLOYEE</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "job-out" && (
        /* JOB OUT FORM (Page 33) */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 text-xs text-gray-700 max-w-2xl mx-auto">
          <div className="border-b pb-2">
            <h3 className="font-extrabold text-sm text-red-700 uppercase flex items-center space-x-2">
              <UserMinus className="h-4 w-4" />
              <span>JOB OUT: CLOSE EMPLOYEE ACCOUNT</span>
            </h3>
            <p className="text-[11px] text-gray-500">
              When an employee leaves, select their profile below to mark their account as inactive while preserving historical records.
            </p>
          </div>

          <form onSubmit={handleJobOutSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Select Employee Who Is Leaving *</label>
              <select
                required
                value={selectedLeavingEmpId}
                onChange={(e) => setSelectedLeavingEmpId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-red-500 bg-white font-bold text-gray-900"
              >
                <option value="">-- Select Active Employee --</option>
                {activeEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.designation}) • {emp.employeeCode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Leaving Date</label>
              <input
                type="date"
                value={leavingDate}
                onChange={(e) => setLeavingDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Leaving Reason / Notes</label>
              <textarea
                rows="3"
                value={leavingReason}
                onChange={(e) => setLeavingReason(e.target.value)}
                placeholder="Resignation, end of contract, relocation..."
                className="w-full rounded border border-gray-300 p-2 outline-none focus:border-red-500 text-xs"
              ></textarea>
            </div>

            <div className="pt-3 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setMode("details")}
                className="rounded px-4 py-1.5 font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-[#DF6B6B] hover:bg-[#cf5b5b] text-white px-6 py-2 font-bold shadow text-xs inline-flex items-center space-x-1.5"
              >
                <UserMinus className="h-4 w-4" />
                <span>CONFIRM JOB OUT</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "details" && (
        /* EMPLOYEE DETAILS TABLE (Page 33) */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#4A4A4A] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-600 w-12 text-center">SR.</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Employee Name</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Code</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Contact Details</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Designation</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-right">Salary (₹)</th>
                  <th className="py-2.5 px-3 border-r border-gray-600 text-center">Job Status</th>
                  <th className="py-2.5 px-3 border-r border-gray-600">Joining Date</th>
                  <th className="py-2.5 px-3">Leaving Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-gray-400">
                      No employees registered yet. Use "+ Job In" to onboard employees.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, idx) => {
                    const isActive = emp.jobStatus === "active";
                    return (
                      <tr key={emp._id} className="hover:bg-[#E9EFFF]/40 transition">
                        <td className="py-2 px-3 border-r text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-3 border-r font-bold text-gray-900">{emp.name}</td>
                        <td className="py-2 px-3 border-r font-mono text-[11px] text-gray-600">{emp.employeeCode}</td>
                        <td className="py-2 px-3 border-r">
                          <div className="flex items-center space-x-1 font-medium text-gray-800">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{emp.contactMobile}</span>
                          </div>
                          {emp.contactEmail && (
                            <div className="text-[10px] text-gray-400 truncate">{emp.contactEmail}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r font-medium text-gray-700">{emp.designation}</td>
                        <td className="py-2 px-3 border-r text-right font-semibold">{formatCurrency(emp.salary)}</td>
                        <td className="py-2 px-3 border-r text-center">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {emp.jobStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r text-gray-600">{formatDate(emp.joiningDate)}</td>
                        <td className="py-2 px-3 text-gray-500">
                          {emp.leavingDate ? formatDate(emp.leavingDate) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
