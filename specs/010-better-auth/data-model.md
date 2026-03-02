# Better-Auth Data Model

The `better-auth` integration will automatically manage the following models in MongoDB via the official `mongodbAdapter`:

## 1. User (`user`)
Represents the authenticated user.
- `_id`: ObjectId string
- `email`: string
- `name`: string
- `image`: string (optional)
- `emailVerified`: boolean
- `createdAt`: Date
- `updatedAt`: Date

## 2. Session (`session`)
Tracks active user sessions.
- `_id`: ObjectId string
- `userId`: Reference to User
- `expiresAt`: Date
- `ipAddress`: string (optional)
- `userAgent`: string (optional)
- `createdAt`: Date
- `updatedAt`: Date

## 3. Account (`account`)
Stores OAuth provider accounts linked to a User.
- `_id`: ObjectId string
- `userId`: Reference to User
- `accountId`: string (provider's account ID)
- `providerId`: string (e.g., 'google')
- `accessToken`: string (optional)
- `refreshToken`: string (optional)
- `expiresAt`: Date (optional)
- `password`: string (optional, if using email/pass)
- `createdAt`: Date
- `updatedAt`: Date

## 4. Verification (`verification`)
Stores tokens for magic links or email verification.
- `_id`: ObjectId string
- `identifier`: string (e.g., email address)
- `value`: string (the token itself)
- `expiresAt`: Date
- `createdAt`: Date
- `updatedAt`: Date

*(Note: Data structures reflect `better-auth` internal defaults for document databases.)*
