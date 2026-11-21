import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import authApi from "../../services/authApi";

function Login() {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData,
  ] = useState({
    username: "",
    password: "",
  });

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFormData(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      if (error) {
        setError("");
      }
    };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      const username =
        formData.username.trim();

      const password =
        formData.password;

      if (
        !username ||
        !password
      ) {
        setError(
          "Please enter username and password."
        );

        return;
      }

      setLoading(true);

      try {
        const response =
          await authApi.login({
            username,
            password,
          });

        if (
          !response?.success
        ) {
          setError(
            response?.message ||
              "Invalid username or password."
          );

          return;
        }

        if (
          response.nextStep ===
          "payment"
        ) {
          navigate(
            "/payment",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          response.nextStep ===
          "company-select"
        ) {
          navigate(
            "/company-select",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          response.nextStep ===
          "admin-dashboard"
        ) {
          navigate(
            "/admin",
            {
              replace: true,
            }
          );

          return;
        }

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (apiError) {
        setError(
          apiError?.message ||
            "Login failed. Please check your username and password."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-[#3f3f3f] px-4 py-8 sm:px-6">

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">

        <div className="w-full max-w-md">

          <div className="rounded-2xl bg-white px-6 py-7 shadow-2xl sm:px-8">

            <div className="mb-8 flex justify-center">
              <img
                src="/business-bill-logo.png"
                alt="BUSINESS BILL"
                className="h-auto w-52 object-contain sm:w-56"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5"
            >

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={
                    formData.username
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="username"
                  placeholder="Enter username"
                  disabled={
                    loading
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#36AD47] focus:ring-2 focus:ring-[#36AD47]/20 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={
                    formData.password
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="current-password"
                  placeholder="Enter password"
                  disabled={
                    loading
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#36AD47] focus:ring-2 focus:ring-[#36AD47]/20 disabled:bg-gray-100"
                />
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-gray-500 transition hover:text-[#36AD47]"
                >
                  Forgot your password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="w-full rounded-lg bg-[#36AD47] px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-[#2f963e] focus:outline-none focus:ring-2 focus:ring-[#36AD47]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>

            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}

              <Link
                to="/register"
                className="font-semibold text-[#36AD47] hover:underline"
              >
                Create Account
              </Link>
            </div>

          </div>

          <p className="mt-4 text-center text-xs text-gray-300">
            © BUSINESS BILL
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;