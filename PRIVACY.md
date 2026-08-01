# Privacy

## Data Privacy Commitment

Onefend is a **self-hosted** platform. All data stays within your infrastructure. Onefend (the company) has **zero access** to your data, your users' data, or your organization's AI usage patterns.

### What data does Onefend process?

| Data | Where it's stored | Who has access |
|------|-------------------|----------------|
| User credentials (email, password hash) | Your PostgreSQL database | Your admins only |
| MFA secrets | Your PostgreSQL database | Your admins only |
| AI conversation metadata (platform, timestamp, risk level) | Your PostgreSQL database | Your admins only |
| Detection pattern matches (what triggered a policy) | Your PostgreSQL database | Your admins only |
| Extension enrollment tokens | Your PostgreSQL database | Your admins only |
| Cached analysis results | Your Redis instance | Your infrastructure only |
| Audit logs (admin actions) | Your PostgreSQL database | Your admins only |

### What Onefend does NOT do

- **No telemetry.** Onefend does not phone home, send analytics, or communicate with onefend.io or any external server. There is no telemetry, no usage tracking, and no crash reporting.
- **No data collection.** Onefend (the company) never sees, collects, or processes your data. We have no access to your instance, your database, or your users' activity.
- **No third-party sharing.** Your data is never shared with advertisers, analytics providers, or any third party by Onefend itself.
- **No cloud dependency for core features.** Onefend works fully offline with regex-based detection. No internet connection is required for the core platform.

### Google Cloud AI services (optional)

If you choose to enable AI-powered detection (Vertex AI, Cloud DLP, Document AI), the following applies:

- Data is sent to **your own GCP project** using **your own service account credentials**
- Onefend (the company) has no access to your GCP project or the data processed by these services
- Google's data processing terms apply to the data sent to GCP services (see [Google Cloud Privacy](https://cloud.google.com/terms/cloud-privacy-notice))
- You control which GCP region processes your data
- AI and DLP results are cached in your Redis instance to minimize external API calls
- You can disable GCP integration at any time by removing the credentials from your `.env` -- the platform continues to work with regex-only detection

### What the browser extension monitors

The Onefend browser extension monitors interactions with AI platforms (ChatGPT, Claude, Gemini, etc.) to enforce your organization's data loss prevention policies. Specifically:

- **What it intercepts:** Text input to AI chat interfaces, file attachments sent to AI tools, and network requests to AI API endpoints
- **What it does NOT intercept:** General browsing activity, non-AI websites, email, messaging apps, or any traffic not directed to monitored AI platforms
- **Where the data goes:** All intercepted data is sent to **your Onefend backend** (your server, your network) -- never to an external service unless you configured GCP AI

### Data retention

You control data retention through the Settings page in the dashboard:

- **Audit logs:** Configurable retention (default: 90 days)
- **Conversation events:** Configurable retention (default: 30 days)
- **Redis cache:** AI analysis (7 days), DLP results (24 hours), config (5 minutes)

Expired data is automatically deleted by the retention service. You can also manually delete data at any time through the database.

### Employee privacy considerations

If you are deploying Onefend to monitor your employees' AI usage, consider:

- **Inform your employees.** Best practice is to notify employees that AI tool usage is being monitored and that DLP policies are in effect. Many jurisdictions require this disclosure.
- **Data minimization.** Onefend only captures metadata and policy-triggering content from AI interactions, not general browsing or communication.
- **Access control.** Use role-based access (Admin, Analyst, Viewer) to limit who can see employee activity data.
- **Legal compliance.** Consult your legal team to ensure monitoring complies with local privacy laws (GDPR, CCPA, etc.) and your organization's acceptable use policies.

---

## Disclaimer

Onefend is provided "as-is" under the Apache License 2.0, without warranties or conditions of any kind. See the [LICENSE](LICENSE) file for the full legal text.

### Limitation of liability

In no event shall Onefend or its contributors be liable for any direct, indirect, incidental, special, exemplary, or consequential damages arising from the use or inability to use this software. This includes, but is not limited to:

- Data loss or corruption
- Security breaches resulting from misconfiguration
- Privacy violations resulting from improper deployment or monitoring practices
- Business interruption or loss of profits
- Regulatory fines or penalties

### Responsibility

The deploying organization is solely responsible for:

- **Proper configuration** of the platform, including security settings, TLS, firewall rules, and access controls
- **Legal compliance** with applicable privacy laws, labor laws, and regulations regarding employee monitoring in their jurisdiction
- **Data protection** of all data stored in their Onefend instance, including backups, encryption at rest, and access management
- **Employee notification** about the monitoring in accordance with applicable laws and company policies
- **Credential management** including GCP service account keys, JWT secrets, database passwords, and SMTP credentials
- **Updates and patching** to address security vulnerabilities in Onefend or its dependencies

### No warranty of detection

Onefend provides data loss prevention on a best-effort basis. No DLP system can guarantee 100% detection of sensitive data. Regex-based patterns may have false positives or false negatives. AI-powered detection improves accuracy but is not infallible. Organizations should not rely solely on Onefend as their only data protection measure.

### Open source nature

Onefend's source code is fully open and auditable. You are encouraged to review the code, security controls, and data handling practices before deployment. The [SECURITY.md](SECURITY.md) file contains the threat model and security architecture.
