# Jobs Module

Manages job postings, updates, and discovery.

## Features
*   **Job Posting**: Clients can post jobs with budget, description, and required skills.
*   **Approvals**: Admin must approve jobs before they are visible.
*   **Matching**: Workers receive job recommendations based on skills.
*   **Re-opening**: Jobs are automatically re-opened if a contract is terminated.

## Endpoints
*   `POST /api/jobs` - Create a job.
*   `GET /api/jobs` - List jobs (with filters).
*   `GET /api/jobs/:id` - Get job details.
*   `PUT /api/jobs/:id` - Update job.
*   `DELETE /api/jobs/:id` - Close/Delete job.

## Admin
*   `PUT /api/admin/jobs/:id/approve` - Approve a job.
*   `PUT /api/admin/jobs/:id/reject` - Reject a job.
