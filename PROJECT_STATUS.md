# FAF Backend - Project Feature Status

This document serves as the master checklist of all implemented features and a roadmap for future development.
**Current Status**: ✅ Core System Fully Implemented & Verified.

## 📌 How to Use
- **[x]**: Feature is fully implemented and verified.
- **[ ]**: Feature is planned or pending implementation.
- To add a new feature, append it to the appropriate section or create a new one.

---

## 1. Authentication & Security
- [x] **Registration**: Support for `employer` and `freelancer` roles.
- [x] **Login**: JWT-based secure authentication.
- [x] **Email Verification**: OTP sent via Nodemailer.
- [x] **Password Reset**: Secure Forgot Password flow with OTP.
- [x] **Security**: Bcrypt password hashing, Helmet headers, Rate limiting.

## 2. User Management
- [x] **Profiles**: Manage Bio, Hourly Rate, Full Name.
- [x] **Skills**: Tag users with relevant skills for matching.
- [x] **Wallet System**: Internal points system (`balance` and `locked_points`).
- [x] **Transaction History**: Logs for Deposits, Withdrawals, Escrow Locks, and Releases.

## 3. Job Management
- [x] **Post Job**: Detailed creation with Budget, Deadline, and Checkpoints.
- [x] **Job Approval Workflow**:
    - Jobs default to `PENDING`.
    - Admins receive notification to Approve/Reject.
    - Only `OPEN` jobs are visible to workers.
- [x] **Job Matching**:
    - **For Workers**: "Jobs for You" based on Skill Match %.
    - **For Clients**: "Recommended Workers" based on Skills + Ratings.
- [x] **AI Moderation**: Automatic scanning of Job Descriptions.

## 4. Proposals & Bidding
- [x] **Submit Proposal**: Bids with Cover Letter and Price.
- [x] **AI Moderation**: Automatic scanning of Cover Letters.
- [x] **Exclusive Worker Logic**:
    - Workers with an **Active Contract** cannot apply to new jobs.
    - Pending proposals are **Auto-Deleted** when a worker is hired.

## 5. Contracts & Escrow
- [x] **Auto-Creation**: Contract generated upon Proposal Acceptance.
- [x] **Escrow Lock**: Funds (`total_amount`) successfully locked from Client's wallet.
- [x] **Digital Signatures**: Semantic hash signature (Content + User + Timestamp).
- [x] **Termination & Re-opening**:
    - Client can terminate early.
    - Remaining funds **Refunded** to Client.
    - Job automatically **Re-opened** for new applicants.

## 6. Work & Payments (Checkpoints)
- [x] **Milestones**: Breakdown of work into Checkpoints.
- [x] **Submission**: Worker submits URL/Notes.
- [x] **Approval & Release**:
    - Client approves checkpoint -> Funds **Released** to Worker.
    - Transaction verified in Integration Test.

## 7. Dispute Resolution
- [x] **Raise Dispute**: Users can file disputes on Active contracts.
- [x] **Evidence**: Support for Text messages and Attachments.
- [x] **Admin Resolution**:
    - **Worker Wins**: Funds released to Worker.
    - **Client Wins**: Funds refunded to Client.
    - **Split**: (Supported by logic).

## 8. Real-time Communication
- [x] **Chat System**: Socket.io real-time messaging.
- [x] **Notifications**:
    - Instant alerts for Job Status, Proposals, Payments, and Chat.
    - Deep linking (e.g., clicking notification goes to Contract).

## 9. Reputation
- [x] **Reviews**: Post-contract 5-star rating system.
- [x] **AI Moderation**: Review comments scanned for appropriateness.
- [x] **Aggregated Score**: Average rating displayed on profiles.

---

## 🚀 Future Features / Pending Requests
*(Add new features here)*

- [ ] ...
