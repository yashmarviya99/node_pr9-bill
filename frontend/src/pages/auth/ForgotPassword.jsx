import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

// Steps: "email" → "otp" → "reset" → "done"
const STEPS = { EMAIL: "email", OTP: "otp", RESET: "reset", DONE: "done" };

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const clearError = () => setError("");

  // ── Step 1: Request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      if (res.data?.success) {
        toast.success("OTP sent to your email!");
        setStep(STEPS.OTP);
      } else {
        setError(res.data?.message || "Failed to send OTP.");
      }
    } catch (err) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email: email.trim(), otp: otp.trim() });
      if (res.data?.success) {
        toast.success("OTP verified!");
        setStep(STEPS.RESET);
      } else {
        setError(res.data?.message || "Invalid OTP.");
      }
    } catch (err) {
      setError(err?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ───────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearError();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      if (res.data?.success) {
        toast.success("Password reset successfully!");
        setStep(STEPS.DONE);
      } else {
        setError(res.data?.message || "Failed to reset password.");
      }
    } catch (err) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const steps = [
    { key: STEPS.EMAIL, label: "Email" },
    { key: STEPS.OTP, label: "OTP" },
    { key: STEPS.RESET, label: "Reset" },
    { key: STEPS.DONE, label: "Done" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#3f3f3f] px-4 py-8 sm:px-6">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white px-6 py-7 shadow-2xl sm:px-8">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img
                src="/business-bill-logo.png"
                alt="BUSINESS BILL"
                className="h-auto w-52 object-contain sm:w-56"
              />
            </div>

            {/* Step Indicator */}
            <div className="mb-6 flex items-center justify-center gap-0">
              {steps.map((s, i) => (
                <React.Fragment key={s.key}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        i < stepIndex
                          ? "bg-[#37AD47] text-white"
                          : i === stepIndex
                          ? "bg-[#8972A8] text-white ring-4 ring-[#8972A8]/20"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {i < stepIndex ? "✓" : i + 1}
                    </div>
                    <span
                      className={`mt-1 text-[10px] font-medium ${
                        i === stepIndex ? "text-[#8972A8]" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`mb-4 h-0.5 w-8 sm:w-12 transition-all ${
                        i < stepIndex ? "bg-[#37AD47]" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {step === STEPS.EMAIL && (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your registered email address. We'll send you a 6-digit OTP.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="Enter your registered email"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#37AD47] focus:ring-2 focus:ring-[#37AD47]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#37AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e] focus:outline-none focus:ring-2 focus:ring-[#37AD47]/30 disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === STEPS.OTP && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-gray-800">Enter OTP</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    A 6-digit OTP was sent to{" "}
                    <span className="font-semibold text-[#8972A8]">{email}</span>
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    6-digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearError(); }}
                    placeholder="• • • • • •"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-gray-800 outline-none transition placeholder:text-gray-300 placeholder:tracking-normal focus:border-[#8972A8] focus:ring-2 focus:ring-[#8972A8]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#8972A8] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#7a609a] focus:outline-none focus:ring-2 focus:ring-[#8972A8]/30 disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(STEPS.EMAIL); setOtp(""); clearError(); }}
                  className="w-full text-center text-sm text-gray-500 hover:text-[#37AD47] hover:underline"
                >
                  ← Change email / Resend OTP
                </button>
              </form>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === STEPS.RESET && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Create a strong password for your account.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); clearError(); }}
                      placeholder="Min. 6 characters"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#37AD47] focus:ring-2 focus:ring-[#37AD47]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                    placeholder="Re-enter password"
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-2 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:border-[#37AD47] focus:ring-[#37AD47]/20"
                    }`}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || (confirmPassword && confirmPassword !== newPassword)}
                  className="w-full rounded-lg bg-[#37AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e] focus:outline-none focus:ring-2 focus:ring-[#37AD47]/30 disabled:opacity-60"
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            )}

            {/* ── STEP 4: Done ── */}
            {step === STEPS.DONE && (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl">
                  ✅
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Password Reset!</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Your password has been reset successfully. You can now log in with your new password.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full rounded-lg bg-[#37AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e]"
                >
                  Go to Login
                </button>
              </div>
            )}

            {step !== STEPS.DONE && (
              <div className="mt-6 text-center text-sm text-gray-500">
                Remember your password?{" "}
                <Link to="/login" className="font-semibold text-[#37AD47] hover:underline">
                  Login here
                </Link>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-gray-300">© BUSINESS BILL</p>
        </div>
      </div>
    </div>
  );
}
