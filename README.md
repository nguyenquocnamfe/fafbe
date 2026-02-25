# FAF Backend (Freelance Application Framework)

A comprehensive Node.js/Express backend for a freelance marketplace platform featuring real-time communication, AI-powered content moderation, secure payments (Escrow), digital contracts, and complex job workflows.

## 🚀 Features Overview

### 1. **Authentication & User Management** (`src/modules/auth`, `src/modules/users`)
- **Secure Registration/Login**: Email & Password with JWT Authentication.
- **Email Verification**: OTP-based email verification using Nodemailer.
- **Forgot/Reset Password**: Secure OTP flow for password recovery.
- **User Roles**: Separate roles for `employer` (Client) and `freelancer` (Worker).
- **Profile Management**: Manage bio, hourly rates, and skills.

### 2. **Job Management & Matching** (`src/modules/jobs`, `src/modules/matching`)
- **Job Posting**: Clients create jobs with detailed descriptions, budgets, **deadlines**, and required skills.
- **Milestone-based Checkpoints**: Jobs are broken down into paid milestones (checkpoints).
- **Admin Approval Workflow**: New jobs start as `PENDING`. Admins approve (`OPEN`) or reject (`REJECTED`) them.
- **AI Content Moderation**: Automatic scanning of job descriptions for inappropriate content using OpenAI API.
- **Dynamic Matching**:
    - **For Workers**: Smart job recommendations based on skill match scores.
    - **For Clients**: Recommended freelancers based on job requirements and ratings.

### 3. **Proposals & Bidding** (`src/modules/proposals`)
- **Submit Proposal**: Freelancers submit proposals with cover letters and price quotes.
- **AI Moderation**: Cover letters are automatically moderated.
- **Client Review**: Clients can Accept or Reject proposals.
- **Worker Restriction**: Enforces one active contract at a time per freelancer to ensure quality.

### 4. **Contracts & Digital Signatures** (`src/modules/contracts`)
- **Auto-Contract Generation**: Contracts are automatically created when a proposal is accepted.
- **Escrow System**: Funds are **locked** from the Client's wallet upon contract creation.
- **Digital Signatures**: Both parties digitally sign the contract (SHA256 hash of content + timestamp).
- **Termination & Re-opening**: Clients can terminate active contracts.
    - **Refund**: Remaining funds are refunded to the Client.
    - **Re-open**: The job is automatically re-opened (`OPEN`) to find a new worker.
    - **New Draft**: A new contract is created with only the remaining work.
- **Status Tracking**: Track contract lifecycle (`DRAFT`, `ACTIVE`, `COMPLETED`, `DISPUTED`, `CANCELLED`, `TERMINATED`).

### 5. **Work Submission & Payments** (`src/modules/checkpoints`)
- **Submission**: Freelancers submit work for specific checkpoints (milestones).
- **Approval**: Clients review and approve submissions.
- **Automated Payouts**: Upon checkpoint approval, funds are automatically **released** from the locked escrow to the Freelancer's wallet.
- **Platform Fee**: A **5% fee** is deducted from the milestone amount during payout to support the platform.
- **Transaction History**: Detailed logs of all financial movements (`LOCK`, `RELEASE`, `REFUND`, `DEPOSIT`, `WITHDRAW`).

### 6. **Worker Reputation & Tiers** (`src/modules/users`)
- **Worker Tiers**: Freelancers are automatically assigned tiers (**Bronze**, **Silver**, **Gold**, **Diamond**) based on their total earnings and average rating.
- **Portfolio**: Workers can showcase their best work via a dedicated portfolio section in their profile.
- **Skill Ranking**: Dynamic skill scores that increase as workers complete jobs in specific categories.

### 7. **Real-time Chat** (`src/modules/chat`)
- **Instant Messaging**: Real-time communication using **Socket.io**.
- **Persistent History**: Chat history stored in PostgreSQL.
- **Scoped Conversations**: Secure one-on-one chat rooms between Client and Worker.

### 7. **Notification System** (`src/modules/notifications`)
- **Real-time Alerts**: Instant notifications for key events (Proposal Accepted, Work Submitted, Payment Released).
- **In-App & Email**: Support for both notification channels.

### 8. **Dispute Resolution** (`src/modules/disputes`)
- **Dispute Filing**: Users can file disputes if valid issues arise during a contract.
- **Evidence Submission**: Support for messaging and evidence upload within the dispute case.

### 9. **Reviews & Reputation** (`src/modules/reviews`)
- **Post-Contract Reviews**: Users rate each other (1-5 stars) after contract completion.
- **AI Moderation**: Review comments are scanned for appropriateness.
- **Reputation Score**: Aggregated rating display for Workers and Clients.

---

## 🔄 Core Workflows

