# LabCheckIn leave classification Worker

This Worker replaces the local Express URL for AI classification. It accepts only an authenticated Firebase assistant who owns the session and class. It loads the saved leave reason from Firestore, calls Groq from the server, validates the category, then saves it to the existing participation record. Student submission no longer starts classification.

## Secrets and configuration

1. Set `FIREBASE_PROJECT_ID` in `wrangler.jsonc` to the Firebase project ID. Add the production web origin to `ALLOWED_ORIGINS`; keep localhost origins only if needed for development. Mobile requests may omit `Origin`; Firebase authentication and authorization remain mandatory.
2. Create a dedicated Google service account and grant only the Firestore data access role it needs (typically `Cloud Datastore User`, not Owner/Editor). Firestore IAM does not restrict a service account to individual fields, so the Worker code itself must continue to limit writes to the AI subobject. Enable the Firestore API for the project and create its JSON key. Do not commit or share the key.
3. From this directory, add secrets interactively:

   ```powershell
   npx wrangler secret put GROQ_API_KEY
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
   ```

   For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the entire service-account JSON when Wrangler prompts. Never put either value in `wrangler.jsonc`, app `.env`, or Git.
4. Install Worker tooling and preview/deploy:

   ```powershell
   npm install
   npm run typecheck
   npm run dev
   npm run deploy
   ```

   The local preview is only for development. Team members use the deployed `https://...workers.dev` URL.
5. Set the app's `EXPO_PUBLIC_LEAVE_AI_API_URL` to the Worker origin, for example `https://labcheckin-leave-ai.<account>.workers.dev`. The app appends `/classify-leave` itself. Rebuild/restart Expo so the public URL is bundled.

## Security notes

- Firebase ID tokens are verified against Google's Firebase Secure Token signing keys and checked for project audience, issuer, and expiry.
- The Worker independently verifies the caller's Firestore role and the assistant assignment on both session and class. It ignores any caller-supplied reason/category and reads the saved request itself.
- The service-account private key and Groq API key are Cloudflare secrets. A Cloudflare Worker URL is public and must not be treated as an access credential.
- Rotate any Groq key that was previously pasted into chat or otherwise shared; enter only the replacement key into Cloudflare as a secret.
- AI is advisory only. This endpoint never changes the human decision (`status`). Firestore update preconditions prevent concurrent retries from replacing another active result.
- The current retry cooldown and one-active-request lock are per leave record. Configure provider spend limits in Groq and monitor Worker observability for operational controls.

Groq's `llama-3.1-8b-instant` was shut down on 2026-08-16; this Worker defaults to `openai/gpt-oss-20b`. The model can be changed in `wrangler.jsonc` without exposing the API key.
