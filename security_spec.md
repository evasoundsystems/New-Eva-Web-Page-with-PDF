# Firestore Security Rules Specification

## Data Invariants
1. **Default-Deny Catch-All**: Any path outside `/site_content`, `/products`, `/quotes`, and `/admins` is denied.
2. **Admin Verification**: Only verified Google users whose email is `eva.sound.systems@gmail.com` (`email_verified == true`) or whose UID exists in `/admins/{uid}` are admins.
3. **Public Catalog vs. Private PII**: `/site_content` and `/products` are publicly readable (`get`/`list`) so visitors can browse the storefront, while `/quotes` contains customer PII (`contactName`, `phone`, `email`) and can ONLY be read, listed, updated, or deleted by verified admins.
4. **Public Quote Submission Integrity**: Anyone can create a `/quotes/{quoteId}` document ONLY when `status == 'new'`, `engineerNotes == ''`, no admin estimate fields (`estimateItems`, `discount`, `shippingFee`, `taxRate`, `coverLetter`, `estimateUpdatedAt`) are supplied, `refCode` matches `^EVA-([0-9]{6}|[0-9]{6}-[0-9]{4})$`, `createdAt == request.time`, and no extra shadow keys exist (`hasOnly`). Verified admins may create standalone estimates and update/re-edit estimates across all statuses while preserving immutable `refCode` and `createdAt`.
5. **String & Array Bounds**: Every string field enforces strict `.size()` bounds and every array (`specs`, `sectionOrder`, `hiddenSections`, `services`, `testimonials`, `estimateItems`) enforces `.size()` limits to prevent storage exhaustion.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated `GET /quotes/q1` -> DENIED (PII isolation).
2. Non-admin authenticated `LIST /quotes` -> DENIED (PII isolation).
3. Unauthenticated `CREATE /quotes/q1` with `status: 'completed'` -> DENIED (state shortcutting).
4. Unauthenticated `CREATE /quotes/q1` with extra ghost key `isAdmin: true` or `estimateItems` -> DENIED (shadow field / tampering).
5. Unauthenticated `CREATE /quotes/q1` with spoofed `createdAt` not equal to `request.time` -> DENIED (temporal integrity).
6. Unauthenticated `CREATE /quotes/q1` with `notes` > 5000 chars -> DENIED (resource poisoning).
7. Unauthenticated `CREATE /quotes/bad..id` with invalid path characters -> DENIED (ID poisoning).
8. Unverified email (`email_verified: false`) matching `eva.sound.systems@gmail.com` attempting `UPDATE /site_content/main` -> DENIED (email spoofing).
9. Non-admin authenticated user attempting `CREATE /products/p1` -> DENIED (RBAC enforcement).
10. Non-admin authenticated user attempting `DELETE /products/p1` -> DENIED (RBAC enforcement).
11. Non-admin authenticated user attempting `CREATE /admins/attackerUid` -> DENIED (privilege escalation).
12. Admin attempting `CREATE /products/p1` with `category: 'invalid'` or `specs` array > 12 items -> DENIED (schema validation).
13. Admin attempting `UPDATE /quotes/q1` modifying immutable `refCode` or `createdAt` -> DENIED (audit immutability).
