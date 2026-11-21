<div align="center">
  <img src="frontend/public/business-bill-logo.png" alt="Business Bill Logo" width="150" />
  <h1>Business Bill</h1>
  <p><strong>Business Billing, Inventory & Accounting Management System</strong></p>
  <p>A full-stack application for managing business transactions, inventory, accounts and financial reports.</p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-API-000000?logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  </p>
  <p>
    <a href="https://github.com/yashmarviya99/node_pr9-bill">Repository</a>
    ·
    <a href="#installation--setup">Installation</a>
    ·
    <a href="#features">Features</a>
  </p>
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Authentication & User Roles](#authentication--user-roles)
- [API Overview](#api-overview)
- [Available Scripts](#available-scripts)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## About the Project

**Business Bill** is a full-stack business billing and management application built to bring day-to-day business operations into one place. It provides workflows for sales, purchases, returns, quotations, challans, inventory, accounting books and financial reporting.

The application uses a React-based frontend and a Node.js/Express REST API backed by MongoDB. It also includes separate administrator and regular-user authentication flows, company and branch context, and financial-year selection.

## Features

### Business & Master Management

- Company and branch management
- Financial-year management and selection
- Customer and supplier records
- Product and account management
- Employee management

### Billing & Transactions

- Sales and sales returns
- Purchase and purchase returns
- Quotations
- Delivery challans
- Transaction lists and entry screens
- Invoice and document PDF generation in the backend

### Accounting & Finance

- Cash book and bank book
- Journal entries
- Receipts, payments, income and expenses
- Ledger summary and ledger details
- Trial balance and balance sheet reports
- Stock reports, product details, product expense and product profit views

### Administration & Access

- Separate admin registration and login endpoints
- Regular-user registration and login
- Registration payment submission and admin verification workflow
- Admin user listing, search, filtering and pagination
- User activation, deactivation and suspension controls
- Forgot-password flow with email OTP verification
- Invoice settings and access-control settings screens

> **Note:** Available screens and API modules are documented from the current repository source. Payment-provider integration, deployment configuration and production hosting are not assumed by this README.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Styling | Tailwind CSS 4 |
| State management | Redux Toolkit, React Redux |
| Forms & validation | React Hook Form, Zod, Hook Form Resolvers |
| HTTP client | Axios |
| Charts & visualization | Recharts |
| Maps | Leaflet |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, bcryptjs, HTTP-only cookies |
| Backend validation | Zod |
| Security middleware | Helmet, CORS, express-rate-limit |
| PDF generation | PDFKit |
| Email | Nodemailer |

## Application Architecture

```text
                 ┌──────────────────────────┐
                 │       React Client       │
                 │       Vite + React       │
                 └────────────┬─────────────┘
                              │ HTTP / JSON
                              │ Axios + Cookies
                 ┌────────────▼─────────────┐
                 │      Express REST API    │
                 │  Routes / Controllers    │
                 │ Middleware / Services    │
                 └────────────┬─────────────┘
                              │ Mongoose
                 ┌────────────▼─────────────┐
                 │         MongoDB          │
                 │       Data Storage       │
                 └──────────────────────────┘
```

The frontend communicates with the backend through the `/api` REST API. The backend handles request validation, authentication, business logic and database operations.

## Project Structure

```text
business-bill/
│
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers and business logic
│   │   ├── middleware/      # Authentication, rate limiting, etc.
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Express API routes
│   │   ├── services/        # Reusable business services
│   │   ├── templates/       # PDF document templates
│   │   ├── utils/           # Token and email utilities
│   │   ├── validators/      # Zod validation schemas
│   │   ├── app.js           # Express application configuration
│   │   └── server.js        # Server entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/              # Static assets and application logo
│   ├── src/
│   │   ├── components/     # Shared and feature components
│   │   ├── layouts/        # Application layouts
│   │   ├── pages/          # Admin, auth, dashboard and module pages
│   │   ├── redux/          # Redux store and slices
│   │   ├── services/       # API clients and service functions
│   │   ├── utils/          # Currency, date and GST helpers
│   │   ├── App.jsx
│   │   ├── AppRoutes.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) (a current LTS release is recommended)
- npm (included with Node.js)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or a MongoDB Atlas database
- [Git](https://git-scm.com/)

Check your installed versions:

```bash
node --version
npm --version
```

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yashmarviya99/node_pr9-bill.git
cd node_pr9-bill
```

### 2. Configure the backend

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

Create your local environment file from the example:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `backend/.env` and configure the values described in [Environment Configuration](#environment-configuration).

### 3. Configure the frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
```

The frontend uses `http://localhost:5000/api` as its default API base URL. To override it, create `frontend/.env` and add:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

The current `frontend/.env.example` is empty; the variable above is optional for local development because the frontend already has this default.

## Environment Configuration

### Backend (`backend/.env`)

Use the following template and replace the example values with your own local configuration:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://127.0.0.1:27017/business_bill
CLIENT_URL=http://localhost:5173

JWT_ACCESS_SECRET=replace_with_a_long_random_access_secret_at_least_32_characters
JWT_REFRESH_SECRET=replace_with_a_long_random_refresh_secret_at_least_32_characters

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SAME_SITE=lax
JSON_BODY_LIMIT=2mb
```

| Variable | Purpose |
|---|---|
| `PORT` | Port used by the backend server (default: `5000`) |
| `NODE_ENV` | Runtime environment, such as `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Allowed frontend origin; multiple comma-separated origins are supported by the CORS configuration |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens; must be at least 32 characters |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens; must be at least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | Access-token expiry configuration |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token expiry configuration |
| `COOKIE_SAME_SITE` | Cookie SameSite setting: `strict`, `lax` or `none` |
| `JSON_BODY_LIMIT` | Maximum JSON and URL-encoded request body size |

**Important:** Generate unique, strong secrets for your own environment. Never commit `.env` files, database credentials, private keys or real secrets to GitHub. The backend validates the MongoDB URI and JWT secrets at startup.

## Running the Application

Start MongoDB first, then run the backend and frontend in separate terminals.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

API health endpoint:

```text
http://localhost:5000/api/health
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Vite normally serves the frontend at:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

## Authentication & User Roles

The application has distinct administrator and regular-user flows.

### Administrator

- Admin registration is separate from regular-user registration.
- The admin registration form uses email, username and password.
- The first administrator can be registered without an existing-admin verifier; subsequent admin registrations require verification using an existing administrator's credentials.
- Admin login is handled through a separate admin login endpoint.
- Administrators can review registration payments and manage user account status.

### Regular User

- Regular users use the detailed user registration flow.
- A newly registered user starts with a pending registration/payment state.
- The user submits registration payment details for review.
- After payment verification and account activation, the user can continue to company selection and the main application.
- The application uses company, branch and financial-year context for relevant business operations.

The backend uses JWT-based authentication with HTTP-only cookies. Actual access is also controlled by backend authentication and role-authorization middleware.

## API Overview

The backend exposes its API under `/api`.

| Base path | Responsibility |
|---|---|
| `/api/auth` | Registration, login, logout, current user, OTP password reset and registration-payment workflow |
| `/api/companies` | Company operations |
| `/api/branches` | Branch operations |
| `/api/financial-years` | Financial-year operations |
| `/api/customers` | Customer operations |
| `/api/suppliers` | Supplier operations |
| `/api/products` | Product operations |
| `/api/accounts` | Account operations |
| `/api/sales` | Sales transactions |
| `/api/purchases` | Purchase transactions |
| `/api/sale-returns` | Sales return transactions |
| `/api/purchase-returns` | Purchase return transactions |
| `/api/challans` | Challan operations |
| `/api/quotations` | Quotation operations |
| `/api/payments` | Payment records |
| `/api/cash-book` | Cash book operations |
| `/api/bank-book` | Bank book operations |
| `/api/receipts` | Receipt records |
| `/api/incomes` | Income records |
| `/api/expenses` | Expense records |
| `/api/journals` | Journal entries |
| `/api/dashboard` | Dashboard data |
| `/api/ledger` | Ledger data |
| `/api/reports` | Business and financial reports |
| `/api/admin` | Administrator user-management operations |
| `/api/employees` | Employee operations |
| `/api/settings` | Application settings |

**Health checks**

- `GET /` — basic API status
- `GET /api/health` — API and database health status

For exact request bodies, response formats and endpoint permissions, refer to the corresponding files in `backend/src/routes`, `backend/src/controllers` and `backend/src/validators`.

## Available Scripts

### Backend

Run these commands from the `backend/` directory:

| Command | Description |
|---|---|
| `npm install` | Install backend dependencies |
| `npm run dev` | Start the API using Nodemon |
| `npm start` | Start the API using Node.js |

### Frontend

Run these commands from the `frontend/` directory:

| Command | Description |
|---|---|
| `npm install` | Install frontend dependencies |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint checks |

## Security

The current backend includes several security-related controls:

- Password hashing with `bcryptjs`
- JWT access and refresh tokens stored in HTTP-only cookies
- Role-based authorization middleware for protected administrator routes
- Helmet security headers
- CORS origin allow-list with credential support
- General API rate limiting
- Zod request validation
- Request-body checks against MongoDB operator-style keys
- Configurable request body-size limits

For production, configure HTTPS, strong private environment secrets, a production MongoDB user with least-privilege access, correct frontend origins and cookie settings. Review all deployment-specific security settings before exposing the application publicly.

## Troubleshooting

### Backend cannot connect to MongoDB

- Confirm that MongoDB is running.
- Check `MONGODB_URI` in `backend/.env`.
- Confirm the database host and port are reachable.

### Frontend cannot reach the API

- Confirm that the backend is running on port `5000` (or your configured port).
- Check `VITE_API_BASE_URL` in `frontend/.env`, if set.
- Ensure `CLIENT_URL` in `backend/.env` matches the frontend origin, including the port.

### Backend reports missing or invalid JWT secrets

- Set both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `backend/.env`.
- Use different, randomly generated secrets of at least 32 characters each.
- Restart the backend after changing environment variables.

### Browser reports a CORS error

- Set `CLIENT_URL` to the exact frontend origin, for example `http://localhost:5173`.
- If using more than one frontend origin, separate them with commas.
- Restart the backend after updating the environment file.

## Future Improvements

Potential areas for future development include:

- Automated backend and frontend test suites
- API documentation with an OpenAPI/Swagger specification
- CI checks and automated deployment workflows
- Additional reporting and dashboard analytics
- Production deployment documentation

## Author

**Yash Marviya**

- GitHub: [@yashmarviya99](https://github.com/yashmarviya99)
- Repository: [node_pr9-bill](https://github.com/yashmarviya99/node_pr9-bill)

---

<div align="center">
  <sub>Business Bill · Built with React, Node.js, Express and MongoDB</sub>
</div>
