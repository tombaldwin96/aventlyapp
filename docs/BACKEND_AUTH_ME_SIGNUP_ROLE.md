# Backend: Fix performer signup from the app

The app sends **all** of the following when the user selects "Performer account" and verifies OTP:

- **URL:** `POST /api/auth/me?intent=partner`
- **Headers:**  
  `X-Signup-Role: PERFORMER`  
  `X-Signup-Intent: partner`
- **Body (JSON):** `{ "intent": "partner", "signupRole": "PERFORMER" }`

If new users from the app still get `role: END_USER`, the **backend** that handles `POST /api/auth/me` is not using this intent.

## What the backend must do

When creating a **new** user (no existing user for the Supabase auth UID):

1. Read the signup intent from **any** of:
   - Query: `intent=partner`
   - Header: `X-Signup-Intent: partner` or `X-Signup-Role: PERFORMER`
   - Body: `intent === 'partner'` or `signupRole === 'PERFORMER'`
2. If intent is partner/performer:
   - Set `user.role = 'PERFORMER'` (or your equivalent).
   - Create the performer/partner profile (e.g. `performerProfile` with status DRAFT) instead of only `endUserProfile`.
3. If no intent (or intent is end-user):
   - Keep current behaviour (e.g. `role = 'END_USER'`).

The website uses `https://www.avently.co.uk/auth/signup?intent=partner`; the same logic that applies when `intent=partner` is present there should apply when the app sends the same intent via query, headers, or body.
