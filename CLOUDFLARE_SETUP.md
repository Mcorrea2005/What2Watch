# What2Watch — final deployment notes

## Secure TMDB connection (Cloudflare Workers)

The site is configured to call a Cloudflare Worker rather than TMDB directly. The Worker keeps the TMDB Read Access Token out of the public website and GitHub repository.

### 1. Create the Worker

1. Sign in to the Cloudflare dashboard: https://dash.cloudflare.com/
2. Open **Workers & Pages**.
3. Choose **Create** → **Create Worker** (the dashboard wording may vary).
4. Name it `what2watch-api` and deploy the starter Worker.
5. Open **Edit code** and replace the starter code with the complete contents of this repository's `worker.js`.
6. Save and deploy.

### 2. Add the TMDB token as a secret

1. Open the Worker → **Settings** → **Variables and Secrets**.
2. Add a secret named exactly `TMDB_TOKEN`.
3. Paste the TMDB **API Read Access Token** as its value.
4. Save, then redeploy if the dashboard asks.

Do not put the token in `index.html`, `worker.js`, GitHub Pages settings, or a public commit.

### 3. Connect the website to the Worker

1. Copy the Worker URL, for example `https://what2watch-api.<your-subdomain>.workers.dev`.
2. In `index.html`, replace the placeholder in:
   `const API='https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev';`
3. Commit the updated `index.html` to the final branch and merge the pull request to `main`.
4. Wait for GitHub Pages to publish, then open the site in a private/incognito browser window and test genre loading and recommendations.

### Notes

- The Worker only permits requests from `https://mcorrea2005.github.io` and only proxies the three TMDB read endpoints the app needs.
- The app has no user-entered token field once the Worker URL is configured.
- Cloudflare's free plan limits and terms can change; check the dashboard for the current allowance.
- The Worker token is a shared server credential. The public website can make requests through it, so keep the Worker endpoints restricted and monitor usage. If the app is shared widely, add rate limiting and abuse protection.
