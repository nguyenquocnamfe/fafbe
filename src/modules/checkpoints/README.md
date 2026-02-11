# Checkpoints Module

Manages milestones, work submission, and payments.

## Workflow
1.  **Created**: Checkpoints are created as part of the `Contract` creation process. Status: `PENDING`.
2.  **Submission**: Worker submits work (URL/Notes). Status: `SUBMITTED`.
3.  **Review**: Client reviews the submission.
    - **Approve**: Funds released from Escrow to Worker wallet. Status: `APPROVED` (or `COMPLETED`).
    - **Reject**: Worker must revise and resubmit. Status returns to `PENDING` (or stays `SUBMITTED` requiring update).

## Endpoints
*   `POST /api/checkpoints/:id/submit` - Worker submits work.
*   `POST /api/checkpoints/:id/approve` - Client approves work (Triggers Payment Release).
*   `POST /api/checkpoints/:id/reject` - Client rejects work.
