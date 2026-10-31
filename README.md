# BEWARE

Personal security, privacy and cybersecurity auditor. Next.js 14 (App Router), Tailwind CSS, TypeScript. All third-party calls except the password range lookup run server-side so API keys never reach the browser.

## Run locally

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/beware.git
cd beware
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Features without a key work immediately: email breach scan, password check, URL analysis (blocklists), IP intel (InternetDB, GreyNoise), vulnerability check.

## API keys

| Variable | Sign up | Needed for |
|---|---|---|
| `OPTIIC_API_KEY` | https://optiic.dev | Screenshot OCR |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | https://console.cloud.google.com | Connected Apps Auditor |
| `PROXIEDMAIL_API_KEY` | https://proxiedmail.com | Email aliases |
| `ABUSEIPDB_KEY` | https://www.abuseipdb.com | IP abuse score |
| `VIRUSTOTAL_KEY` | https://www.virustotal.com | Malware scanner |
| `SHODAN_API_KEY` | https://shodan.io | Reserved; InternetDB does not need it |
| `ABUSECH_AUTH_KEY` | https://auth.abuse.ch | URLhaus and MalwareBazaar |
| `NVD_API_KEY` | https://nvd.nist.gov/developers/request-an-api-key | Optional, higher NVD limits |

XposedOrNot, HIBP Pwned Passwords, PhishDestroy, InternetDB, GreyNoise Community, crt.sh, NVD and OSV.dev need no signup.

### Google OAuth setup

1. In Google Cloud Console create a project and enable the Admin SDK API.
2. Configure the OAuth consent screen and add the scope `https://www.googleapis.com/auth/admin.reports.audit.readonly`.
3. Create an OAuth client of type Web application. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI, and later your live callback URL.
4. Put the client ID and secret in `.env.local`.

The Reports API only works when the signed-in user is a Google Workspace admin. Consumer accounts (no `hd` claim) get a link to the Google Security Checkup instead. While the consent screen is in testing mode, add yourself as a test user.

## Deploy to DigitalOcean App Platform (Web Service, $5/month)

1. Push this project to a GitHub repository named `beware`.
2. In `.do/app.yaml` replace `YOUR_GITHUB_USERNAME` with your GitHub username and commit.
3. In DigitalOcean go to Apps, Create App, choose GitHub and select the repo.
4. App Platform detects `.do/app.yaml`. If not, paste the spec manually. Confirm the component is a Web Service on the Basic `apps-s-1vcpu-512mb` plan.
5. Add the secret environment variables in the dashboard using the values from `.env.local`.
6. Deploy. The first build takes about 3 to 5 minutes.
7. After deploy, set the live callback `https://YOUR-APP.ondigitalocean.app/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console, confirm `GOOGLE_REDIRECT_URI` in App Platform matches it, and redeploy.

Alternatively with doctl: `doctl apps create --spec .do/app.yaml`.

## Free static site warning

A static export (`output: 'export'`) is free on DigitalOcean but has no server, so every API key would ship in the browser bundle and the Google OAuth callback could not work. Do not use it for BEWARE.

## Notes

- Rate limiting and caching are in-memory and reset when the instance restarts. Use a single instance.
- Alias region blocking uses the `cf-ipcountry` header that App Platform's edge adds.
- Scores: Privacy = 100 - (breach + OAuth + scam penalties). Cyber Risk = 0.4 x IP abuse + 0.4 x malware (detections x 8, capped) + 0.2 x CVE (max CVSS and count).
