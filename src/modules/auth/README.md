# Authentication Module

Manages user registration, login, and security.

## Features
*   **Registration**: Users sign up as `employer` or `freelancer`.
*   **Login**: JWT-based authentication.
*   **Email Verification**: OTP sent via email (Nodemailer).
*   **Password Reset**: Secure flow with OTP.

## Endpoints

### Registration & Login
*   `POST /api/auth/register`
    - Body: `{ email, password, role, fullName }`
*   `POST /api/auth/login`
    - Body: `{ email, password }`

### Verification
*   `POST /api/auth/verify-email`
    - Body: `{ email, otp }`
*   `POST /api/auth/resend-verification`
    - Body: `{ email }`

### Password Management
*   `POST /api/auth/forgot-password`
    - Body: `{ email }`
*   `POST /api/auth/verify-otp` (for password reset)
    - Body: `{ email, otp }`
*   `POST /api/auth/reset-password`
    - Body: `{ email, newPassword, otp }`
