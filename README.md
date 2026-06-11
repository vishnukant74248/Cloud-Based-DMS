# Cloud-Based Document Management System (DMS)

A secure, enterprise-grade full-stack document repository and tracking management platform built under the JUT curriculum framework.

## 🚀 Tech Stack Used
- **Frontend:** React.js, Axios
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Managed via pgAdmin 4)
- **Real-Time Communication:** Socket.io (WebSockets)
- **Security:** JSON Web Tokens (JWT) for route authorization

## ✨ Key Features
- **Secure Token Gateway:** Temporary bearer access token generation for dynamic endpoint protection.
- **Dynamic File Upload & Sync:** Handles asset parsing with auto-incrementing document version control.
- **Relational Audit Logging:** Keeps an unalterable history log inside PostgreSQL for every user operation.
- **Live Collaboration Stream:** Instantly broadcasts updates to connected user dashboards without page refreshes.
- **Advanced Search Engine:** Filters assets instantly by dynamic text tags or document identifiers.

## 🛠️ How to Setup & Run

### 1. Database Setup
1. Open pgAdmin 4 and connect to your server instance (e.g., `MY_New-Server`).
2. Create a database named `dms_db`.
3. Create the required relational tables (`documents` and `audit_logs`).

### 2. Backend Setup (`/server`)
1. Open your terminal in the backend directory.
2. Create a `.env` file and append your `DATABASE_URL` and `JWT_SECRET`.
3. Run the following commands:
   ```bash
   npm install
   npm start