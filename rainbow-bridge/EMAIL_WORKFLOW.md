# Rainbow Bridge email-based review (development)
Visitor submits without logging in. A server function validates input, saves it privately, generates a random single-use review token, stores only its hash, and emails bself@secondleash.us via a verified email provider.

## Before deployment
1. Set up a verified sender domain and Resend API key, stored as Supabase Edge Function secrets, never in GitHub.
2. Deploy and test the private guest submission and token tables.
3. Add rate limiting, bot protection, abuse reporting, and strict CORS.
4. Implement review GET preview + POST confirmation, atomically consuming the token with status change; do not change status on link open (email security scanners follow links).
5. Implement private photo uploads and virus/content validation before offering them to guests.
6. Publish approved memorials via a carefully scoped public endpoint that excludes contact emails and private photos.
7. Test submissions, notifications, expiry, replay prevention, moderation and accessibility.
8. Only then switch the existing retired campaign page over to the new memorial page.

The existing signed-in memorial prototype and dashboard remain available on the feature branch, but are not the desired visitor workflow. The draft submission function is intentionally NOT deployed.
