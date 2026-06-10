# Firestore Security Specifications - SimonFX

## 1. Data Invariants
1. **User Identity Invariant**: A user's profile and settings can only be accessed or modified if `request.auth.uid` matches the `{userId}` path.
2. **Trade Ownership Invariant**: A user's recorded trade is contained under `/users/{userId}/trades/{tradeId}` and is strictly only accessible if `request.auth.uid == userId`.
3. **Format Integrity**:
   - `pair` must be a non-empty string under 32 characters.
   - `direction` must be exactly `"BUY"` or `"SELL"`.
   - `status` must be exactly `"OPEN"` or `"CLOSED"`.
   - Numeric fields (`entryPrice`, `lotSize`, `tp`, `sl`, `pnl`) must be numbers.

---

## 2. The "Dirty Dozen" Payloads (Denial Proofs)

Below are the 12 malicious payloads designed to attempt privilege escalation, validation bypass, or data contamination. All of these must be rejected with `PERMISSION_DENIED` by the rules engine.

### Payload 1: Unauthorized user profile read
*   **Attempt**: User `attacker1` tries to read `/users/victimUser`
*   **Safety Gate**: Rejected by `request.auth.uid == userId` check.

### Payload 2: Hostile profile update
*   **Attempt**: User `attacker1` tries to write settings for `/users/victimUser`
*   **Safety Gate**: Rejected by ownership authorization check.

### Payload 3: Illegal trade insertion to another user's collection
*   **Attempt**: User `attacker1` tries to create `/users/victimUser/trades/maliciousTradeId`
*   **Safety Gate**: Rejected as parent `userId` does not match `attacker1`.

### Payload 4: Invalid direction string
*   **Attempt**: User `legitUser` tries to write direction: `"SHORT"` instead of `"BUY"` or `"SELL"`
*   **Safety Gate**: Rejected by enum validation value constraints.

### Payload 5: Invalid status string
*   **Attempt**: User `legitUser` tries to write status: `"PENDING"` instead of `"OPEN"` or `"CLOSED"`
*   **Safety Gate**: Rejected by enum validation value constraints.

### Payload 6: Size poisoning on pair name
*   **Attempt**: User `legitUser` injects a 10KB string into `pair` name field
*   **Safety Gate**: Rejected by `.size() <= 32` check on `pair` string.

### Payload 7: Negative lot size
*   **Attempt**: User `legitUser` writes a lot size of `-1.5`
*   **Safety Gate**: Rejected by `incoming().lotSize > 0` validation logic.

### Payload 8: Null field bypass (creating trade missing required core keys)
*   **Attempt**: User `legitUser` registers trade without `id` or `pair`
*   **Safety Gate**: Rejected by `data.keys().hasAll()` validation requirements.

### Payload 9: Mutation of system settings outside of account base
*   **Attempt**: User `attacker1` tries to set self-assigned roles (if any)
*   **Safety Gate**: Profile keys are restricted, and there are no custom roles in this application.

### Payload 10: Writing non-number types to price properties
*   **Attempt**: User `legitUser` writes `entryPrice: "twelve point five"` (string)
*   **Safety Gate**: Rejected by `incoming().entryPrice is number`.

### Payload 11: Modifying historical trade values via shadow ghost fields
*   **Attempt**: User `legitUser` writes unexpected `isVerified: true` parameter
*   **Safety Gate**: Rejected by strict map key set size matching or `diff().affectedKeys().hasOnly()`.

### Payload 12: Bypassing user verification
*   **Attempt**: A user with an unverified email (or dummy email) tries to write trades while verification is strictly enabled
*   **Safety Gate**: Rejected by `request.auth.token.email_verified == true`.

---

## 3. The Rules Schema
A complete `firestore.rules` file that strictly covers these cases is deployed in the system directory, protecting all routes.
