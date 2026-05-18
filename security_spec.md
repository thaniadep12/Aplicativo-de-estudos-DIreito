# Security Specification (LegisPlan)

## Data Invariants
1. User progress can only be read and written by the owner (userId matching request.auth.uid).
2. Quiz sessions can only be read and written by the owner.
3. Timestamps (updatedAt) must be set using request.time.
4. completedTopics must be an object and subjectId must be a valid ID.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create `user_progress` with `userId` of another user.
2. **Identity Spoofing (Write)**: Attempt to update another user's `user_progress`.
3. **Cross-User Query**: Attempt to list all `quiz_sessions` (should be restricted by rules).
4. **State Shortcutting**: Attempt to set `isCompleted: true` on a session without answering questions.
5. **Ghost Field Injection**: Adding `isAdmin: true` to `user_progress`.
6. **Malicious ID**: Creating a sessionId with 1MB of text.
7. **Bypassing Verification**: Writing to rules without `email_verified: true` (if enforced).
8. **Resource Poisoning**: Setting `score` to a string or a negative number.
9. **Timestamp Manipulation**: Manually setting `updatedAt` to a future date.
10. **CompletedTopics Overwrite**: Replacing the entire `completedTopics` object with malicious data.
11. **Session Hijacking**: Trying to read a specific sessionId belonging to another user.
12. **Unauthorized Deletion**: A user trying to delete another user's progress.

## Test Runner (firestore.rules.test.ts)
(Will be implemented if needed for a deeper audit, but for now I'll focus on the rules implementation).
