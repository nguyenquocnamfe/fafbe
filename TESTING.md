# Testing Guide

This project includes automated integration tests and supports manual API testing.

## Prerequisites
1.  **Environment Variables**: Ensure `.env` is configured (DB credentials, JWT Secret, OpenAI Key).
2.  **Database**: PostgreSQL must be running. The application handles table creation, but the DB itself must exist.

## Automated Tests

Run these scripts from the project root.

### 1. Full Integration Test
Tests the entire lifecycle: Auth -> Job Post -> Proposal -> Contract -> Work Submission -> Payment.
```bash
node scripts/test-integration.js
```

### 2. Dispute Resolution Test
Tests the dispute flow: Contract -> Dispute Creation -> Admin Resolution -> Fund Settlement.
```bash
node scripts/test-disputes.js
```

### 3. Exclusive Worker Test
Tests logic that prevents workers from applying to new jobs while having an active contract, and auto-cleans up other proposals upon hiring.
```bash
node scripts/test-exclusive.js
```

## Manual Testing (API)

Use Postman or Curl. Below are key workflows.

### Register & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password", "role":"employer", "fullName":"Test User"}'

# Login (Returns JWT Token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password"}'
```

### Create Job (As Employer)
*Requires Bearer Token header*
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build a Website",
    "description": "React JS website needed",
    "jobType": "SHORT_TERM",
    "budget": 500,
    "categoryId": 1,
    "checkpoints": [{"title":"Phase 1", "amount":500}]
  }'
```
*Note: New jobs are `PENDING` validation by Admin.*

### Admin Approval
*Requires Admin Token*
```bash
curl -X PUT http://localhost:5000/api/admin/jobs/<JOB_ID>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
