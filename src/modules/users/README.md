# Users Module

Manages user profiles, skills, and wallet information.

## Features
*   **Profiles**: Separate profiles for `employer` and `freelancer`.
*   **Skills**: Users can add/remove skills from their profile.
*   **Wallet**: Internal wallet for payments (Points system).

## Endpoints

### Profile
*   `GET /api/users/profile` - Get current user profile.
*   `PUT /api/users/profile` - Update profile (Bio, Hourly Rate, Full Name).
*   `GET /api/users/:id/profile` - Get public profile of another user.

### Skills
*   `GET /api/users/skills` - List user skills.
*   `POST /api/users/skills` - Add skills.
*   `DELETE /api/users/skills/:id` - Remove a skill.

### Wallet
*   `GET /api/users/wallet` - Get wallet balance and transaction history.
