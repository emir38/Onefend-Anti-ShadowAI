import type { DocSection } from '../../../types';

export const seccionUsuariosAccesos: DocSection = {
  title: 'Users and Access',
  chapters: [
    // ─── Manual 03: User management ──────────────────────────────────────
    {
      slug: 'user-management',
      title: 'User Management',
      description: 'How to add, modify and deactivate users on the platform.',
      blocks: [
        {
          type: 'h2',
          id: 'users-in-onefend',
          text: 'Users in Onefend',
        },
        {
          type: 'p',
          text: 'Every person who interacts with the platform — whether as an administrator, analyst, or protected end user — has a user profile in Onefend. From the dashboard, the administrator manages the full lifecycle of all users in the organization.',
        },
        {
          type: 'h2',
          id: 'add-users',
          text: 'How to add users',
        },
        {
          type: 'p',
          text: 'There are three ways to add users to the platform:',
        },
        {
          type: 'table',
          headers: ['Method', 'When to use it'],
          rows: [
            ['Email invitation', 'To add users individually. The user receives an email with an activation link.'],
            ['Batch import (CSV)', 'To add multiple users at once. You upload a file with name, email, and assigned role.'],
            ['Directory synchronization (SSO)', 'For organizations using Azure AD, Google Workspace, or another identity provider. Users are synchronized automatically.'],
          ],
        },
        {
          type: 'h2',
          id: 'individual-invitation',
          text: 'Individual invitation',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Users → New User',
              description: 'In the administration panel, go to the Users section and click "New User".',
            },
            {
              title: 'Fill in user details',
              description: 'Enter the corporate email, full name, and select the role they will have on the platform.',
            },
            {
              title: 'Assign user to groups (optional)',
              description: 'You can assign them to one or more groups in this step. Groups define which policies apply to the user.',
            },
            {
              title: 'Send the invitation',
              description: 'The user receives an email with an activation link. They have 48 hours to activate their account. You can resend the invitation from the user list if the link expires.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'groups',
          text: 'Group management',
        },
        {
          type: 'p',
          text: 'Groups allow you to apply security policies to sets of users efficiently. Instead of configuring a policy user by user, it is defined at the group level and all its members inherit it automatically.',
        },
        {
          type: 'list',
          items: [
            'A user can belong to multiple groups simultaneously.',
            'If a user belongs to groups with conflicting policies for the same pattern, the most restrictive one is applied.',
            'Groups can be created from Users → Groups → New Group.',
          ],
        },
        {
          type: 'h2',
          id: 'deactivate-users',
          text: 'Deactivating and deleting users',
        },
        {
          type: 'p',
          text: 'When an employee leaves the organization or changes roles, it is important to manage their access immediately:',
        },
        {
          type: 'table',
          headers: ['Action', 'Effect'],
          rows: [
            ['Deactivate', 'The user loses access to the dashboard and the extension stops working on their device. Their historical records are preserved.'],
            ['Delete', 'Deletes the user profile. Their historical records are preserved for the configured retention period.'],
            ['Revoke device', 'Unlinks the extension from a specific device without affecting the user account.'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Revoke access for immediate departures',
          text: 'It is recommended to deactivate the user from the dashboard on the same day the departure is processed. The extension stops being active on their device as soon as the user is deactivated.',
        },
      ],
    },

    // ─── Manual 04: Roles and permissions ──────────────────────────────────────────
    {
      slug: 'roles-permissions',
      title: 'Roles and permissions',
      description: 'The four roles on the platform and what each one can do.',
      blocks: [
        {
          type: 'h2',
          id: 'role-system',
          text: 'The Onefend role system',
        },
        {
          type: 'p',
          text: 'Onefend uses a role-based access control (RBAC) system. Each user is assigned exactly one role, which determines which sections of the dashboard they can access and which actions they can perform. Roles are not cumulative.',
        },
        {
          type: 'h2',
          id: 'available-roles',
          text: 'Available roles',
        },
        {
          type: 'table',
          headers: ['Role', 'Typical profile', 'Access level'],
          rows: [
            ['ADMIN', 'IT Manager or CISO', 'Full access: configuration, users, policies, reports, and auditing.'],
            ['ANALYST', 'Security Analyst', 'Read and analyze: can view events, conversations, and reports, but cannot modify the configuration.'],
            ['VIEWER', 'Executive or external auditor', 'Read-only access to dashboards and reports. No access to individual events or configuration.'],
            ['USER', 'Protected employee', 'Accesses only the documentation portal. Has no access to the administration dashboard.'],
          ],
        },
        {
          type: 'h2',
          id: 'admin-detail',
          text: 'Administrator (ADMIN)',
        },
        {
          type: 'p',
          text: 'The Administrator is the role with the highest level of privilege on the platform. It is the only one that can modify the organization\'s configuration, create and delete users, define policies, and access administrative audit logs.',
        },
        {
          type: 'list',
          items: [
            'Full management of users, groups, and roles.',
            'Creation, editing, and deletion of DLP policies.',
            'Configuration of integrations (Slack, Teams, webhooks, SIEM).',
            'Access to all events, conversations, and system logs.',
            'Generation and scheduling of reports.',
            'Configuration of data retention and global organization parameters.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Principle of least privilege',
          text: 'It is recommended to assign the Administrator role only to people who actually need to modify the platform configuration. For review and monitoring tasks, the Analyst role is sufficient.',
        },
        {
          type: 'h2',
          id: 'analyst-detail',
          text: 'Analyst (ANALYST)',
        },
        {
          type: 'p',
          text: 'The Analyst can review all the organization\'s activity but cannot make changes to the configuration. It is the ideal role for security teams monitoring events without needing to administer the platform.',
        },
        {
          type: 'list',
          items: [
            'View and filter all conversation events.',
            'Access conversation details for incident investigation.',
            'Query system logs (informational level).',
            'View reports and dashboards.',
            'Export events and data for external analysis.',
          ],
        },
        {
          type: 'h2',
          id: 'viewer-detail',
          text: 'Viewer (VIEWER)',
        },
        {
          type: 'p',
          text: 'The Viewer has read-only access to dashboards and reports. They cannot view individual events or conversation details. This is useful for executives or auditors needing high-level visibility without accessing operational data.',
        },
        {
          type: 'h2',
          id: 'change-role',
          text: 'How to change a user\'s role',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Users',
              description: 'In the administration panel, go to the Users section.',
            },
            {
              title: 'Select the user',
              description: 'Click on the name of the user you want to modify to open their profile.',
            },
            {
              title: 'Change the role',
              description: 'In the Role field, select the new role from the dropdown menu and save the changes. The change takes effect immediately.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'The USER role has no dashboard access',
          text: 'Employees with the USER role only see the documentation portal when logging in with their credentials. They do not have access to the administration dashboard, events, or reports.',
        },
      ],
    },

    // ─── Manual 12: Extension synchronization ─────────────────────────────
    {
      slug: 'extension-synchronization',
      title: 'Extension synchronization',
      description: 'How policy synchronization works on devices and how to verify its status.',
      blocks: [
        {
          type: 'h2',
          id: 'synchronization',
          text: 'What is synchronization?',
        },
        {
          type: 'p',
          text: 'Every time an administrator creates or modifies a policy, the update must reach the devices where the extension is installed. This process is automatic and is called synchronization. Without synchronization, devices would continue applying the previous version of the policies.',
        },
        {
          type: 'h2',
          id: 'how-it-syncs',
          text: 'How automatic synchronization works',
        },
        {
          type: 'p',
          text: 'The extension periodically connects to the Onefend backend to check for policy updates, application lists, or configuration changes. The synchronization interval is configured in the global organization dashboard and is adjustable by the administrator.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Real-time vs. Periodic synchronization',
          text: 'When a critical policy change is made (e.g., an emergency block), the administrator can force an immediate synchronization from the dashboard without waiting for the next automatic cycle.',
        },
        {
          type: 'h2',
          id: 'device-status',
          text: 'Viewing the synchronization status per device',
        },
        {
          type: 'p',
          text: 'From Settings → Devices, you can see the status of each extension installed in your organization:',
        },
        {
          type: 'table',
          headers: ['Status', 'Meaning'],
          rows: [
            ['Active', 'The device is synchronized and applying the current policies.'],
            ['Offline', 'The device has not communicated with the backend in the expected period. The user might be offline or have uninstalled the extension.'],
            ['Outdated', 'The device is online but has not received the latest policies. This may be due to a temporary connectivity issue.'],
            ['Revoked', 'The administrator manually revoked the token for this device. The extension is inactive.'],
          ],
        },
        {
          type: 'h2',
          id: 'force-sync',
          text: 'Forcing synchronization manually',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Access Settings → Devices',
              description: 'Locate the device with the Outdated or Offline status.',
            },
            {
              title: 'Use "Request sync"',
              description: 'Click on the device options menu and select "Request sync". The backend will send a signal to the device to update its configuration on the next connection.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'common-problems',
          text: 'Common problems and how to solve them',
        },
        {
          type: 'table',
          headers: ['Symptom', 'Probable cause', 'Suggested action'],
          rows: [
            ['Device in "Offline" status for more than 24h', 'The user uninstalled the extension or the computer has been off for a long time.', 'Confirm with the user that the extension is installed. If necessary, generate a new enrollment token.'],
            ['Persistent "Outdated" status', 'Connectivity issue with the backend.', 'Ask the user to check their internet connection and restart the browser. If the problem persists, contact us.'],
            ['Device appears active but policies aren\'t applied', 'The policy might be assigned to a group the user doesn\'t belong to.', 'Verify the user\'s group assignment and the policy configuration.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Did the user reinstall the extension?',
          text: 'If a user reinstalls the extension, they will need to re-enter the enrollment token. You can use the same token if it is still valid, or generate a new one from Settings → Devices → New Token.',
        },
      ],
    },
  ],
};
