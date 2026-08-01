export default function PrivacyPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAF7FF',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{
                background: '#FFFFFF',
                borderBottom: '1px solid rgba(212, 200, 255, 0.5)',
                padding: '20px 0',
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="24" height="24" viewBox="0 0 32 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.7395 31.2277V54H31.8877V18.2621L7.99512 29.4534V38.3914L23.7395 31.2277Z" fill="#6466FF" />
                        <path d="M31.8877 0L0 14.1414V23.3076L31.8877 9.16438V0Z" fill="#6466FF" />
                    </svg>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#1E1B39', letterSpacing: '-0.3px' }}>Onefend</span>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1E1B39', marginBottom: '8px' }}>Privacy Policy</h1>
                <p style={{ fontSize: '14px', color: '#A5AEB7', marginBottom: '40px' }}>Last updated: April 22, 2026</p>

                <div style={{ fontSize: '15px', color: '#1E1B39', lineHeight: 1.8 }}>

                    <Section title="1. Introduction">
                        <p>
                            Onefend (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides an AI security and data loss prevention (DLP) platform
                            that helps organizations protect sensitive data from being shared with AI chatbots and other web-based AI tools.
                        </p>
                        <p>
                            This Privacy Policy covers all Onefend products and services, including:
                        </p>
                        <ul>
                            <li>The <strong>Onefend Browser Extension</strong> (available for Chrome, Edge, Brave, Firefox, and other browsers)</li>
                            <li>The <strong>Onefend Admin Dashboard</strong> (app.onefend.io)</li>
                            <li>The <strong>Onefend Website</strong> (onefend.io)</li>
                            <li>The <strong>Onefend Desktop Agent</strong> (when available)</li>
                        </ul>
                        <p>
                            If your employer or organization has deployed the Onefend Browser Extension or Desktop Agent on your device,
                            your use of our Services is governed by your organization&apos;s agreement with us and your organization&apos;s own
                            workplace policies. We recommend contacting your organization&apos;s IT or security team for information about
                            how they use our Services.
                        </p>
                    </Section>

                    <Section title="2. Our Role: Data Processor">
                        <p>
                            Onefend provides its Services to enterprise customers (&quot;Customers&quot;). When we process data through our
                            Services on behalf of a Customer, we act as a <strong>data processor</strong> and our Customer acts as the
                            <strong> data controller</strong>.
                        </p>
                        <p>
                            This means:
                        </p>
                        <ul>
                            <li>Our Customers determine what data is monitored and what security policies apply</li>
                            <li>We process data only as instructed by our Customers and as described in our service agreement</li>
                            <li>We do not use end user data for our own purposes beyond providing the Services</li>
                            <li>Our Customers are responsible for notifying their employees about the use of our Services</li>
                        </ul>
                    </Section>

                    <Section title="3. What the Browser Extension Does">
                        <p>
                            The Onefend Browser Extension is deployed by your organization&apos;s IT administrator as part of their
                            data security program. The extension:
                        </p>
                        <ul>
                            <li><strong>Monitors interactions with AI platforms</strong> — Detects when users submit text, files, or images to AI chatbots such as ChatGPT, Claude, Gemini, DeepSeek, and others</li>
                            <li><strong>Performs automated analysis</strong> — Scans content in real-time to detect sensitive data including personally identifiable information (PII), credentials, financial data, and intellectual property</li>
                            <li><strong>Enforces security policies</strong> — Based on your organization&apos;s configuration, the extension may block, warn, redact, or allow interactions with AI platforms</li>
                            <li><strong>Logs security events</strong> — Records metadata about policy enforcement actions for audit purposes</li>
                        </ul>
                    </Section>

                    <Section title="4. Data We Collect and Process">
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#6466FF', margin: '16px 0 8px' }}>4.1 Content Data (Processed on behalf of your organization)</h3>
                        <p>
                            When you interact with a monitored AI platform, the extension captures the text you are about to
                            submit and performs the following processing:
                        </p>
                        <ul>
                            <li><strong>Local pre-redaction:</strong> Sensitive data patterns (credit card numbers, SSNs, API keys, etc.) are detected and redacted locally in your browser BEFORE any data leaves your device</li>
                            <li><strong>Server-side redaction:</strong> Upon reaching our backend, a second layer of automated redaction is applied to detect and remove any remaining sensitive data that may not have been caught by the local patterns</li>
                            <li><strong>Risk analysis:</strong> Only after both redaction layers have been applied, the sanitized text is analyzed by our AI engine to determine risk level and content category</li>
                            <li><strong>Transient processing:</strong> The text content is processed in real-time and is NOT persistently stored. It is discarded immediately after analysis</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#6466FF', margin: '16px 0 8px' }}>4.2 Security Event Metadata (Stored for audit)</h3>
                        <p>
                            We store metadata about security events, including:
                        </p>
                        <ul>
                            <li>Type of sensitive data detected (e.g., &quot;PII,&quot; &quot;Credentials,&quot; &quot;Financial&quot;) — but NOT the actual sensitive data</li>
                            <li>Risk level assessment (Low, Medium, High, Critical)</li>
                            <li>Action taken (Allowed, Warned, Blocked, Redacted)</li>
                            <li>AI platform where the interaction occurred (e.g., &quot;ChatGPT,&quot; &quot;Claude&quot;)</li>
                            <li>Timestamp of the event</li>
                            <li>Length of the input (character count, not the content itself)</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#6466FF', margin: '16px 0 8px' }}>4.3 Device and Account Data</h3>
                        <ul>
                            <li><strong>Enrollment information:</strong> Email address or username provided during device setup</li>
                            <li><strong>Device information:</strong> Browser type and version, operating system, extension version</li>
                            <li><strong>Browsing domains:</strong> The domains of websites you visit are checked against your organization&apos;s security policies. Full URLs are not stored</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#6466FF', margin: '16px 0 8px' }}>4.4 Website Visitor Data</h3>
                        <p>
                            When you visit our websites (onefend.io, app.onefend.io), we may collect:
                        </p>
                        <ul>
                            <li>Information you provide through contact or demo request forms</li>
                            <li>Standard web analytics data (pages visited, referrer, browser type)</li>
                            <li>Cookies as described in our Cookie section below</li>
                        </ul>
                    </Section>

                    <Section title="5. How We Handle Sensitive Content">
                        <p>
                            We want to be transparent about how we handle sensitive data detected by our Services:
                        </p>
                        <ul>
                            <li><strong>We do NOT store the original text</strong> you type into AI chatbots</li>
                            <li><strong>We do NOT store detected PII, passwords, or financial data.</strong> These are identified, used for real-time risk assessment, and immediately discarded</li>
                            <li><strong>We do NOT read your content.</strong> All analysis is performed by automated systems without human review</li>
                            <li><strong>We store only metadata</strong> about security events (category of detection, risk level, action taken) for your organization&apos;s audit and compliance needs</li>
                            <li><strong>Two layers of redaction</strong> protect your data: first locally in your browser (known sensitive patterns are replaced with category labels), then a second automated redaction on our backend before any AI analysis occurs</li>
                        </ul>
                    </Section>

                    <Section title="6. Data Retention">
                        <ul>
                            <li><strong>Content/text data:</strong> Not retained. Processed in real-time and discarded immediately after analysis</li>
                            <li><strong>Security event metadata:</strong> Retained according to your organization&apos;s configuration (default: 30 days). Your organization&apos;s administrator can configure retention periods</li>
                            <li><strong>Device and account data:</strong> Retained while the device is active. Deleted upon device revocation or account termination</li>
                            <li><strong>Website analytics:</strong> Retained for up to 12 months</li>
                        </ul>
                        <p>
                            Upon termination of a Customer&apos;s agreement, all Customer Data is deleted within 30 days.
                        </p>
                    </Section>

                    <Section title="7. Data Sharing">
                        <p>We do not sell, rent, or trade end user data. We may share data only in the following circumstances:</p>
                        <ul>
                            <li><strong>With your organization:</strong> Security event data and reports are available to your organization&apos;s administrators through the Onefend dashboard</li>
                            <li><strong>Service providers:</strong> We use trusted third-party services for infrastructure hosting (Google Cloud Platform), email delivery (SendGrid), and AI analysis. These providers process data on our behalf under strict contractual obligations</li>
                            <li><strong>Legal requirements:</strong> We may disclose data if required by law, regulation, or valid legal process</li>
                        </ul>
                    </Section>

                    <Section title="8. Security Measures">
                        <p>We implement comprehensive security measures to protect data:</p>
                        <ul>
                            <li>All data in transit is encrypted using TLS 1.2+</li>
                            <li>Data at rest is encrypted using AES-256</li>
                            <li>Authentication tokens are hashed using bcrypt and never stored in plaintext</li>
                            <li>Access to production systems is restricted and audit-logged</li>
                            <li>Infrastructure is hosted on Google Cloud Platform with SOC 2 compliance</li>
                            <li>Regular security assessments and code reviews are performed</li>
                        </ul>
                    </Section>

                    <Section title="9. Your Rights">
                        <p>
                            Depending on your jurisdiction, you may have the following rights:
                        </p>
                        <ul>
                            <li>Right to access, correct, or delete your personal data</li>
                            <li>Right to restrict or object to processing</li>
                            <li>Right to data portability</li>
                            <li>Right to withdraw consent (where applicable)</li>
                        </ul>
                        <p>
                            If the Onefend extension was deployed by your employer, please direct data access requests to your
                            organization&apos;s IT or privacy team, as they are the data controller. For data we collect directly
                            (e.g., website visitors), please contact us at the address below.
                        </p>
                    </Section>

                    <Section title="10. Cookies">
                        <p>
                            Our websites use cookies for authentication (session cookies for logged-in users) and basic analytics.
                            We do not use third-party advertising cookies. The browser extension does not use cookies.
                        </p>
                    </Section>

                    <Section title="11. Children's Privacy">
                        <p>
                            Our Services are designed for enterprise use and are not directed at children under 16.
                            We do not knowingly collect personal data from children.
                        </p>
                    </Section>

                    <Section title="12. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to time. We will notify Customers of material changes
                            through the Onefend dashboard or by email. The &quot;Last updated&quot; date at the top of this page indicates
                            when the policy was last revised.
                        </p>
                    </Section>

                    <Section title="13. Contact Us">
                        <p>
                            If you have questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <p>
                            <strong>Onefend</strong><br />
                            Email: privacy@onefend.io<br />
                            Website: <a href="https://onefend.io" style={{ color: '#6466FF' }}>onefend.io</a>
                        </p>
                    </Section>

                </div>

                {/* Footer */}
                <div style={{
                    borderTop: '1px solid rgba(212, 200, 255, 0.5)',
                    marginTop: '48px',
                    paddingTop: '24px',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '12px', color: '#A5AEB7' }}>
                        &copy; {new Date().getFullYear()} Onefend. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '32px' }}>
            <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1E1B39',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '2px solid #6466FF',
                display: 'inline-block',
            }}>
                {title}
            </h2>
            <div style={{ color: '#3D3A50', lineHeight: 1.8 }}>
                {children}
            </div>
        </div>
    );
}