### A. Job Posting & Approval
1. **Client** posts a Job with Budget, Checkpoints, and **Deadline**.
2. Job Status: `PENDING`.
3. **Admin** reviews the job.
    - If Approved → Status: `OPEN`.
    - If Rejected → Status: `REJECTED` (with reason).

### B. Hiring & Contract Flow
1. **Freelancer** finds a job (via Search or Matching) and submits a **Proposal**.
2. **Client** reviews proposals and clicks **Accept**.
3. **System**:
    - Checks Client's wallet balance.
    - **Locks** the total contract amount (moves from `balance` to `locked_points`).
    - Creates a **Contract** in `DRAFT` status.
4. Both parties **Sign** the contract digitally.
5. Contract Status: `ACTIVE`.

### C. Work & Payment Flow
1. **Freelancer** completes a milestone and calls **Submit Checkpoint**.
2. **Client** reviews the work.
3. Client clicks **Approve**.
4. **System**:
    - **Releases** the checkpoint amount from Client's `locked_points` to Freelancer's `balance`.
    - Updates Checkpoint Status: `COMPLETED`.
5. Repeat for all checkpoints.
6. When all checkpoints are done, Contract Status: `COMPLETED`.

### D. Contract Termination & Re-opening
1. **Client** decides to terminate an active contract prematurely.
2. System calculates the value of unfinished (`PENDING`) checkpoints.
3. **Refund**: Unfinished amount is returned to Client's balance.
4. **Terminate**: Old contract marked `CANCELLED`.
5. **Re-open**: Job status set to `OPEN`.
6. **New Contract**: A new `DRAFT` contract is created with remaining checkpoints for the next freelancer.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Raw SQL & `pg` library)
- **Real-time**: Socket.io
- **Authentication**: JSON Web Tokens (JWT), Bcrypt
- **Email**: Nodemailer
- **AI Integration**: OpenAI API (for moderation)
- **Validation**: Manual input validation & Business logic constraints

---

## ⚙️ Installation & Setup

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Configuration**: Create a `.env` file in the root directory:
    ```env
    PORT=5000
    DB_HOST=localhost
    DB_USER=your_user
    DB_PASS=your_password
    DB_NAME=faf_db
    JWT_SECRET=your_jwt_secret
    OPENAI_API_KEY=your_openai_key
    ```
4.  **Database Setup**:
    - Ensure PostgreSQL is running.
    - Run the provided SQL scripts in `src/database/` (if available) or rely on the application initialization if configured.
5.  **Run the Server**:
    - Development: `npm run dev`
    - Production: `npm start`

---

## 📚 API Documentation

(Routes are prefixed with `/api`)

- **Auth**: `/auth/register`, `/auth/login`, `/auth/verify-otp`
- **Users**: `/users/me`, `/users/profile/portfolio`
- **Jobs**: `/jobs` (GET, POST), `/jobs/:id` (PUT, DELETE/REJECT)
- **Proposals**: `/proposals`, `/proposals/:id/accept`
- **Contracts**: `/contracts`, `/contracts/:id/sign`, `/contracts/:id/terminate`, `/contracts/:id/settle-request`
- **Checkpoints**: `/checkpoints/:id/submit`, `/checkpoints/:id/approve`
- **Chat**: `/chat/conversations`, `/chat/start`
- **Notifications**: `/api/notifications`, `/api/notifications/read-all`
- **Admin**: `/admin/jobs/pending`, `/admin/jobs/:id/approve`
- **Matching**: `/matching/jobs/recommended`, `/matching/workers/:jobId`

---

## 📚 Module Documentation

*   [**Auth**](src/modules/auth/README.md) - Registration and security.
*   [**Users**](src/modules/users/README.md) - Profiles and wallet.
*   [**Jobs**](src/modules/jobs/README.md) - Job posting, approval, and matching.
*   [**Proposals**](src/modules/proposals/README.md) - Applications and bidding.
*   [**Contracts & Checkpoints**](src/modules/contracts/README.md) - Agreements and escrow.
*   [**Checkpoints**](src/modules/checkpoints/README.md) - Work submission and payments.
*   [**Chat**](src/modules/chat/README.md) - Real-time messaging.
*   [**Notifications**](src/modules/notifications/README.md) - Real-time alert system.
*   [**Dispute Resolution**](src/modules/disputes/README.md) - Fund settlement and dispute handling.
*   [**Matching**](src/modules/matching/README.md) - Algorithm for job/worker recommendations.
*   [**Reviews**](src/modules/reviews/README.md) - Reputation system.

## 🧪 Testing

See [**TESTING.md**](TESTING.md) for a comprehensive guide on running automated tests and manual API verification.

Quick start:
```bash
# Full Integration Test
node scripts/test-integration.js
```
