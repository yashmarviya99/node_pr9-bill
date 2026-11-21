<div align="center">

# Business Bill

### Complete Business Billing, Inventory & Accounting Management System

A full-stack business management application built with **React, Node.js, Express, and MongoDB**.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Runtime-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-Backend-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

**Repository:** [yashmarviya99/node_pr9-bill](https://github.com/yashmarviya99/node_pr9-bill)  
**Author & Copyright Owner:** **Yash Marviya**

</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Project Goals](#project-goals)
- [Main Features](#main-features)
- [Application Modules](#application-modules)
- [User Roles and Authentication](#user-roles-and-authentication)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Folder Structure](#project-folder-structure)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Backend API and Health Checks](#backend-api-and-health-checks)
- [Database Overview](#database-overview)
- [Security](#security)
- [PDF Documents](#pdf-documents)
- [Reports and Accounting](#reports-and-accounting)
- [Troubleshooting](#troubleshooting)
- [Development Guidelines](#development-guidelines)
- [Deployment Notes](#deployment-notes)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License and Copyright](#license-and-copyright)

---

## About the Project

**Business Bill** is a full-stack business billing and accounting management system designed to bring common business operations into one application. It provides a centralized interface for managing company information, branches, financial years, customers, suppliers, products, sales, purchases, inventory-related transactions, accounting entries, and business reports.

The application uses a React-based frontend and a Node.js/Express backend. MongoDB is used to store application data, with Mongoose providing object modelling and database interaction.

The project also includes separate authentication flows for regular business users and administrators. Business users follow the application's registration, verification, and activation/payment flow. Administrators use a separate setup and login flow to access the Admin Panel.

### At a glance

| Area | Description |
|---|---|
| Application type | Full-stack web application |
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Styling | Tailwind CSS 4 |
| Authentication | JWT access and refresh tokens |
| Password security | bcryptjs |
| Document generation | PDFKit |
| API style | REST-style HTTP endpoints |

---

## Project Goals

The main goals of Business Bill are:

1. Bring multiple business operations into one application.
2. Maintain company, branch, and financial-year information.
3. Manage customers, suppliers, products, and accounts.
4. Record sales, purchases, returns, payments, and receipts.
5. Support cash, bank, and journal book entries.
6. Provide ledger, stock, and financial reporting screens.
7. Generate PDF business documents for supported transactions.
8. Separate regular-user access from administrator access.
9. Provide a structured frontend and backend that can be maintained and extended.

---

## Main Features

### 1. Authentication and Account Management

- Regular user registration and login.
- Email verification/OTP-related registration flow.
- Forgot-password functionality.
- Password hashing with `bcryptjs`.
- JWT-based access and refresh token authentication.
- Authentication cookies configured as HTTP-only cookies.
- Registration, verification, and payment/activation status handling.
- Separate administrator setup, login, and Admin Panel access.

### 2. Company and Business Setup

- Company selection and management.
- Branch-related management.
- Financial-year setup and selection.
- Company- and branch-aware application operations.

### 3. Master Data Management

- Customer records.
- Supplier records.
- Product records.
- Account records.
- Employee records.

### 4. Billing and Transaction Management

- Sales entry and sales invoice records.
- Purchase entry and purchase invoice records.
- Sales return records.
- Purchase return records.
- Delivery challans.
- Quotations.
- Payment and receipt records.
- Income and expense entries.
- Journal entries.

### 5. Books and Accounting

- Cash Book.
- Bank Book.
- Journal Book.
- Ledger summary.
- Ledger details.

### 6. Reports and Dashboard

- Dashboard overview.
- Stock-related reports.
- GST-related report functionality in the backend.
- Receivable and payable outstanding functionality.
- Trial Balance.
- Balance Sheet.
- Product, expense, and profit-related report functionality.

### 7. PDF Document Generation

The backend contains PDF templates for supported business documents, including:

- Sales invoices.
- Purchase invoices.
- Sales returns.
- Purchase returns.
- Delivery challans.
- Quotations.

### 8. Application Settings

- Invoice-related settings.
- Access-control settings.
- Business configuration options exposed by the application.

---

## Application Modules

The following table describes the major modules identified in the project.

| Module | Purpose |
|---|---|
| Dashboard | View a business overview |
| Company | Manage/select company information |
| Branch | Manage branch information |
| Financial Year | Configure and select financial years |
| Accounts | Maintain account records |
| Customers | Maintain customer information |
| Suppliers | Maintain supplier information |
| Products | Maintain product information |
| Sales | Record sales and create sales invoices |
| Purchases | Record purchases and purchase invoices |
| Sales Returns | Record returned sales |
| Purchase Returns | Record returned purchases |
| Challans | Create and manage delivery challans |
| Quotations | Prepare and manage quotations |
| Payments | Maintain payment records |
| Receipts | Maintain receipt records |
| Income | Record income entries |
| Expenses | Record expense entries |
| Cash Book | Review cash transactions |
| Bank Book | Review bank transactions |
| Journal Book | Maintain journal entries |
| Employees | Manage employee-related records |
| Ledger | Review ledger summaries and details |
| Stock Reports | Review stock-related information |
| Financial Reports | Access financial reports such as Trial Balance and Balance Sheet |
| Settings | Configure supported application settings |
| Admin Panel | Manage administrator-side user and payment-related operations |

> The exact actions available in each module depend on the implemented screens, routes, permissions, and backend logic.

---

## User Roles and Authentication

Business Bill has two separate access paths. They are intentionally different and should not be treated as one registration process.

### Regular Business User

The regular user flow is intended for a business account.

Typical flow:

1. Open the regular user registration page.
2. Enter the requested business/user registration information.
3. Complete the verification steps presented by the application.
4. Complete the payment or activation steps when required.
5. Log in using the registered credentials.
6. After the account is active, continue to company selection.
7. Open the main business dashboard and use the available modules.

### Administrator

The administrator flow is separate from regular business registration.

Typical flow:

1. Use the separate admin registration/setup process.
2. Provide the admin setup information requested by the application.
3. Log in using the administrator username and password.
4. On successful authentication, access the Admin Panel.
5. Use the admin-side user and registration/payment management functionality.

### Important distinction

- Regular users use the detailed business registration flow.
- Administrators use the separate admin setup/login flow.
- Admin authentication should lead to the Admin Panel.
- Regular-user authentication should lead through the regular user application flow.

Do not use regular-user registration fields as a substitute for administrator credentials.

---

## Technology Stack

### Frontend

| Technology | Role |
|---|---|
| React 19 | Component-based user interface |
| Vite | Frontend development server and build tool |
| Tailwind CSS 4 | Utility-first styling |
| React Router | Client-side navigation |
| Redux Toolkit | Application state management |
| React Redux | React bindings for Redux |
| React Hook Form | Form state and handling |
| Zod | Schema-based validation |
| Axios | HTTP requests to the backend |
| Recharts | Charts and data visualizations |
| Lucide React | Interface icons |

### Backend

| Technology | Role |
|---|---|
| Node.js | JavaScript runtime |
| Express | HTTP server and API routing |
| MongoDB | Document database |
| Mongoose | MongoDB object modelling |
| bcryptjs | Password hashing |
| JSON Web Token | Access and refresh token handling |
| Zod | Request data validation |
| PDFKit | PDF document generation |
| Nodemailer | Email sending |
| Helmet | HTTP security headers |
| CORS | Cross-origin request configuration |
| express-rate-limit | Request rate limiting |

---

## Application Architecture

Business Bill is divided into two main applications:

```text
                 BUSINESS BILL
                       |
          +------------+------------+
          |                         |
     FRONTEND                    BACKEND
   React + Vite               Node + Express
          |                         |
          |       HTTP / API        |
          +-------------------------+
                                    |
                              Mongoose ODM
                                    |
                                MongoDB
```

### Frontend responsibilities

The frontend is responsible for:

- Rendering application pages and reusable components.
- Handling navigation and route presentation.
- Managing client-side application state.
- Collecting and validating form input.
- Calling backend API endpoints.
- Displaying business data, transaction lists, and reports.

### Backend responsibilities

The backend is responsible for:

- Defining API routes.
- Authenticating and authorizing requests.
- Validating incoming data.
- Executing business logic.
- Reading and writing MongoDB data.
- Sending supported email messages.
- Generating supported PDF documents.
- Applying security middleware and request limits.

### Database responsibilities

MongoDB stores the application's persistent records. Mongoose models define the data structures and provide the backend with database access.

---

## Project Folder Structure

The project is organized into separate frontend and backend directories.

```text
node_pr9-bill/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── Database configuration
│   │   │
│   │   ├── controllers/
│   │   │   └── Request handlers and business logic
│   │   │
│   │   ├── middleware/
│   │   │   └── Authentication, protection, and rate limiting
│   │   │
│   │   ├── models/
│   │   │   └── Mongoose data models
│   │   │
│   │   ├── routes/
│   │   │   └── API route definitions
│   │   │
│   │   ├── services/
│   │   │   └── Reusable backend services
│   │   │
│   │   ├── templates/
│   │   │   └── PDF document templates
│   │   │
│   │   ├── utils/
│   │   │   └── Token, email, and helper utilities
│   │   │
│   │   ├── validators/
│   │   │   └── Zod validation schemas
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── Static public assets
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── Reusable UI components
│   │   │
│   │   ├── layouts/
│   │   │   └── Application layouts
│   │   │
│   │   ├── pages/
│   │   │   └── Application pages
│   │   │
│   │   ├── redux/
│   │   │   └── Redux store and slices
│   │   │
│   │   ├── services/
│   │   │   └── API clients and service functions
│   │   │
│   │   ├── utils/
│   │   │   └── Frontend helper functions
│   │   │
│   │   ├── App.jsx
│   │   ├── AppRoutes.jsx
│   │   └── main.jsx
│   │
│   ├── .env.example
│   └── package.json
│
├── README.md
└── LICENSE
```

**Folder descriptions**

| Folder/File | Responsibility |
|---|---|
| `backend/src/config` | Database and application configuration |
| `backend/src/controllers` | Handles API requests and business operations |
| `backend/src/middleware` | Shared request-processing middleware |
| `backend/src/models` | MongoDB/Mongoose model definitions |
| `backend/src/routes` | Connects API paths to controller functions |
| `backend/src/services` | Reusable service logic |
| `backend/src/templates` | PDF document layouts |
| `backend/src/utils` | Shared backend utilities |
| `backend/src/validators` | Request validation schemas |
| `backend/src/app.js` | Express application setup |
| `backend/src/server.js` | Starts the backend server |
| `frontend/src/components` | Reusable React components |
| `frontend/src/layouts` | Shared page layouts |
| `frontend/src/pages` | Application screens |
| `frontend/src/redux` | Global state management |
| `frontend/src/services` | API communication |
| `frontend/src/utils` | Shared frontend helpers |
| `frontend/src/AppRoutes.jsx` | Frontend route configuration |
| `frontend/src/main.jsx` | Frontend entry point |

---

## Prerequisites

Install these tools before starting the project:

| Requirement | Recommendation |
|---|---|
| Node.js | Current LTS version |
| npm | Version included with Node.js |
| MongoDB | Local MongoDB or MongoDB Atlas |
| Git | Current version |
| Code editor | Visual Studio Code recommended |
| Browser | Chrome, Edge, Firefox, or another modern browser |

Verify Node.js and npm:

```bash
node --version
npm --version
```

Verify Git:

```bash
git --version
```

---

## Installation Guide

### Step 1: Clone the repository

```bash
git clone https://github.com/yashmarviya99/node_pr9-bill.git
```

### Step 2: Open the project directory

```bash
cd node_pr9-bill
```

### Step 3: Install backend dependencies

```bash
cd backend
npm install
```

### Step 4: Create the backend environment file

**Windows Command Prompt:**

```cmd
copy .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `backend/.env` and set the required configuration values.

### Step 5: Install frontend dependencies

Open another terminal at the project root:

```bash
cd frontend
npm install
```

### Step 6: Configure the frontend API URL

Create `frontend/.env` if it does not already exist:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

The frontend API client uses this URL as its default when the variable is not supplied.

---

## Environment Configuration

Environment variables keep machine-specific configuration and secrets outside the source code.

### Backend environment (`backend/.env`)

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

### Backend variable reference

| Variable | Required/Use | Description |
|---|---|---|
| `PORT` | Optional | Port used by the backend; default is `5000` |
| `NODE_ENV` | Environment | Use `development` locally and `production` for deployment |
| `MONGODB_URI` | Required | MongoDB connection string |
| `CLIENT_URL` | Frontend origin | Allowed frontend origin; multiple comma-separated origins are supported |
| `JWT_ACCESS_SECRET` | Required | Access-token signing secret; at least 32 characters |
| `JWT_REFRESH_SECRET` | Required | Refresh-token signing secret; at least 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | Optional | Access-token lifetime; example `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Optional | Refresh-token lifetime; example `7d` |
| `COOKIE_SAME_SITE` | Optional | Cookie SameSite policy: `strict`, `lax`, or `none` |
| `JSON_BODY_LIMIT` | Optional | Maximum JSON and URL-encoded request body size |

**Important configuration notes**

- `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are required by the backend.
- Both JWT secrets must be at least 32 characters long.
- Replace the sample JWT values with strong, unique random secrets.
- In production, configure `CLIENT_URL` with the deployed frontend origin.
- Do not commit `.env` files or secret values to Git.
- If using MongoDB Atlas, use the correct database user credentials and network access configuration.

### Frontend environment (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL used by the frontend to communicate with the backend API |

After changing frontend environment variables, restart the Vite development server.

---

## Running the Application

Run the backend and frontend in two separate terminals.

### Terminal 1 — Start MongoDB

If you use a local MongoDB installation, make sure the MongoDB service is running.

If you use MongoDB Atlas, confirm that your connection string and network access settings are correct.

### Terminal 2 — Start the backend

```bash
cd backend
npm run dev
```

The backend development script uses Nodemon and starts the server on port `5000` by default.

For a normal start:

```bash
npm start
```

### Terminal 3 — Start the frontend

```bash
cd frontend
npm run dev
```

Vite normally serves the frontend at:

```text
http://localhost:5173
```

Open the displayed Vite URL in your browser.

### Local application addresses

| Service | Address |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:5000` |
| Backend root | `http://localhost:5000/` |
| API health | `http://localhost:5000/api/health` |

---

## Available Scripts

### Backend scripts

Run these commands from the `backend` directory.

| Command | Description |
|---|---|
| `npm install` | Install backend dependencies |
| `npm run dev` | Start the development server with Nodemon |
| `npm start` | Start the backend normally |

### Frontend scripts

Run these commands from the `frontend` directory.

| Command | Description |
|---|---|
| `npm install` | Install frontend dependencies |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production frontend build |
| `npm run lint` | Run the configured ESLint checks |
| `npm run preview` | Preview the production build locally |

### Build the frontend

```bash
cd frontend
npm run build
```

### Preview the production build

```bash
npm run preview
```

---

## Backend API and Health Checks

The backend exposes HTTP API routes for the application's modules. The API is organized into route modules and their corresponding controllers.

### Root endpoint

```http
GET /
```

The root endpoint provides a basic response indicating that the backend application is running.

### API health endpoint

```http
GET /api/health
```

The health endpoint checks the MongoDB connection state and reports API/database health information.

### API module groups

The backend contains route/controller functionality for areas including:

- Authentication.
- Companies and branches.
- Financial years.
- Customers and suppliers.
- Products and accounts.
- Sales and purchases.
- Sales returns and purchase returns.
- Challans and quotations.
- Payments and receipts.
- Cash Book and Bank Book.
- Income and expenses.
- Journal entries.
- Dashboard.
- Ledger.
- Reports.
- Admin.
- Employees.
- Settings.

> This README describes API areas at a module level. For exact endpoint paths, HTTP methods, request bodies, and response formats, refer to the corresponding files in `backend/src/routes`, `backend/src/controllers`, and `backend/src/validators`. Do not assume that every module uses the same endpoint pattern.

---

## Database Overview

Business Bill uses MongoDB as its database and Mongoose for object modelling.

### Database connection

The backend reads the database connection string from:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/business_bill
```

This example connects to a local MongoDB database named `business_bill`.

For MongoDB Atlas, replace the value with your Atlas connection string.

### Data access flow

```text
Frontend Form / Page
        |
        v
Backend API Route
        |
        v
Controller / Business Logic
        |
        v
Mongoose Model
        |
        v
MongoDB Database
```

### Database configuration tips

- Keep database credentials in environment variables.
- Use a separate database for development and production.
- Back up important production data.
- Restrict database network access.
- Use a database user with only the permissions required by the application.

---

## Security

The backend includes several security-related measures:

| Security measure | Purpose |
|---|---|
| bcryptjs | Hashes passwords before storage |
| JWT access tokens | Authenticates application requests |
| JWT refresh tokens | Supports token refresh flow |
| HTTP-only cookies | Helps protect authentication cookies from direct JavaScript access |
| Helmet | Adds HTTP security headers |
| CORS allow-list | Restricts allowed browser origins |
| express-rate-limit | Limits repeated requests |
| Zod | Validates request data |
| Payload size limits | Restricts large request bodies |
| Unsafe-key rejection | Rejects unsafe MongoDB-style request keys |

### Production security recommendations

1. Use HTTPS.
2. Generate strong and unique JWT secrets.
3. Keep secrets out of source control.
4. Configure the correct production frontend origin.
5. Review cookie settings for the production domain and HTTPS setup.
6. Restrict MongoDB network access.
7. Keep dependencies updated.
8. Review admin registration and access permissions before public deployment.
9. Back up the database regularly.
10. Never expose private environment variables in frontend code.

---

## PDF Documents

The backend includes PDF templates for supported transaction documents.

| Document | Use |
|---|---|
| Sales Invoice | Document a sales transaction |
| Purchase Invoice | Document a purchase transaction |
| Sales Return | Document returned sales |
| Purchase Return | Document returned purchases |
| Delivery Challan | Document goods delivery |
| Quotation | Provide a price or transaction quotation |

PDF generation is implemented with **PDFKit**. The relevant templates are located in:

```text
backend/src/templates/
```

---

## Reports and Accounting

Business Bill includes application screens and backend functionality for business reporting and accounting workflows.

### Ledger

Ledger functionality provides summary and detail views for account-related transaction information.

### Stock reports

Stock-related reports help review product and inventory information available through the application.

### Financial reports

The project includes financial reporting functionality such as:

- Trial Balance.
- Balance Sheet.
- GST-related reports.
- Receivable and payable outstanding information.
- Product, expense, and profit-related reporting functionality.

The exact calculations and report filters are determined by the implementation in the backend controllers and frontend report pages.

---

## Troubleshooting

### 1. MongoDB connection error

**Possible causes:**

- MongoDB service is not running.
- The connection string is incorrect.
- MongoDB Atlas credentials are invalid.
- The current IP address is not allowed in Atlas network access.

**What to check:**

- Confirm MongoDB is running.
- Check `MONGODB_URI` in `backend/.env`.
- Verify Atlas database credentials and network access if using Atlas.

### 2. Missing environment variables

Check that `backend/.env` exists and includes:

```env
MONGODB_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

Both JWT secrets must contain at least 32 characters.

### 3. Frontend cannot connect to the backend

Check the following:

- Start the backend.
- Confirm the backend is running on port `5000`.
- Check `VITE_API_BASE_URL` in `frontend/.env`.
- Confirm `CLIENT_URL` in `backend/.env` matches the frontend origin.
- Restart Vite after changing environment variables.

### 4. CORS error

For local development, the frontend origin should normally be:

```env
CLIENT_URL=http://localhost:5173
```

Make sure the configured origin matches the actual frontend URL, including protocol and port.

### 5. Port already in use

If port `5000` or `5173` is already being used:

- Stop the other process using that port, or
- Configure a different backend port and update the frontend API base URL accordingly.

### 6. Frontend dependency or build error

Try reinstalling frontend dependencies:

```bash
cd frontend
npm install
npm run build
```

Review the terminal output to identify the exact missing package or build error.

### 7. Backend dependency error

From the backend directory:

```bash
cd backend
npm install
npm run dev
```

If the error continues, inspect the error message and verify the installed Node.js version.

---

## Development Guidelines

When modifying the project:

- Keep frontend and backend responsibilities separate.
- Use reusable React components where practical.
- Keep API request logic in the frontend service layer.
- Keep backend route definitions, controllers, models, and validators organized.
- Validate incoming request data.
- Keep secrets in environment variables.
- Avoid committing generated build output or local environment files unless intentionally required.
- Test both frontend and backend after changes.
- Check the frontend production build before submitting major changes.

### Suggested development workflow

```text
1. Create a feature branch
2. Implement the change
3. Run the frontend/backend
4. Test the affected functionality
5. Run frontend lint/build checks
6. Review the changes
7. Commit and push
```

---

## Deployment Notes

The project can be prepared for deployment by configuring the frontend, backend, and database for production.

### Backend deployment checklist

- Set `NODE_ENV=production`.
- Set a production `MONGODB_URI`.
- Set strong JWT secrets.
- Set `CLIENT_URL` to the deployed frontend origin.
- Configure HTTPS and secure cookie behavior.
- Ensure the hosting platform provides the configured backend port.
- Review logs and database connectivity.

### Frontend deployment checklist

- Set `VITE_API_BASE_URL` to the deployed backend API base URL.
- Install dependencies.
- Run `npm run build`.
- Deploy the generated frontend build using a static hosting provider.
- Confirm frontend routes and API requests work in production.

### Before going live

- Test regular-user registration and login.
- Test administrator login and role separation.
- Test core business transactions.
- Test PDF generation.
- Test report calculations.
- Verify CORS and cookie behavior.
- Verify database backups and access permissions.

---

## Future Improvements

Potential areas for future development include:

- More detailed API documentation.
- Automated backend and frontend tests.
- Expanded dashboard analytics.
- Additional export formats for reports.
- More configurable business workflows.
- Improved audit logging.
- Additional deployment and monitoring documentation.

These are suggestions for future work, not claims that the features are already implemented.

---

## Author

<div align="center">

### Yash Marviya

**Creator and Copyright Owner of Business Bill**

[![GitHub](https://img.shields.io/badge/GitHub-yashmarviya99-181717?logo=github)](https://github.com/yashmarviya99)

**GitHub Profile:** [github.com/yashmarviya99](https://github.com/yashmarviya99)  
**Project Repository:** [node_pr9-bill](https://github.com/yashmarviya99/node_pr9-bill)

</div>

---

## License and Copyright

**Copyright (c) 2026 Yash Marviya. All Rights Reserved.**

Business Bill is proprietary software owned by **Yash Marviya**.

Unless the copyright owner gives prior written permission, no person or organization is permitted to copy, modify, publish, distribute, sublicense, sell, or commercially exploit this project's source code or substantial portions of it.

Viewing the public repository does not grant permission to reuse, redistribute, or create derivative works from the software.

The complete license terms are provided in the [`LICENSE`](LICENSE) file.

For permission to use, modify, distribute, or otherwise obtain rights to this software, contact the copyright owner through the GitHub profile linked above.

---

<div align="center">

**Business Bill**  
Built and maintained by **Yash Marviya**

*Business Billing • Inventory • Accounting • Reports*

</div>
#   n o d e _ p r 9 - b i l l  
 #   n o d e _ p r 9 - b i l l  
 