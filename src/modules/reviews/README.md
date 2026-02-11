# Reviews Module

Reputation management system for the marketplace.

## Features
*   **Post-Contract Reviews**: Both Client and Worker can review each other after a contract is `COMPLETED`.
*   **5-Star Rating**: Numerical rating + text comment.
*   **AI Moderation**: Review text is automatically scanned by OpenAI for inappropriate content. Inappropriate reviews are flagged (`FLAGGED`) and not displayed until manual admin approval.

## Logic
*   **Eligibility**: Can only review if the user was a party to the contract and the contract is `COMPLETED`.
*   **One-time**: Only one review per contract per user.

## Endpoints
*   `POST /api/reviews`
    - Body: `{ contractId, rating, comment }`
*   `GET /api/reviews/user/:userId` - Get all reviews for a user.
*   `GET /api/reviews/contract/:contractId` - Get reviews for a specific contract.
