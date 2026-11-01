# BEWARE

**See how exposed you are online, in one dashboard.**

BEWARE checks your email, passwords, links and servers against real security databases and gives you two scores: a Privacy Score and a Cyber Risk Score. No made-up data. If a source fails, BEWARE shows the real error instead of hiding it.

## What you can check

### Privacy tab

| Tool | What it does |
|---|---|
| **Email Breach Scanner** | Checks whether your email appears in known data breaches and lists which ones. |
| **Password Health Check** | Tells you whether a password has appeared in known leaks. It runs in your browser: only the first 5 characters of the password's SHA-1 hash are sent, and the match is done on your device. Your password never leaves it. |
| **Scam URL / Ad Analyzer** | Checks a link against phishing and malware blocklists, then reads the page for scam wording like "winner", "claim" and "guaranteed returns". |
| **Popup Screenshot Analyzer** | Upload a screenshot of a suspicious popup. BEWARE reads the text and flags scam language. |
| **Connected Apps Auditor** | Lists the apps connected to a Google Workspace account and flags the riskiest. |
| **Email aliases** | For a breached site or flagged link, create a throwaway forwarding address so you don't hand out your real email again. |

### Cybersecurity tab

| Tool | What it does |
|---|---|
| **IP Reputation** | Shows open ports, known CVEs, abuse reports and whether an IP is a known internet scanner. |
| **Malware Scanner** | Checks a URL or a file hash (MD5 or SHA-256) against many antivirus engines and malware databases. |
| **Vulnerability Check** | Lists a domain's subdomains from certificate logs and finds known CVEs for a technology, such as `nginx 1.18`. It can also check an npm package and version. |

## How to use it

1. Open the dashboard and pick the **Privacy** or **Cybersecurity** tab.
2. Type what you want to check into a card and click its button.
3. Read the result. The rings at the top update as you scan.

Try these:

- **IP:** `8.8.8.8`
- **Malware hash:** `275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f` (the harmless EICAR test file that antivirus tools deliberately flag)
- **Vulnerability check:** domain `github.com` with technology `nginx 1.18`
- **Password:** `password123`, a throwaway example. Don't type a password you actually use into any website, including this one.

## Understanding the scores

**Privacy Score (higher is better).** Starts at 100 and loses points for breaches your email appears in, high-risk connected apps and scam-flagged links or screenshots.

**Cyber Risk Score (lower is better).** A weighted mix of IP abuse confidence (40%), malware detections (40%) and CVE severity and count (20%).

Both rings show `--` until you run a scan.

## Good to know

- **Connected Apps Auditor** only returns data for Google Workspace administrator accounts. A regular Gmail account gets a link to Google's Security Checkup instead.
- **Email aliases** are unavailable in some regions (IN, NG, ID, PK, PH, VN). In those regions BEWARE shows an alternative instead.
- **Rate limits.** Each tool limits how often you can scan, and free-tier sources have their own limits. If you see a "too many requests" message, wait a minute and try again. VirusTotal's free tier allows about 4 scans per minute.
- **Email results are cached for 24 hours** to stay within source limits.
- **Results are a starting point**, not a guarantee. A clean result doesn't prove something is safe.

## Privacy

- Your password is hashed in your browser and never sent in full.
- API keys stay on the server and are never exposed to your browser.
- BEWARE doesn't store scan history or accounts. Rate-limit counters and the 24-hour email cache live in server memory and reset when the app restarts.
- Pages you ask BEWARE to analyze are fetched from the server, and private or internal addresses are blocked.

## Built with

Next.js 14, Tailwind CSS, TypeScript, and these free sources: XposedOrNot, HIBP Pwned Passwords, PhishDestroy, URLhaus, Optiic, Google Admin SDK, ProxiedMail, Shodan InternetDB, AbuseIPDB, GreyNoise Community, VirusTotal, MalwareBazaar, crt.sh, NVD and OSV.dev.

---

## Run your own copy

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/beware.git
cd beware
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. On Windows PowerShell use `copy .env.example .env.local`.

Email, password, URL (blocklists), IP (InternetDB, GreyNoise) and vulnerability tools work without any keys. The rest need free keys, set in `.env.local`:

| Variable | Get it at | Needed for |
|---|---|---|
| `ABUSEIPDB_KEY` | abuseipdb.com | IP abuse score |
| `VIRUSTOTAL_KEY` | virustotal.com | Malware scanner |
| `ABUSECH_AUTH_KEY` | auth.abuse.ch | URLhaus and MalwareBazaar |
| `OPTIIC_API_KEY` | optiic.dev | Screenshot OCR |
| `PROXIEDMAIL_API_KEY` | proxiedmail.com | Email aliases |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | console.cloud.google.com | Connected Apps Auditor |
| `NVD_API_KEY` | nvd.nist.gov | Optional, higher NVD limits |

For Google sign-in, enable the **Admin SDK API**, add the scope `https://www.googleapis.com/auth/admin.reports.audit.readonly`, add yourself as a test user, and set the redirect URI `http://localhost:3000/api/auth/google/callback`.

### Production build

```bash
npm run build
npx next start -p 3000
```

## Feedback

Found a bug or have an idea for another check? Open an issue or message me. [ashutoshkakrana6@gmail.com]

## Notes

- Rate limiting and caching are in-memory and reset when the instance restarts. Use a single instance.
- Alias region blocking uses the `cf-ipcountry` header that App Platform's edge adds.
- Scores: Privacy = 100 - (breach + OAuth + scam penalties). Cyber Risk = 0.4 x IP abuse + 0.4 x malware (detections x 8, capped) + 0.2 x CVE (max CVSS and count).
