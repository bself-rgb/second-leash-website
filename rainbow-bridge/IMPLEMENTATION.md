# Rainbow Bridge backend implementation notes

Development branch only. No production deployment or Supabase schema changes have been performed.

## Current status
- `rainbow-bridge/create.html` is a local-only five-step preview with Bailey sample data.
- `rainbow-bridge/schema.sql` is a proposed, **unapplied** database and private-storage schema.
- The linked Supabase project is currently inactive and has **not** been confirmed as the intended Second Leash backend.

## Before enabling submissions
1. Confirm the correct Supabase project and activate it if appropriate.
2. Configure secure login (email OTP/magic link) for memorial owners. Anonymous visitors should not be able to upload files directly.
3. Apply and verify the SQL on a development database; review existing policy names before rerunning.
4. Create a trusted server endpoint for memorial submission and photo association. Validate file signatures, size, count (max 5), MIME types and text limits server-side. Add rate limiting and abuse prevention.
5. Store photo references in a separate owner-bound table and link uploads to memorial IDs; reject orphaned/unassociated uploads. Private bucket access must be checked server-side.
6. Create a separate admin interface protected by authenticated server-side admin authorization. Only server-side admin actions may approve, decline, or request edits.
7. Build a public gallery that only queries approved/public memorials. Unlisted memorials require an unguessable share token verified by a trusted server endpoint; never rely on a public RLS policy for unlisted access.
8. Implement moderation of guestbook entries, notifications, removal requests, retention policy, and photo cleanup.
9. Test RLS using anon, regular owner, other owner, and admin identities. Verify private files cannot be fetched by unauthenticated visitors.
10. Integrate and test the frontend submission flow before deployment.

**Security:** Never put a Supabase secret/service-role key in HTML, JavaScript, or GitHub. Do not treat client-side form validation as a security boundary.
