# BEWARE free API reference

| Feature | Endpoint | Key required | Free-tier limit |
|---|---|---|---|
| Email breach scan | `GET api.xposedornot.com/v1/check-email/{email}` | No | Rate limited; BEWARE enforces 2 req/sec and 100/day per IP, 24h cache |
| Password check | `GET api.pwnedpasswords.com/range/{prefix}` | No | No stated limit |
| Scam URL | `GET api.phishdestroy.io/v1/check?url=` | No | Not published |
| Scam URL | `POST urlhaus-api.abuse.ch/v1/url/` | Free abuse.ch Auth-Key (`ABUSECH_AUTH_KEY`) | Fair use |
| Screenshot OCR | Optiic (`OPTIIC_ENDPOINT`) | Yes (`OPTIIC_API_KEY`) | Free tier, see optiic.dev |
| Connected apps | `GET admin.googleapis.com/admin/reports/v1/activity/users/all/applications/token` | Google OAuth | Workspace admin accounts only |
| Email alias | `POST proxiedmail.com/api/v1/proxy-bindings` | Yes (`PROXIEDMAIL_API_KEY`) | 10 aliases, 2,000 req/day |
| IP intel | `GET internetdb.shodan.io/{ip}` | No | No stated limit |
| IP intel | `GET api.abuseipdb.com/api/v2/check` | Yes (`ABUSEIPDB_KEY`) | 1,000 checks/day |
| IP intel | `GET api.greynoise.io/v3/community/{ip}` | No | Community rate limit |
| Malware URL / hash | `GET www.virustotal.com/api/v3/urls/{id}` and `/files/{hash}` | Yes (`VIRUSTOTAL_KEY`) | 4 req/min, 500/day |
| Malware hash | `POST mb-api.abuse.ch/api/v1/` | Free abuse.ch Auth-Key | Fair use |
| Subdomains | `GET crt.sh/?q=%.{domain}&output=json` | No | Often slow or rate limited |
| CVEs | `GET services.nvd.nist.gov/rest/json/cves/2.0` | Optional (`NVD_API_KEY`) | 5 req/30s without key, 50 with key |
| Packages | `POST api.osv.dev/v1/query` | No | No stated limit |
