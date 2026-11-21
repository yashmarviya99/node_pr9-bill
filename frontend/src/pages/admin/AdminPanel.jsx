import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  primary: "#4A4A4A",
  green: "#37AD47",
  red: "#DF6B6B",
  amber: "#FBBC4B",
  purple: "#8972A8",
  teal: "#48B6AD",
  bg: "#E9EFFF",
};

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
const badge = (text, color) => (
  <span
    style={{ background: color + "22", color, border: `1px solid ${color}55` }}
    className="rounded-full px-2 py-0.5 text-xs font-semibold"
  >
    {text}
  </span>
);

const statusColor = (s) =>
  s === "active"
    ? C.green
    : s === "pending" || s === "submitted"
    ? C.amber
    : s === "rejected" || s === "failed" || s === "expired"
    ? C.red
    : C.purple;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "payments", label: "Pending Payments", icon: "💳" },
  { key: "users", label: "All Users", icon: "👥" },
];

// ═════════════════════════════════════════════════════════════════════════════
//   ADMIN PANEL
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminUser, setAdminUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verify admin session on mount
  useEffect(() => {
    const verify = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data?.user?.role !== "admin") {
          toast.error("Admin access required");
          navigate("/login");
        } else {
          setAdminUser(res.data.user);
        }
      } catch {
        navigate("/login");
      } finally {
        setCheckingAuth(false);
      }
    };
    verify();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    toast.success("Logged out");
    navigate("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">Verifying admin access…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Navbar ── */}
      <nav style={{ background: C.primary }} className="sticky top-0 z-50 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                style={{ background: C.green }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-sm"
              >
                BB
              </div>
              <div>
                <div className="text-white font-bold leading-tight text-sm sm:text-base">
                  BUSINESS BILL
                </div>
                <div style={{ color: C.green }} className="text-xs font-medium">
                  Admin Panel
                </div>
              </div>
            </div>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activeTab === t.key
                      ? "bg-white/15 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Right: admin info + logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-white text-xs font-semibold">
                  {adminUser?.username || "Admin"}
                </span>
                <span style={{ color: C.amber }} className="text-[10px]">
                  Administrator
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{ background: C.red }}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Logout
              </button>
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="md:hidden text-white p-1"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: "#3a3a3a" }} className="md:hidden px-4 pb-3">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setMobileMenuOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === t.key ? "text-white bg-white/15" : "text-gray-300"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "payments" && <PendingPayments />}
        {activeTab === "users" && <AllUsers />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, pendingRes] = await Promise.all([
          api.get("/admin/users", { params: { limit: 1 } }),
          api.get("/auth/admin/registration-payments/pending"),
        ]);
        setStats({
          totalUsers: usersRes.data?.data?.pagination?.totalUsers ?? 0,
          pendingPayments: pendingRes.data?.count ?? 0,
          activeUsers: 0,
        });
        // Get active count separately
        const activeRes = await api.get("/admin/users", {
          params: { limit: 1, isActive: "true" },
        });
        setStats((s) => ({
          ...s,
          activeUsers: activeRes.data?.data?.pagination?.totalUsers ?? 0,
        }));
      } catch {
        setStats({ totalUsers: "—", pendingPayments: "—", activeUsers: "—" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.totalUsers, icon: "👥", color: C.purple },
    { label: "Active Users", value: stats?.activeUsers, icon: "✅", color: C.green },
    { label: "Pending Payments", value: stats?.pendingPayments, icon: "⏳", color: C.amber },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of BUSINESS BILL platform</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  style={{ background: c.color + "22" }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                >
                  {c.icon}
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: c.color }}>
                    {c.value ?? "—"}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{c.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            icon="💳"
            title="Review Pending Payments"
            desc="Verify or reject registration payments from users"
            color={C.amber}
          />
          <QuickAction
            icon="👥"
            title="Manage Users"
            desc="Activate, suspend or manage all business users"
            color={C.purple}
          />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, desc, color }) {
  return (
    <div
      style={{ borderLeft: `4px solid ${color}` }}
      className="rounded-lg bg-gray-50 px-4 py-3 flex items-start gap-3"
    >
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <div className="font-semibold text-gray-700 text-sm">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   PENDING PAYMENTS
// ═══════════════════════════════════════════════════════════════════
function PendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.get("/auth/admin/registration-payments/pending");
      setPayments(res.data?.payments || []);
    } catch {
      setMessage({ type: "error", text: "Failed to load pending payments." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (userId) => {
    setActionId(userId);
    try {
      await api.post(`/auth/admin/registration-payment/${userId}/verify`);
      toast.success("Payment verified! User is now active.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Verification failed.");
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (userId) => {
    const reason = window.prompt("Enter rejection reason:", "Payment could not be verified");
    if (reason === null) return;
    setActionId(userId);
    try {
      await api.post(`/auth/admin/registration-payment/${userId}/reject`, {
        reason: reason.trim() || "Payment rejected by admin",
      });
      toast.success("Payment rejected.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Rejection failed.");
    } finally {
      setActionId("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pending Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verify or reject business-user registration payments.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ borderColor: C.green, color: C.green }}
          className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-green-50 disabled:opacity-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {message.text && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-gray-500 font-medium">No pending payments!</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead style={{ background: C.bg }} className="text-gray-600">
                <tr>
                  {["User", "Amount", "Method", "Reference", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">
                        {p.name || p.username}
                      </div>
                      <div className="text-xs text-gray-500">@{p.username}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </td>
                    <td className="px-5 py-4 font-bold" style={{ color: C.green }}>
                      ₹{p.registrationPaymentAmount}
                    </td>
                    <td className="px-5 py-4 uppercase text-gray-600 text-xs">
                      {p.registrationPaymentMethod}
                    </td>
                    <td className="max-w-[180px] break-all px-5 py-4 text-gray-700 text-xs">
                      {p.registrationPaymentReference}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-500 text-xs">
                      {fmtDate(p.registrationPaymentSubmittedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(p._id)}
                          disabled={actionId === p._id}
                          style={{ background: C.green }}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleReject(p._id)}
                          disabled={actionId === p._id}
                          style={{ background: C.red }}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//   ALL USERS
// ═══════════════════════════════════════════════════════════════════
function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (search.trim()) params.search = search.trim();
        if (filterStatus) params.isActive = filterStatus;
        const res = await api.get("/admin/users", { params });
        setUsers(res.data?.data?.users || []);
        setPagination(res.data?.data?.pagination || { currentPage: 1, totalPages: 1, totalUsers: 0 });
      } catch {
        toast.error("Failed to load users.");
      } finally {
        setLoading(false);
      }
    },
    [search, filterStatus]
  );

  useEffect(() => { load(1); }, [load]);

  const handleAction = async (userId, action) => {
    setActionId(userId);
    try {
      await api.patch(`/admin/users/${userId}/${action}`);
      toast.success(`User ${action}d successfully!`);
      await load(pagination.currentPage);
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} user.`);
    } finally {
      setActionId("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">All Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pagination.totalUsers} total business users
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
          placeholder="Search by name, username, email…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#8972A8] focus:ring-2 focus:ring-[#8972A8]/20"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#8972A8]"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          onClick={() => load(1)}
          style={{ background: C.purple }}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Search
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No users found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead style={{ background: C.bg }} className="text-gray-600">
                  <tr>
                    {["User", "Status", "Payment", "Subscription", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-4 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-800">{u.name || u.username}</div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          {badge(u.isActive ? "Active" : "Inactive", u.isActive ? C.green : C.red)}
                          {u.isSuspended && badge("Suspended", C.red)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {badge(u.paymentStatus, statusColor(u.paymentStatus))}
                      </td>
                      <td className="px-5 py-4">
                        {badge(u.subscriptionStatus, statusColor(u.subscriptionStatus))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500 text-xs">
                        {fmtDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {!u.isActive && !u.isSuspended && u.paymentStatus === "verified" && (
                            <ActionBtn
                              label="Activate"
                              color={C.green}
                              onClick={() => handleAction(u._id, "activate")}
                              disabled={actionId === u._id}
                            />
                          )}
                          {u.isActive && !u.isSuspended && (
                            <ActionBtn
                              label="Deactivate"
                              color={C.amber}
                              onClick={() => handleAction(u._id, "deactivate")}
                              disabled={actionId === u._id}
                            />
                          )}
                          {!u.isSuspended && (
                            <ActionBtn
                              label="Suspend"
                              color={C.red}
                              onClick={() => handleAction(u._id, "suspend")}
                              disabled={actionId === u._id}
                            />
                          )}
                          {u.isSuspended && (
                            <ActionBtn
                              label="Unsuspend"
                              color={C.teal}
                              onClick={() => handleAction(u._id, "unsuspend")}
                              disabled={actionId === u._id}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <span className="text-xs text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => load(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => load(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: color }}
      className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-85 disabled:opacity-50 transition whitespace-nowrap"
    >
      {label}
    </button>
  );
}
