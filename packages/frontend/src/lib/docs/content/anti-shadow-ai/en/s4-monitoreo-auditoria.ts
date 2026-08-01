import type { DocSection } from '../../../types';

export const seccionMonitoreoAuditoria: DocSection = {
  title: 'Monitoring and Auditing',
  chapters: [
    // ─── Manual 09: Event Monitoring ──────────────────────────────────────
    {
      slug: 'monitoreo-eventos',
      title: 'Event Monitoring',
      description: 'How to use the event dashboard to oversee activity in real time.',
      blocks: [
        {
          type: 'h2',
          id: 'event-panel',
          text: 'The Events dashboard',
        },
        {
          type: 'p',
          text: 'The Events dashboard is Onefend\'s central operations view. It displays in real time all the interactions that the extension has recorded on your organization\'s devices. From here you can oversee activity, investigate specific situations, and export data for external analysis.',
        },
        {
          type: 'h2',
          id: 'available-filters',
          text: 'Available filters',
        },
        {
          type: 'table',
          headers: ['Filter', 'Options'],
          rows: [
            ['User', 'Search by name or email to view the activity of a specific person.'],
            ['Application', 'Filter by AI platform (ChatGPT, Claude, Gemini, etc.).'],
            ['Risk level', 'HIGH, MEDIUM, LOW.'],
            ['Action taken', 'BLOCK, WARN, LOG, ALLOW.'],
            ['Date range', 'Queries up to 90 days in a single search.'],
            ['Detected data type', 'Filter by the data category that triggered the event.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Combine filters for specific investigations',
          text: 'To investigate the behavior of a specific user in a given period, combine the User filter with a narrow date range. You can export the filtered result as a CSV directly from the view.',
        },
        {
          type: 'h2',
          id: 'event-detail',
          text: 'Event details',
        },
        {
          type: 'p',
          text: 'Clicking on any event in the list opens the detail panel with the following information:',
        },
        {
          type: 'list',
          items: [
            'User who generated the event and device from which they operated.',
            'AI application involved.',
            'Date and time of the event.',
            'Detected data type and assigned risk level.',
            'Action taken by the platform (BLOCK, WARN, LOG, ALLOW).',
            'Policy that generated the action.',
            'Redacted evidence: fragment of the content with sensitive data hidden.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Evidence is always redacted',
          text: 'The dashboard never shows the original content in plain text. What is shown is a version where detected sensitive data have been replaced by markers. This protects user privacy and complies with the principle of minimum data exposure.',
        },
        {
          type: 'h2',
          id: 'export-events',
          text: 'Export events',
        },
        {
          type: 'p',
          text: 'The "Export CSV" button in the dashboard header generates a file with all visible events according to the active filters at that moment. The exported fields include all event metadata but not the content of the conversations.',
        },
        {
          type: 'h2',
          id: 'access-by-role',
          text: 'Access to the dashboard according to role',
        },
        {
          type: 'table',
          headers: ['Role', 'Access to events'],
          rows: [
            ['ADMIN', 'All events of all users.'],
            ['ANALYST', 'All events of all users.'],
            ['VIEWER', 'Does not have access to the individual events dashboard. Only views macro dashboards.'],
            ['USER', 'Can only view their own events from their profile.'],
          ],
        },
      ],
    },

    // ─── Manual 10: Conversation analysis ─────────────────────────────────
    {
      slug: 'analisis-conversaciones',
      title: 'Conversation analysis',
      description: 'How to thoroughly review interactions with AI tools.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-analysis',
          text: 'What is conversation analysis?',
        },
        {
          type: 'p',
          text: 'The Conversation Analysis module allows you to review in detail the interactions that generated events on the platform. Unlike the events dashboard — which shows a list of incidents — this module groups events by conversation session and allows you to view the full context of each interaction.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Only conversations with events are analyzed',
          text: 'Onefend does not capture or store complete conversations. Only evidence of exchanges that generated an event (sensitive data detection) is recorded. Conversations without detections are not stored.',
        },
        {
          type: 'h2',
          id: 'how-to-access',
          text: 'How to access the analysis',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Open the Events dashboard',
              description: 'Locate the event you want to investigate in the event list.',
            },
            {
              title: 'Click on "View conversation"',
              description: 'In the event detail, you will find the "View conversation" button if the event is part of a recorded session.',
            },
            {
              title: 'Review the redacted evidence',
              description: 'The conversation viewer shows the exchange fragment with sensitive data replaced by markers. Detected data types are highlighted.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'available-data',
          text: 'Information available in the analysis',
        },
        {
          type: 'list',
          items: [
            'AI platform used in the conversation.',
            'User and device involved.',
            'Date, time, and approximate duration of the session.',
            'Detected data types throughout the conversation.',
            'Actions taken by the platform in each fragment.',
            'Consolidated risk level of the conversation.',
          ],
        },
        {
          type: 'h2',
          id: 'mark-for-review',
          text: 'Flag conversations for follow-up',
        },
        {
          type: 'p',
          text: 'You can mark a conversation as "Reviewed", "In follow-up", or "Escalated" to manage your investigation workflow. A conversation\'s status is visible to all users with access to the analysis module.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Access restricted to Analyst and Admin',
          text: 'The Conversation Analysis module is only available to ADMIN and ANALYST roles. Users with VIEWER or USER role do not have access.',
        },
      ],
    },

    // ─── Manual 11: Auditing and compliance ────────────────────────────────────
    {
      slug: 'auditoria-compliance',
      title: 'Auditing and compliance',
      description: 'Administrative audit logs and their usage for review and compliance processes.',
      blocks: [
        {
          type: 'h2',
          id: 'audit-logs',
          text: 'Administrative audit logs',
        },
        {
          type: 'p',
          text: 'Audit logs record all actions performed by administrators within the Onefend dashboard: creation and modification of policies, changes to users and roles, global configuration adjustments, and access to the conversation analysis module.',
        },
        {
          type: 'p',
          text: 'These records are immutable: no administrator can edit or delete them. They are saved for the configured retention period (90 days by default) and can be exported at any time.',
        },
        {
          type: 'table',
          headers: ['Audited action type', 'Examples'],
          rows: [
            ['User management', 'Creation, modification, deactivation, and deletion of users.'],
            ['Changes in DLP policies', 'Creation, editing, activation, and deactivation of policies.'],
            ['Changes in global configuration', 'Modification of data retention, whitelist, time zone.'],
            ['Application management', 'Application status change (approve, block, etc.).'],
            ['Access to sensitive data', 'Opening the conversation analysis module.'],
            ['Integrations management', 'Configuration and disconnection of external integrations.'],
          ],
        },
        {
          type: 'h2',
          id: 'access-audit',
          text: 'How to access audit logs',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Access Auditing in the main menu',
              description: 'Only users with the ADMIN role can access audit logs.',
            },
            {
              title: 'Apply filters if necessary',
              description: 'You can filter by the administrator who performed the action, type of action, and date range.',
            },
            {
              title: 'Export if needed',
              description: 'Use the "Export" button to download the filtered logs in CSV or JSON for external processing.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'use-in-audits',
          text: 'Log usage in review processes',
        },
        {
          type: 'p',
          text: 'Audit logs are a useful tool to demonstrate that the platform is being managed in a controlled and traceable manner. For internal review processes or external auditors, you can export the logs for the relevant period and pair them with conversation events exported from the Events dashboard.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Audit logs do not replace your legal team',
          text: 'Onefend provides technical activity records. How to utilize them in the context of a specific regulatory process is a decision for your organization\'s legal and compliance team.',
        },
      ],
    },

    // ─── Manual 13: System logs and diagnostics ────────────────────────────
    {
      slug: 'logs-sistema-diagnostico',
      title: 'System logs and diagnostics',
      description: 'How to interpret system logs and report issues to support.',
      blocks: [
        {
          type: 'h2',
          id: 'purpose',
          text: 'What are system logs used for?',
        },
        {
          type: 'p',
          text: 'System logs record the technical status of the platform: device connections, synchronization errors, event processing failures, and operation warnings. Unlike audit logs (which record administrator actions), system logs are technical in nature and oriented towards diagnostics.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Only ADMIN has access to system logs',
          text: 'System logs contain internal technical information of the platform\'s operation. Access is restricted to the Administrator role.',
        },
        {
          type: 'h2',
          id: 'log-levels',
          text: 'Log levels',
        },
        {
          type: 'table',
          headers: ['Level', 'Meaning'],
          rows: [
            ['INFO', 'Normal operating events: successful synchronizations, device connections, processed events.'],
            ['WARN', 'Situations that merit attention but do not prevent operation: high latency, synchronization retries.'],
            ['ERROR', 'Errors disrupting operations: devices unable to connect, incorrectly processed events.'],
          ],
        },
        {
          type: 'h2',
          id: 'common-issues',
          text: 'Common issues and what to do',
        },
        {
          type: 'table',
          headers: ['Observed symptom', 'Recommended action'],
          rows: [
            ['A device appears as "Offline" for more than 24 hours.', 'Verify with the user that the extension is installed and active. If their browser is closed, the device cannot synchronize.'],
            ['A user\'s events stop appearing.', 'Verify the device status under Settings → Devices. Generating a new enrollment token may be required.'],
            ['A newly added policy does not seem to apply to a device.', 'Force a synchronization from the dashboard and wait for the next cycle. If it persists, ensure the user belongs to the assigned policy group.'],
          ],
        },
        {
          type: 'h2',
          id: 'contact-support',
          text: 'How to report an issue to support',
        },
        {
          type: 'p',
          text: 'If an issue persists after following diagnostic steps, you can contact the Onefend support team with the following information to expedite resolution:',
        },
        {
          type: 'list',
          items: [
            'Description of the problem and when it started occurring.',
            'The affected user or device (name and email).',
            'Screenshot of the device status on the dashboard (Devices section).',
            'Export of system logs from the relevant period (Auditing → System Logs → Export).',
            'Any visible error messages in the interface.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Support channel',
          text: 'You can contact the Onefend technical support team through the support portal or via the communication channel provided during your organization\'s onboarding process.',
        },
      ],
    },
  ],
};
