# Contracts Module

Manages the legal and financial agreement between Client and Worker.

## Features
*   **Digital Signature**: Contracts include a hash of the content for integrity.
*   **Fund Locking**: Payment is locked in the system upon contract creation (Escrow).
*   **Checkpoints**: Work is divided into milestones (Checkpoints).
*   **Termination**: Clients can terminate contracts early (Refunds triggered).
*   **Disputes**: Contracts can be disputed if issues arise.

## Endpoints
*   `GET /api/contracts` - List my contracts.
*   `GET /api/contracts/:id` - Get contract details.
*   `POST /api/contracts/:id/terminate` - Terminate contract.

## Checkpoints
*   `POST /api/checkpoints/:id/submit` - Worker submits work.
*   `PUT /api/checkpoints/:id/approve` - Client approves work (Funds released).
*   `PUT /api/checkpoints/:id/reject` - Client rejects work.
