import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import paymentApi from "../../services/paymentApi";

function Payment() {
  const navigate =
    useNavigate();

  const [payment, setPayment] =
    useState(null);

  const [paymentMethod, setPaymentMethod] =
    useState("upi");

  const [amount, setAmount] =
    useState("");

  const [
    transactionReference,
    setTransactionReference,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await paymentApi.getRegistrationPaymentStatus();

      if (!response?.success) {
        setError(
          response?.message ||
            "Unable to load payment status."
        );

        return;
      }

      setPayment(
        response.payment
      );

      setAmount(
        String(
          response.payment.amount ||
            ""
        )
      );

      if (
        response.payment
          .paymentMethod
      ) {
        setPaymentMethod(
          response.payment
            .paymentMethod
        );
      }

      if (
        response.payment
          .reference
      ) {
        setTransactionReference(
          response.payment
            .reference
        );
      }

      if (
        response.payment.status ===
        "verified"
      ) {
        navigate(
          "/company-select",
          {
            replace: true,
          }
        );
      }
    } catch (apiError) {
      setError(
        apiError?.message ||
          "Unable to load payment status."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (!payment) {
        return;
      }

      if (
        !transactionReference.trim()
      ) {
        setError(
          "Please enter the transaction reference / UTR number."
        );

        return;
      }

      setSubmitting(true);

      try {
        const response =
          await paymentApi.submitRegistrationPayment(
            {
              paymentMethod,
              amount:
                Number(amount),
              transactionReference:
                transactionReference.trim(),
            }
          );

        if (!response?.success) {
          setError(
            response?.message ||
              "Payment submission failed."
          );

          return;
        }

        setSuccess(
          response.message ||
            "Payment submitted successfully."
        );

        await loadStatus();
      } catch (apiError) {
        setError(
          apiError?.message ||
            "Payment submission failed."
        );
      } finally {
        setSubmitting(false);
      }
    };

  const isSubmitted =
    payment?.status ===
    "submitted";

  const isRejected =
    payment?.status ===
    "failed";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3f3f3f] px-4 py-8">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-2xl">
            <p className="text-sm font-medium text-gray-600">
              Loading payment details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3f3f3f] px-4 py-8 sm:px-6">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl bg-white px-6 py-7 shadow-2xl sm:px-8">

            <div className="mb-7 flex justify-center">
              <img
                src="/business-bill-logo.png"
                alt="BUSINESS BILL"
                className="h-auto w-52 object-contain"
              />
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Registration Payment
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Complete the registration payment to send your account for admin verification.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            {isSubmitted ? (
              <div className="space-y-5">

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <h2 className="text-lg font-bold text-amber-900">
                    Payment Submitted
                  </h2>

                  <p className="mt-2 text-sm text-amber-800">
                    Your payment is waiting for admin verification.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-500">
                      Amount
                    </span>

                    <span className="font-semibold text-gray-800">
                      ₹
                      {payment?.submittedAmount ||
                        payment?.amount}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-sm">
                    <span className="text-gray-500">
                      Method
                    </span>

                    <span className="font-semibold uppercase text-gray-800">
                      {payment?.paymentMethod}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-sm">
                    <span className="text-gray-500">
                      Reference
                    </span>

                    <span className="break-all text-right font-semibold text-gray-800">
                      {payment?.reference}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadStatus}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#36AD47] px-4 py-3 font-semibold text-[#36AD47] transition hover:bg-green-50 disabled:opacity-60"
                >
                  Refresh Verification Status
                </button>
              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >

                <div className="rounded-xl bg-[#f2faf3] p-5 text-center">
                  <p className="text-sm text-gray-500">
                    Registration Fee
                  </p>

                  <p className="mt-1 text-3xl font-bold text-[#36AD47]">
                    ₹{payment?.amount}
                  </p>
                </div>

                {isRejected && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Your previous payment was rejected. Please submit the payment again with a new transaction reference.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="paymentMethod"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Payment Method
                  </label>

                  <select
                    id="paymentMethod"
                    value={
                      paymentMethod
                    }
                    onChange={(
                      event
                    ) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    disabled={
                      submitting
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-[#36AD47] focus:ring-2 focus:ring-[#36AD47]/20"
                  >
                    <option value="upi">
                      UPI
                    </option>

                    <option value="online">
                      Online Payment
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="bank_transfer">
                      Bank Transfer
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="transactionReference"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Transaction Reference / UTR
                  </label>

                  <input
                    id="transactionReference"
                    type="text"
                    value={
                      transactionReference
                    }
                    onChange={(
                      event
                    ) =>
                      setTransactionReference(
                        event.target.value
                      )
                    }
                    placeholder="Enter payment reference / UTR"
                    disabled={
                      submitting
                    }
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-[#36AD47] focus:ring-2 focus:ring-[#36AD47]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Amount
                  </label>

                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 font-semibold text-gray-700 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="w-full rounded-lg bg-[#36AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting Payment..."
                    : "Submit Payment"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-gray-300">
            © BUSINESS BILL
          </p>
        </div>
      </div>
    </div>
  );
}

export default Payment;