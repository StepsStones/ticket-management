# STEPSSTONE – TICKET MANAGEMENT SYSTEM

Production-ready enterprise internal Ticket Management System built for **StepsStone Promoters Pvt. Ltd.**

Designed to manage customer-related legal queries, land documentation issues (Patta / Chitta / EC), project complaints, loan verification requests, and customer document requests across all StepsStone real-estate developments (e.g. Secret Aara - 01, Secret Aara - 02, Vannamalai Enclave, Urban Art, Vaanavil Plots).

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**:
   - **Super Admin**: Complete administrative governance, user deactivation, access to all tickets, full audit trail, analytics, settings.
   - **Admin / Legal Officer**: Ticket assignment & reassignment, employee workload monitoring, timeline review, resolution sign-off and official ticket closure.
   - **Employee / Documentation Executive**: Create tickets on behalf of customers, handle assigned cases, upload legal documents, log customer follow-ups, submit daily progress updates, and submit resolution notes.

2. **Customer Ticket Lifecycle**:
   - Automated sequential Ticket ID generation (e.g., `SS-TKT-2026-00001`).
   - Dynamic Status Workflow:
     $$\text{OPEN} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{WAITING} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$
   - Option to reopen closed tickets with mandatory reason.

3. **Immutable Chronological Timeline**:
   - Every ticket maintains a permanent, immutable event history:
     - `Ticket Created`
     - `Ticket Assigned` / `Reassigned`
     - `Status Changed`
     - `Document Uploaded`
     - `Follow-up Completed`
     - `Daily Update Submitted`
     - `Resolution Submitted`
     - `Ticket Closed` / `Reopened`

4. **Dedicated Follow-up & Daily Reminder / Escalation Engine**:
   - Background APScheduler checks unresolved assigned tickets.
   - Assigned staff are prompted for mandatory daily updates (progress, delay reasons, dependencies, target completion).
   - Unreported tickets are escalated to Admin and flagged under **Pending Daily Updates** and **Overdue Tickets**.

5. **Real-time Notifications via WebSockets**:
   - Live in-app toast alerts & header notification bell with unread counters.
   - Stored in PostgreSQL/SQLite for cross-session history.
   - Clicking any notification directly opens the target ticket.

6. **Secure Document Storage & Validation**:
   - File uploads validated by extension and size (up to 25MB): PDF, JPG, JPEG, PNG, DOC, DOCX, XLSX.
   - Secure authenticated downloads.

7. **Audit Log System**:
   - Immutable audit logs capturing user ID, user name, action, entity type, entity ID, old value, new value, IP address, and timestamp.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.15, FastAPI, SQLAlchemy 2.0 (async), SQLite / PostgreSQL with asyncpg/psycopg2, Pydantic v2, PyJWT, bcrypt, APScheduler, WebSockets.
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite 8.
- **Architecture**: Modular, REST APIs, WebSockets, background scheduled jobs, responsive design.

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database seed (creates tables, users, realistic StepsStone projects, and tickets)
python -m app.seed

# Start FastAPI backend (runs on port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite dev server (runs on port 5173 with proxy to backend)
npm run dev

# Or build production bundle (served directly by FastAPI)
npm run build
```

The unified application is also accessible directly at:
```
http://127.0.0.1:8000/
```

---

## 🔑 Default Demo Accounts

The database comes pre-seeded with realistic StepsStone personnel for immediate one-click testing from the login screen:

| Role | Name | Email / Username | Password |
|---|---|---|---|
| **Super Admin** | StepsStone Super Administrator | `admin@stepsstone.com` (`superadmin`) | `admin123` |
| **Admin** | Adv. K. Ramanathan (Chief Legal Officer) | `legal.head@stepsstone.com` (`legalhead`) | `legal123` |
| **Employee** | Rajesh Subramanian (Senior Documentation Executive) | `rajesh.s@stepsstone.com` (`rajesh`) | `rajesh123` |
| **Employee** | Priya Krishnan (CRM Specialist) | `priya.k@stepsstone.com` (`priya`) | `priya123` |

---

## 🧪 Running Automated Tests

Run backend unit and integration test suite:

```bash
cd backend
python -m pytest tests -v
```

All 5 test suites cover:
- Application health check
- JWT authentication and bad password handling
- Real estate project listings and dynamic database dashboard statistics
- Ticket timeline creation and assignment workflows
