import type { DocSection } from '../../../types';

export const seccionReportesIntegraciones: DocSection = {
  title: 'Reports and Integrations',
  chapters: [
    // ─── Manual 16: Integrations ─────────────────────────────────────────────
    {
      slug: 'integraciones',
      title: 'External integrations',
      description: 'How to connect Onefend with communication tools and SIEM systems.',
      blocks: [
        {
          type: 'h2',
          id: 'available-integrations',
          text: 'Available integrations',
        },
        {
          type: 'p',
          text: 'Onefend can send alerts and notifications to external tools when relevant events are detected. This allows your security team to be notified in the channels they already use, without needing to constantly monitor the dashboard.',
        },
        {
          type: 'table',
          headers: ['Integration', 'Type', 'What it\'s used for'],
          rows: [
            ['Slack', 'Notifications', 'Receive high-risk event alerts in a Slack channel.'],
            ['Microsoft Teams', 'Notifications', 'Same use as Slack, for organizations that use Teams as their main tool.'],
            ['SIEM / Syslog', 'Log forwarding', 'Send all Onefend events to your SIEM system (Splunk, QRadar, etc.) in Syslog format.'],
            ['Email', 'Alerts', 'Receive periodic reports and critical alerts via email.'],
          ],
        },
        {
          type: 'h2',
          id: 'configure-slack',
          text: 'Configure the Slack integration',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Settings → Integrations → Slack',
              description: 'In the administration panel, go to the Integrations section.',
            },
            {
              title: 'Authorize the application in your Slack workspace',
              description: 'Click on "Connect to Slack". A Slack workspace window will open to authorize the Onefend application.',
            },
            {
              title: 'Select the destination channel',
              description: 'Choose the Slack channel where alerts will be sent. It is recommended to use a channel dedicated to security.',
            },
            {
              title: 'Configure the alert threshold',
              description: 'Define from which risk level (HIGH, MEDIUM) notifications will be sent. Notifications for each LOW event usually generate counterproductive volume.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'configure-siem',
          text: 'Configure the SIEM / Syslog integration',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Settings → Integrations → SIEM',
              description: 'Select the Syslog/SIEM integration.',
            },
            {
              title: 'Enter your SIEM endpoint',
              description: 'Provide the IP address or hostname, port, and protocol (UDP or TCP) of your syslog collector.',
            },
            {
              title: 'Select the format',
              description: 'Choose the message format: CEF (Common Event Format) or standard Syslog format (RFC 5424).',
            },
            {
              title: 'Test the connection',
              description: 'Use the "Test connection" button to verify that Onefend can reach your collector before saving the configuration.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'The SIEM receives metadata, not content',
          text: 'Events sent to the SIEM contain event metadata (user, application, detected data type, action taken, risk level, timestamp) but not the content of the conversations.',
        },
        {
          type: 'h2',
          id: 'disconnect',
          text: 'Disconnecting an integration',
        },
        {
          type: 'p',
          text: 'You can disconnect any active integration from the same Integrations section. Once disconnected, Onefend immediately stops sending events to that destination. The configuration is not deleted and can be reconnected in the future.',
        },
      ],
    },

    // ─── Manual 17: Webhooks ──────────────────────────────────────────────────
    {
      slug: 'webhooks',
      title: 'Webhooks',
      description: 'How to configure webhooks to send events to your own systems.',
      blocks: [
        {
          type: 'h2',
          id: 'what-are-webhooks',
          text: 'What are Onefend webhooks?',
        },
        {
          type: 'p',
          text: 'Webhooks allow Onefend to send automatic notifications to any external system of your choice in real time as events are generated on the platform. Unlike pre-built integrations (Slack, Teams), webhooks are flexible and can connect to any system with an HTTP endpoint.',
        },
        {
          type: 'p',
          text: 'Some common use cases: sending events to an internal incident management system, triggering automation flows in n8n or Zapier, or feeding a customized organization dashboard.',
        },
        {
          type: 'h2',
          id: 'create-webhook',
          text: 'How to create a webhook',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Settings → Webhooks → New Webhook',
              description: 'In the administration panel, navigate to the Webhooks section.',
            },
            {
              title: 'Enter the destination URL',
              description: 'Provide the HTTPS endpoint of your system that will receive the events. Onefend requires HTTPS for all webhooks.',
            },
            {
              title: 'Select the events that will trigger the webhook',
              description: 'You can subscribe to specific types of events: blocks only, high-risk events only, all events, etc.',
            },
            {
              title: 'Configure the validation secret (recommended)',
              description: 'Enter a secret key that Onefend will include in each request. Your system can use this key to verify that the message comes from Onefend. See the "Webhook validation" section below.',
            },
            {
              title: 'Test and activate',
              description: 'Use the "Send test event" button to verify that your endpoint correctly receives and processes the message before activating the webhook.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'payload-structure',
          text: 'Payload structure',
        },
        {
          type: 'p',
          text: 'Each event sent by webhook includes the following fields:',
        },
        {
          type: 'list',
          items: [
            'event_id: unique identifier of the event.',
            'timestamp: date and time of the event in ISO 8601 (UTC) format.',
            'tenant_id: identifier of your organization.',
            'user_email: email of the user who generated the event.',
            'application: name of the involved AI platform.',
            'risk_level: HIGH, MEDIUM, or LOW.',
            'action_taken: BLOCK, WARN, LOG, or ALLOW.',
            'data_types_detected: list of data categories detected in the event.',
          ],
        },
        {
          type: 'h2',
          id: 'validation',
          text: 'Webhook validation',
        },
        {
          type: 'p',
          text: 'If you configured a validation secret when creating the webhook, Onefend will include a signature header in each request. Your system can use this signature to verify that the message genuinely comes from the platform and has not been altered in transit. Consult your destination platform\'s technical documentation to implement this verification.',
        },
        {
          type: 'h2',
          id: 'retries',
          text: 'Retry policy',
        },
        {
          type: 'p',
          text: 'If your endpoint does not respond or returns an error, Onefend will automatically retry sending with an increasing interval. If the endpoint still does not respond after several retries, the event is marked as failed and recorded in the webhook log for your review.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Review your webhook delivery log',
          text: 'From Settings → Webhooks → webhook detail, you can see the delivery history: which events were sent, which succeeded, and which failed. Useful for diagnosing connectivity issues with your endpoint.',
        },
      ],
    },

    // ─── Manual 18: Report Generation ────────────────────────────────────
    {
      slug: 'generacion-reportes',
      title: 'Reports',
      description: 'How to generate, schedule, and export activity reports.',
      blocks: [
        {
          type: 'h2',
          id: 'report-types',
          text: 'Available report types',
        },
        {
          type: 'p',
          text: 'The Onefend Reports module allows you to generate consolidated documents with the platform\'s activity for a given period. The reports are designed to be shared with different profiles: from executives who need an executive summary to auditors who require operational detail.',
        },
        {
          type: 'table',
          headers: ['Report type', 'For whom', 'Content'],
          rows: [
            ['Executive summary', 'Management, CISO', 'Activity KPIs: event volume, trends, most used applications, users with the highest activity.'],
            ['Activity by user', 'Human Resources, legal area', 'Event detail by individual user in the period.'],
            ['Activity by application', 'IT, security', 'Distribution of use by AI tool, events by application.'],
            ['High-risk events', 'Security team', 'Only events classified as HIGH with a summary of the involved data types.'],
            ['Application inventory', 'IT', 'List of all detected applications with their status and risk score.'],
          ],
        },
        {
          type: 'h2',
          id: 'generate-report',
          text: 'How to generate a report',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Reports → New Report',
              description: 'In the dashboard, navigate to the Reports section.',
            },
            {
              title: 'Select the report type',
              description: 'Choose from the available report types according to the recipient and purpose.',
            },
            {
              title: 'Define the period',
              description: 'Select the date range the report should cover.',
            },
            {
              title: 'Apply additional filters (optional)',
              description: 'You can narrow the report down to specific users, groups, or applications.',
            },
            {
              title: 'Generate and download',
              description: 'Click on "Generate". The report is prepared and can be downloaded in PDF or CSV.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'schedule-report',
          text: 'Schedule periodic reports',
        },
        {
          type: 'p',
          text: 'You can configure a report to be generated and sent automatically by email to defined recipients at the frequency you need: weekly, monthly, or customized. Scheduled reports are configured from Reports → Scheduled → New Scheduled Report.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Automated monthly executive report',
          text: 'To simplify communication with management, configure an "Executive Summary" type report to be automatically sent on the first business day of each month with the previous month\'s data.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Reports reflect the data available at the time of generation',
          text: 'If you generate a report and then data expires and is deleted by the retention policy, future generations of the same report for a past period will not include that data. Export and save the reports you need to keep.',
        },
      ],
    },

    // ─── Manual 19: Dashboards and Visualization ────────────────────────────────
    {
      slug: 'dashboards-visualizacion',
      title: 'Dashboards',
      description: 'How to use and configure real-time monitoring dashboards.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-dashboard',
          text: 'The dashboards panel',
        },
        {
          type: 'p',
          text: 'Onefend dashboards offer a consolidated and visual overview of platform activity in real time. They are designed for continuous operational monitoring and to have a quick read of the organization\'s security posture.',
        },
        {
          type: 'h2',
          id: 'available-widgets',
          text: 'Available widgets',
        },
        {
          type: 'table',
          headers: ['Widget', 'What it shows'],
          rows: [
            ['Events by risk level', 'Distribution of HIGH / MEDIUM / LOW events in the selected period.'],
            ['Most used applications', 'The AI platforms with the highest activity volume in your organization.'],
            ['Most active users', 'The users who generated the most events in the period.'],
            ['Activity trend', 'Timeline with the total event volume per day.'],
            ['Actions taken', 'Proportion of events by action: BLOCK, WARN, LOG, ALLOW.'],
            ['Active devices', 'Number of active and synchronized extensions at the moment.'],
          ],
        },
        {
          type: 'h2',
          id: 'customize-dashboard',
          text: 'Customizing the dashboard',
        },
        {
          type: 'p',
          text: 'You can reorganize the dashboard widgets to prioritize the information that matters most to you. Click on "Edit dashboard" to access customization mode, where you can drag, resize, and hide widgets.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Dashboard changes are per user',
          text: 'Dashboard customization is individual: each dashboard user can have their own widget configuration without affecting others\' views.',
        },
        {
          type: 'h2',
          id: 'time-range',
          text: 'Time range selector',
        },
        {
          type: 'p',
          text: 'The range selector at the top of the dashboard applies to all widgets simultaneously. You can view the activity of the last 24 hours, the last 7 days, the last 30 days, or define a customized range.',
        },
        {
          type: 'h2',
          id: 'share-dashboard',
          text: 'Sharing the dashboard',
        },
        {
          type: 'p',
          text: 'You can generate a read-only link to the current state of the dashboard to share it with people who do not have access to the panel (for example, executives who are not Onefend users). The link expires in 24 hours for security reasons.',
        },
        {
          type: 'h2',
          id: 'viewer-access',
          text: 'Viewer user access',
        },
        {
          type: 'p',
          text: 'Users with the VIEWER role have direct access to the Dashboards module. It is the only section of the panel they can access. This allows executives or external auditors with limited access to have high-level visibility without accessing detailed operational data.',
        },
      ],
    },

    // ─── Manual 20: Analytics and Advanced Metrics ────────────────────────────
    {
      slug: 'analytics-metricas-avanzadas',
      title: 'Advanced Analytics',
      description: 'Usage metrics, trends, and deep analysis tools.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-analytics',
          text: 'The Analytics module',
        },
        {
          type: 'p',
          text: 'The Analytics module complements the dashboard with deeper analyzes and tools to identify trends, behavioral patterns, and situations that might not be evident in daily operational monitoring.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Access available for ADMIN and ANALYST',
          text: 'The Analytics module is available to users with ADMIN and ANALYST roles. VIEWER users only have access to basic dashboards.',
        },
        {
          type: 'h2',
          id: 'available-metrics',
          text: 'Available metrics',
        },
        {
          type: 'table',
          headers: ['Metric', 'What it\'s used for'],
          rows: [
            ['Event rate per user', 'Identify users with unusual activity volumes compared to the organizational average.'],
            ['Distribution by application', 'Understand which AI tools predominate in corporate use.'],
            ['Risk temporal evolution', 'See if the activity\'s risk level increases or decreases over time.'],
            ['Policy effectiveness', 'See how many events each policy is generating and if the action taken is as expected.'],
            ['Device coverage', 'Percentage of active devices relative to registered users.'],
          ],
        },
        {
          type: 'h2',
          id: 'anomaly-detection',
          text: 'Atypical behavior detection',
        },
        {
          type: 'p',
          text: 'Onefend analyzes your organization\'s activity patterns and identifies behaviors that deviate from the usual average. When it detects an anomaly — for example, a user who suddenly multiplies their activity or accesses a tool they had never used — it generates an alert in the Analytics module so the security team can investigate it.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Anomaly alerts are informational',
          text: 'An atypical behavior alert does not necessarily imply a security incident. It can have legitimate causes: a new project, a department change, or the use of an authorized but uncommon tool. The security team determines if the behavior requires attention.',
        },
        {
          type: 'h2',
          id: 'export-analytics',
          text: 'Exporting analytics data',
        },
        {
          type: 'p',
          text: 'Analytics data can be exported in CSV format for processing in external analysis tools (spreadsheets, BI tools, etc.). The export includes aggregated data for the selected period, not individual events.',
        },
        {
          type: 'h2',
          id: 'recommended-use',
          text: 'Recommended use of the module',
        },
        {
          type: 'list',
          items: [
            'Weekly review of key metrics to detect trends before they become problems.',
            'Monthly analysis of policy effectiveness: are they generating the expected blocks and warnings?',
            'Review of device coverage: do all users have the active extension?',
            'Identification of emerging applications: are there new AI tools that your employees are testing?',
          ],
        },
      ],
    },
  ],
};
