import type { DocSection } from '../../../types';

export const seccionPrimerosPasos: DocSection = {
  title: 'Getting Started',
  chapters: [
    // ─── Manual 01: Platform overview ──────────────────────────────────
    {
      slug: 'platform-overview',
      title: 'Introduction to Onefend',
      description: 'What Onefend is, the problem it solves, and how it fits into your organization.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-onefend',
          text: 'What is Onefend?',
        },
        {
          type: 'p',
          text: 'Onefend is a governance and security platform for the use of artificial intelligence in the corporate environment. Its main function is to provide visibility and control over how your organization\'s employees use external AI tools — such as ChatGPT, Claude, Gemini, or Perplexity — from their work devices.',
        },
        {
          type: 'h2',
          id: 'the-problem',
          text: 'The problem it solves',
        },
        {
          type: 'p',
          text: 'When employees use external AI tools without supervision, the organization loses visibility into what information leaves its systems. Contracts, customer data, source code, credentials, and internal strategies can be sent to external platforms without anyone on the security team knowing. This phenomenon is known as Shadow AI.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Shadow AI and Shadow SaaS',
          text: 'Shadow AI occurs when employees adopt external AI tools without corporate approval. Shadow SaaS is the broader phenomenon of using any unauthorized application. Onefend addresses both from a single platform.',
        },
        {
          type: 'h2',
          id: 'how-it-works',
          text: 'How Onefend works',
        },
        {
          type: 'p',
          text: 'The platform operates through three components that work together:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Browser Extension',
              description: 'A lightweight agent installed in Chrome or Edge that analyzes the content the user types before submitting it to any AI platform. It operates in the background without modifying the user experience.',
            },
            {
              title: 'Analysis Engine',
              description: 'Evaluates content in real time to detect patterns of sensitive data: personal information, credentials, financial data, proprietary code, and more. Applies the policy defined by your organization for each case.',
            },
            {
              title: 'Administration Dashboard',
              description: 'The web portal from which administrators configure policies, manage users and applications, monitor events in real time, and generate activity reports.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'for-whom',
          text: 'Who is this platform for?',
        },
        {
          type: 'table',
          headers: ['Role', 'What they do in Onefend'],
          rows: [
            ['Administrator', 'Configures the platform, manages users, defines policies, and reviews reports.'],
            ['Security Analyst', 'Monitors events, investigates incidents, and queries conversation history.'],
            ['Viewer', 'Consults dashboards and reports without the ability to modify the configuration.'],
            ['End User', 'Works normally; Onefend acts in the background. They only notice it when an active policy requires their attention.'],
          ],
        },
        {
          type: 'h2',
          id: 'key-benefits',
          text: 'Key benefits',
        },
        {
          type: 'list',
          items: [
            'Complete visibility into what AI tools your company uses and who uses them.',
            'Granular control by user, group, or the entire organization.',
            'Detection of sensitive data before it leaves your systems.',
            'Immutable record of events for internal auditing and reporting.',
            'Implementation with no changes to the existing infrastructure.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compatibility with your current stack',
          text: 'Onefend does not require modifying your network, your servers, or your current tools. The browser extension is sufficient for most use cases.',
        },
      ],
    },

    // ─── Manual 02: Access and Initial Configuration ────────────────────────────
    {
      slug: 'access-initial-configuration',
      title: 'Access and Initial Configuration',
      description: 'How to access the dashboard, configure your account, and enroll the first devices.',
      blocks: [
        {
          type: 'h2',
          id: 'first-access',
          text: 'First access to the dashboard',
        },
        {
          type: 'p',
          text: 'The Onefend team will provide you the access credentials to the administration portal during the onboarding process. With those credentials, the designated administrator logs into the dashboard for the first time and configures the organization.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Log in to the portal',
              description: 'Log in with your corporate email and the provided password. If your organization has single sign-on (SSO) enabled, you can use it directly.',
            },
            {
              title: 'Set up two-factor authentication (MFA)',
              description: 'Upon first login, the system will ask you to set up two-factor authentication using an authenticator app (TOTP). This step is mandatory for accounts with the Administrator role.',
            },
            {
              title: 'Review your organization\'s configuration',
              description: 'Verify that your organization\'s name, domain, and time zone are correct. This data affects the presentation of events and reports.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Guard your credentials',
          text: 'Administrator credentials grant full access to the platform\'s configuration and activity logs for the entire organization. Do not share them and make sure to activate MFA on your first login.',
        },
        {
          type: 'h2',
          id: 'token-enrollment',
          text: 'Generating the enrollment token',
        },
        {
          type: 'p',
          text: 'In order for a user\'s browser extension to be linked to your organization, it needs an enrollment token. This token is unique per organization and is generated from the administration dashboard.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Settings → Devices',
              description: 'In the side menu of the dashboard, access the Devices section.',
            },
            {
              title: 'Generate a new token',
              description: 'Click on "New Enrollment Token". You can create tokens with an expiration date for greater control.',
            },
            {
              title: 'Distribute the token to your users',
              description: 'Share the token securely with the users who must install the extension. Each user will enter it in the extension upon first use.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'extension-installation',
          text: 'Extension Installation',
        },
        {
          type: 'p',
          text: 'Once the user has the token, the installation process is as follows:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Install the extension from Chrome Web Store',
              description: 'Search for "Onefend" in the Chrome Web Store or access the link provided by your administrator. Click "Add to Chrome".',
            },
            {
              title: 'Enter the enrollment token',
              description: 'When opening the extension for the first time, the system will ask for the token provided by your administrator. Enter it and confirm.',
            },
            {
              title: 'Automatic verification',
              description: 'The extension connects to the backend and registers the device. In seconds, the device appears in the administrator dashboard as active.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Mass deployment',
          text: 'For organizations that need to install the extension on many devices at once, Onefend offers configuration via Group Policy (GPO) for Windows and MDM profiles for macOS. Contact the support team to obtain the corresponding configuration files.',
        },
        {
          type: 'h2',
          id: 'verify-installation',
          text: 'Verify everything is working',
        },
        {
          type: 'p',
          text: 'Once the extension is installed and the token is configured, you can confirm that everything is operational in the following ways:',
        },
        {
          type: 'list',
          items: [
            'The device appears in Settings → Devices with the status "Active".',
            'The extension icon in the browser shows a green indicator.',
            'When accessing a monitored AI platform, the event appears in the real-time Events dashboard.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'The user does not notice the extension in normal use',
          text: 'Except when an active policy requires displaying a warning or blocking an action, the end user does not perceive any change in their experience using AI tools.',
        },
      ],
    },
  ],
};
