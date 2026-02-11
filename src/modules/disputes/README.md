# Dispute Resolution Module

This module handles the resolution of disputes between Clients and Workers.

## Logic Overview

When a dispute is resolved by an Admin, the system performs a final settlement of funds based on the logic: **"Winner Takes All"**.

### 1. Client Wins (`CLIENT_WINS`)
*   **Refund**: All **locked funds** from *pending/submitted/rejected* checkpoints are refunded to the Client's balance.
*   **Contract Status**: Updated to `CANCELLED`.
*   **Checkpoint Status**: All non-approved checkpoints are marked as `CANCELLED`.
*   **Transaction**: A `REFUND` transaction is recorded.

### 2. Worker Wins (`WORKER_WINS`)
*   **Release**: All **locked funds** from *pending/submitted/rejected* checkpoints are released to the Worker's balance.
*   **Contract Status**: Updated to `COMPLETED`.
*   **Checkpoint Status**: All non-approved checkpoints are marked as `APPROVED`.
*   **Transaction**: A `RELEASE` transaction is recorded.

## API Endpoints

### Create Dispute
`POST /api/disputes`
*   Headers: `Authorization: Bearer <token>`
*   Body: `{ "contractId": 1, "reason": "Worker stopped receiving calls" }`

### Add Message
`POST /api/disputes/:id/messages`
*   Body: `{ "message": "Here is the proof...", "attachments": ["https://proof.com/img1.png"] }`

### Resolve Dispute (Admin Only)
`POST /api/disputes/:id/resolve`
*   Body: `{ "resolution": "CLIENT_WINS" }` or `{ "resolution": "WORKER_WINS" }`

## Database Tables
*   `disputes`: Stores dispute status and resolution.
*   `dispute_messages`: Stores communication log.
