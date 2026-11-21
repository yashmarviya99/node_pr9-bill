import {
  useEffect,
  useState,
} from "react";

import authApi from "../../services/authApi";

function Payments() {
  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const loadPayments =
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await authApi.getPendingRegistrationPayments();

        if (
          !response?.success
        ) {
          setError(
            response?.message ||
              "Unable to load pending payments."
          );

          return;
        }

        setPayments(
          response.payments ||
            []
        );
      } catch (apiError) {
        setError(
          apiError?.message ||
            "Unable to load pending payments."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleVerify =
    async (userId) => {
      setActionId(userId);
      setError("");
      setSuccess("");

      try {
        const response =
          await authApi.verifyRegistrationPayment(
            userId
          );

        if (
          !response?.success
        ) {
          setError(
            response?.message ||
              "Payment verification failed."
          );

          return;
        }

        setSuccess(
          "Payment verified. User account is now active."
        );

        await loadPayments();
      } catch (apiError) {
        setError(
          apiError?.message ||
            "Payment verification failed."
        );
      } finally {
        setActionId("");
      }
    };

  const handleReject =
    async (userId) => {
      const reason =
        window.prompt(
          "Enter rejection reason:",
          "Payment could not be verified"
        );

      if (
        reason === null
      ) {
        return;
      }

      setActionId(userId);
      setError("");
      setSuccess("");

      try {
        const response =
          await authApi.rejectRegistrationPayment(
            userId,
            reason.trim() ||
              "Payment rejected by admin"
          );

        if (
          !response?.success
        ) {
          setError(
            response?.message ||
              "Payment rejection failed."
          );

          return;
        }

        setSuccess(
          "Payment rejected successfully."
        );

        await loadPayments();
      } catch (apiError) {
        setError(
          apiError?.message ||
            "Payment rejection failed."
        );
      } finally {
        setActionId("");
      }
    };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8">

      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Registration Payments
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Verify or reject business-user registration payments.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadPayments
            }
            disabled={
              loading
            }
            className="rounded-lg border border-[#36AD47] px-4 py-2 text-sm font-semibold text-[#36AD47] hover:bg-green-50 disabled:opacity-50"
          >
            Refresh
          </button>

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

        <div className="overflow-hidden rounded-2xl bg-white shadow">

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading pending payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No pending registration payments.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full text-left text-sm">

                <thead className="bg-gray-50 text-gray-600">

                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      User
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Amount
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Method
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Reference
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Submitted
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Action
                    </th>
                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment._id
                        }
                      >

                        <td className="px-5 py-4">

                          <div className="font-semibold text-gray-800">
                            {
                              payment.name ||
                              payment.username
                            }
                          </div>

                          <div className="text-xs text-gray-500">
                            @
                            {
                              payment.username
                            }
                          </div>

                          <div className="text-xs text-gray-500">
                            {
                              payment.email
                            }
                          </div>

                        </td>

                        <td className="px-5 py-4 font-semibold text-gray-800">
                          ₹
                          {
                            payment.registrationPaymentAmount
                          }
                        </td>

                        <td className="px-5 py-4 uppercase text-gray-600">
                          {
                            payment.registrationPaymentMethod
                          }
                        </td>

                        <td className="max-w-[180px] break-all px-5 py-4 text-gray-700">
                          {
                            payment.registrationPaymentReference
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {
                            payment.registrationPaymentSubmittedAt
                              ? new Date(
                                  payment.registrationPaymentSubmittedAt
                                ).toLocaleString()
                              : "-"
                          }
                        </td>

                        <td className="px-5 py-4">

                          <div className="flex gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                handleVerify(
                                  payment._id
                                )
                              }
                              disabled={
                                actionId ===
                                payment._id
                              }
                              className="rounded-lg bg-[#36AD47] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2f963e] disabled:opacity-50"
                            >
                              Verify
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleReject(
                                  payment._id
                                )
                              }
                              disabled={
                                actionId ===
                                payment._id
                              }
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Payments;