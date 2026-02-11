# Notifications Module

This module handles real-time notifications using `Socket.io`.

## Features

*   **Real-time Delivery**: Notifications are pushed instantly to connected clients.
*   **Database Storage**: All notifications are stored in the `notifications` table for history and offline retrieval.
*   **Mark as Read**: API to mark notifications as read.

## Integration & Triggers

The following events trigger notifications:

### Jobs
*   **Job Approved**: Client receives a notification when their job is approved by Admin.
*   **Job Rejected**: Client receives a notification with the rejection reason.

### Proposals
*   **Proposal Received**: Client receives a notification when a Worker submits a proposal.
*   **Proposal Accepted**: Worker receives a notification when their proposal is accepted.
*   **Proposal Rejected**: Worker receives a notification when their proposal is rejected.

### Checkpoints (Work Submission)
*   **Work Submitted**: Client receives a notification when a Worker submits work.
*   **Work Approved**: Worker receives a notification when work is approved (Funds Released).
*   **Work Rejected**: Worker receives a notification when work is rejected (with reason).

### Contracts
*   **Contract Terminated**: Worker receives a notification if the Contract is terminated early.

### Disputes
*   **Dispute Resolved**: Both parties receive a notification with the resolution outcome.

## Usage in Code

```javascript
const notificationService = require('../notifications/notification.service');
const io = req.app.get('io');

await notificationService.createNotification({
    userId: targetUserId,
    type: 'EVENT_TYPE',
    title: 'Title',
    message: 'Message content',
    data: { entityId: 123 },
    io
});
```
