# Proposals Module

Manages job applications from Workers.

## Features
*   **Submission**: Workers apply to jobs with a cover letter and bid price.
*   **Acceptance**: Clients accept proposals to create a Contract.
*   **Rejection**: Clients can reject proposals.
*   **Payment Lock**: Accepting a proposal requires the Client to have a sufficient wallet balance.

## Endpoints
*   `POST /api/proposals` - Submit a proposal.
*   `GET /api/proposals/job/:jobId` - Get proposals for a job.
*   `PUT /api/proposals/:id/accept` - Accept proposal (Locks funds, Creates Contract).
*   `PUT /api/proposals/:id/reject` - Reject proposal.
