import type { DocSection } from '../../../types';

export const seccionProteccionPoliticas: DocSection = {
  title: 'Protection and Policies',
  chapters: [
    // ─── Manual 05: DLP Policy Configuration ────────────────────────────
    {
      slug: 'configuracion-politicas-dlp',
      title: 'DLP Policies',
      description: 'How to create and manage data loss prevention policies.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-dlp',
          text: 'What is a DLP policy?',
        },
        {
          type: 'p',
          text: 'A DLP (Data Loss Prevention) policy defines the action the platform will take when it detects a sensitive data pattern in the content a user attempts to send to an AI tool. Each policy is applied to one or more user groups and can target a specific application or all monitored applications.',
        },
        {
          type: 'h2',
          id: 'available-actions',
          text: 'Available actions',
        },
        {
          type: 'table',
          headers: ['Action', 'What it does', 'What the user perceives'],
          rows: [
            ['BLOCK', 'Prevents content from being sent.', 'Sees a notice indicating the content was blocked and the reason.'],
            ['WARN', 'Displays a warning but allows the user to decide whether to continue.', 'Sees a warning showing the type of data detected. Can choose to proceed or cancel.'],
            ['LOG', 'Logs the event without intervening in the transmission.', 'Does not perceive any modification. The event is recorded in the dashboard.'],
            ['ALLOW', 'Explicitly allows transmission, without logging.', 'Perceives no change. Useful for approved exceptions.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Start with LOG, then advance',
          text: 'For organizations just starting with Onefend, it is recommended to configure policies in LOG mode during the first one or two weeks. This helps to grasp the volume and type of events before rolling out restrictive interventions.',
        },
        {
          type: 'h2',
          id: 'create-policy',
          text: 'How to create a policy',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Access DLP Policies → New Policy',
              description: 'In the administration panel, go to the DLP Policies section and click "New Policy".',
            },
            {
              title: 'Select the type of data to protect',
              description: 'Choose which data category triggers the policy: personal data (PII), credentials, financial information, source code, health data, among others.',
            },
            {
              title: 'Define the action',
              description: 'Select what the system should do upon detecting that type of data: BLOCK, WARN, LOG, or ALLOW.',
            },
            {
              title: 'Select the application or scope',
              description: 'You can apply the policy across all monitored applications or target a specific application (e.g., only ChatGPT).',
            },
            {
              title: 'Assign the policy to groups',
              description: 'Select the user groups to which you will apply this policy. A user inherits all policies from the groups they belong to.',
            },
            {
              title: 'Save and activate',
              description: 'Once saved, the policy is synchronized with the group\'s devices. Updates may take up to the next synchronization cycle to become active on each device.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'precedence',
          text: 'Policy precedence',
        },
        {
          type: 'p',
          text: 'When a user belongs to multiple groups possessing different policies targeting the same data type and the same application, the system applies the most restrictive policy. The restriction order is: BLOCK > WARN > LOG > ALLOW.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Specific policies take priority',
          text: 'A policy configured for a specific application overrides a general policy enforced on all applications. This enables the creation of specific exceptions without impacting the global configuration.',
        },
        {
          type: 'h2',
          id: 'edit-deactivate',
          text: 'Editing and deactivating policies',
        },
        {
          type: 'p',
          text: 'You can modify or disable an existing policy at any time from the DLP Policies list. Deactivated policies are preserved within the system and can be reactivated. Deleted policies cannot be recovered.',
        },
      ],
    },

    // ─── Manual 06: Application Management ───────────────────────────────────
    {
      slug: 'gestion-aplicaciones',
      title: 'Application Management',
      description: 'How to manage the catalog of detected AI apps in your organization.',
      blocks: [
        {
          type: 'h2',
          id: 'app-catalog',
          text: 'The Application Catalog',
        },
        {
          type: 'p',
          text: 'Onefend maintains a catalog of all AI tools used by your organization. This catalog dynamically updates as the extension identifies new platforms accessed by employees.',
        },
        {
          type: 'p',
          text: 'Each catalog application bears a risk score and a management status indicating how the platform handles it.',
        },
        {
          type: 'h2',
          id: 'app-status',
          text: 'Application Statuses',
        },
        {
          type: 'table',
          headers: ['Status', 'Meaning'],
          rows: [
            ['Unclassified', 'An automatically detected application that has not yet been reviewed by the administrator.'],
            ['Approved', 'The organization permits its use. DLP policies apply normally.'],
            ['Under observation', 'Usage is granted, but each access generates a LOG event to be subjected to review.'],
            ['Blocked', 'The extension prevents access to the application for all groups targeted by the blocking policy.'],
          ],
        },
        {
          type: 'h2',
          id: 'add-app',
          text: 'Manually adding an application',
        },
        {
          type: 'p',
          text: 'In addition to automatic detection, you can manually input AI tools into the catalog to configure them before employees employ them:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Applications → New Application',
              description: 'Navigate to the Applications section in the dashboard and click "New Application".',
            },
            {
              title: 'Enter the tool URL',
              description: 'Enter the main domain of the AI capability to add (for instance: gemini.google.com).',
            },
            {
              title: 'Assign name, category, and risk score',
              description: 'Fill in the description details of the application to aid identification in reports and event lists.',
            },
            {
              title: 'Define initial status',
              description: 'Choose whether the application launches as Approved, Under Observation, or Blocked.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'risk-score',
          text: 'Application risk score',
        },
        {
          type: 'p',
          text: 'Every application bears a risk score from 1 to 10. Onefend generates a preliminary score predicated on the characteristics of the platform, its public privacy policy, and its terms of use. Based on organizational criteria, the administrator may modify the score.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'The risk score is a reference',
          text: 'The risk score neither automatically blocks nor permits an application. It provides an informational metric meant to prioritize revision and execute filters on reports and dashboards.',
        },
      ],
    },

    // ─── Manual 07: Detection Patterns ─────────────────────────────────────
    {
      slug: 'patrones-deteccion',
      title: 'Detection Patterns',
      description: 'The types of data Onefend detects and how to implement customized patterns.',
      blocks: [
        {
          type: 'h2',
          id: 'integrated-patterns',
          text: 'Onefend\'s integrated patterns',
        },
        {
          type: 'p',
          text: 'Onefend comprises a collection of pre-set detection patterns classified by category. These patterns evaluate the integrity of content sent by employees to external AI resources by identifying any sensitive features.',
        },
        {
          type: 'table',
          headers: ['Category', 'Examples of detected data'],
          rows: [
            ['Personal Data (PII)', 'Names, surnames, ID numbers, passport numbers, birth dates, postal addresses.'],
            ['Contact information', 'Corporate emails, telephone digits, IP routing numbers.'],
            ['Financial information', 'Debit/credit card details, IBAN/swift routing figures, CVC tokens.'],
            ['Credentials and secrets', 'Passwords, API keys, authentication credentials, embedded connection chains.'],
            ['Source code and infrastructure', 'Code snippets encapsulating embedded credentials, backend setting files.'],
            ['Health data', 'Diagnoses, health record serializations, prescription items.'],
          ],
        },
        {
          type: 'h2',
          id: 'custom-patterns',
          text: 'Customized patterns',
        },
        {
          type: 'p',
          text: 'In addition to the out-of-the-box templates, you possess the capacity to fabricate proprietary patterns aligned securely with the specific demands of the enterprise entity. For example: filtering individual internal client metrics, project serialization numbers covered by NDA, or specialized folder directories.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Go to Policies → Patterns → New Pattern',
              description: 'Navigate to the Patterns interface area on the dashboard to build a customized element.',
            },
            {
              title: 'Format the title and configuration outline',
              description: 'Assign a descriptive title facilitating precise tracking in policy interfaces.',
            },
            {
              title: 'Configure detection elements',
              description: 'You can insert keywords, exact syntaxes or, for elaborate tracking models, regular expressions. The interface displays an evaluation test field enabling simulation verifying functional scope before enforcing.',
            },
            {
              title: 'Define operational parameters',
              description: 'State whether the detection flags a system block, a user alert, or a background audit entry when logged.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Always dry-run prior to execution',
          text: 'Deploy the simulation utility incorporated into the Pattern builder module to corroborate logic validation. This limits the generation of false-positive restrictions toward operational inputs generated by employees.',
        },
        {
          type: 'h2',
          id: 'intervention-modes',
          text: 'Intervention modes per pattern',
        },
        {
          type: 'p',
          text: 'Every rule behaves within a configured parameter enforcing an action, frequently manifesting as observation mapping or restriction mapping. Enacting tracking implies tracing corresponding matches effectively devoid of obstructing user sequences; opposingly enforcing restrictions halts operations.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Custom directives require binding within DLP structural modules',
          text: 'Custom rules enact processes strictly when allocated to functional dynamic DLP components. Disconnected entities simply persist archived within database parameters bypassing traffic assessment tasks.',
        },
      ],
    },

    // ─── Manual 08: Risk classification ───────────────────────────────────
    {
      slug: 'clasificacion-riesgo',
      title: 'Risk classification',
      description: 'How to manage and interpret risk scoring profiles on events and platform structures.',
      blocks: [
        {
          type: 'h2',
          id: 'what-is-risk',
          text: 'The risk tier mechanism',
        },
        {
          type: 'p',
          text: 'Onefend appends an intrinsic risk identifier linked alongside event generations. This factor reflects algorithmic evaluations associated with potential confidentiality thresholds thus highlighting incident urgency matrices inside the investigative panel.',
        },
        {
          type: 'table',
          headers: ['Level', 'Description', 'Typical models'],
          rows: [
            ['HIGH', 'Incidents generating critical material disclosures demanding mitigation operations natively.', 'Live credentials, sweeping financial arrays, granular anatomical diagnostics, large volume unencrypted PII matrices.'],
            ['MEDIUM', 'Records enclosing components capable of establishing partial breaches rendering investigation advantageous.', 'Individual corporate webmail traces, standalone personnel classifications, cellular identifiers.'],
            ['LOW', 'Background routine procedures manifesting zero critical vulnerabilities processing generic parameters.', 'Basic system queries, content formatting requests devoid of internal metrics.'],
          ],
        },
        {
          type: 'h2',
          id: 'usage',
          text: 'Application of analytical mapping models',
        },
        {
          type: 'list',
          items: [
            'Executing filter processes throughout investigation interfaces isolating primary urgent breaches.',
            'Routing alert mechanisms targeting exclusively configurations surpassing explicitly allocated thresholds.',
            'Issuing macro analysis reports segmented structurally to board directors mapping exposure vectors broadly.',
            'Pinpointing users or domains characterized by excessive accumulation proportions favoring higher-level risk activities systematically.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Risk models offer diagnostic tracking',
          text: 'The risk coefficient doesn\'t intrinsically abort data routing automatically. Such executive commands belong completely to defined DLP constructs. Risk serves as instrumental markers supporting administrator insight extraction routines.',
        },
        {
          type: 'h2',
          id: 'adjustment',
          text: 'Calibrating external app risk assessments',
        },
        {
          type: 'p',
          text: 'Every calculated score inherently assigned per target program remains adjustable to authorized personnel parameters. If internal organizational metrics mandate downgrading/upgrading application profiles from baseline suggestions, manual overrides function through the target\'s registry sheet accessible via Applications → specifics mapping module.',
        },
      ],
    },

    // ─── Manual 14: Global Configuration ──────────────────────────────────────
    {
      slug: 'configuracion-global',
      title: 'Global Configuration',
      description: 'General organization settings: retention, whitelists, time zones and logic synchronization features.',
      blocks: [
        {
          type: 'h2',
          id: 'organization-parameters',
          text: 'Organization Parameters',
        },
        {
          type: 'p',
          text: 'The Settings sector encloses core infrastructure values defining platform execution behavior universally. Access remains exclusively restricted via Administrators. Configuration amendments trigger operational re-evaluations across entire endpoints globally practically instantly.',
        },
        {
          type: 'h2',
          id: 'data-retention',
          text: 'Data retention protocols',
        },
        {
          type: 'p',
          text: 'Configures time allocation scopes managing local platform registry archives prior to automated permanent deletion routines executing organically:',
        },
        {
          type: 'table',
          headers: ['Data type classification', 'Defaults', 'Modifiable'],
          rows: [
            ['Tracking conversational incidents', '30 days', 'Yes'],
            ['Administrative log audit processes', '90 days', 'Yes'],
            ['Device networking components', 'Linked completely to active tracking metrics continuously', 'No'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Deleted parameters possess zero recovery models',
          text: 'Information surpassing retention rules gets systematically deleted. Operators aiming strictly at extended archiving should initiate export sequences promptly beforehand processing records externally.',
        },
        {
          type: 'h2',
          id: 'domain-whitelists',
          text: 'Domain white-list registers',
        },
        {
          type: 'p',
          text: 'White-list models integrate functions dictating domains categorized wholly bypassing algorithmic supervision logic loops explicitly. This efficiently protects corporate internally structured mechanisms avoiding redundant dashboard alerts naturally.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Execute configurations practically targeting utility efficiency',
          text: 'White-listing effectively blinds the extension components bypassing entire monitoring matrices. Constrain implementation directing elements purely involving recognized localized non-vulnerable entities abstaining utilizing external AI domains explicitly.',
        },
        {
          type: 'h2',
          id: 'timezone',
          text: 'Time zones and Regional constructs',
        },
        {
          type: 'p',
          text: 'Configured metrics impact visibility across tracking mechanisms orientating displays logically. Synchronization favoring prevailing corporate geographical points enables functional navigation properties. Decentralized global user clusters inherently visualize dashboard features dynamically aligned although central servers natively store UTC parameters globally.',
        },
        {
          type: 'h2',
          id: 'sync-interval',
          text: 'Synchronization Interval',
        },
        {
          type: 'p',
          text: 'Dictates the latency between local endpoint interactions consulting backend infrastructure requesting updated configuration updates actively. Shortened scopes guarantee rapid enforcement distribution nevertheless incurring escalating bandwidth consumption processes systematically. Default parameters sufficiently maintain balance efficiently across standard enterprise structures.',
        },
      ],
    },

    // ─── Manual 15: Policy management ──────────────────────────────────────
    {
      slug: 'gestion-politicas',
      title: 'Advanced policy management',
      description: 'Strategic administration, escalation matrixing, and structural prioritization methodologies.',
      blocks: [
        {
          type: 'h2',
          id: 'policy-overview',
          text: 'Fundamental architecture of policy implementations',
        },
        {
          type: 'p',
          text: 'Onefend\'s structural integration implements versatile architectures oriented towards configuring scalable systems applicable effectively for intricate operational units simultaneously. Implementations process spectrums embracing single standalone global parameters expanding intricately encompassing hundreds of modular micro-configurations intersecting user/application definitions individually.',
        },
        {
          type: 'h2',
          id: 'policy-strategy',
          text: 'Strategic recommendation sequences',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Allocate foundational macro controls',
              description: 'Initialize primary rule configurations targeting all user models activating LOG tracing mechanisms universally minimizing intrusive structural delays initially enabling fluid workflow progression.',
            },
            {
              title: 'Determine exposure concentration vulnerabilities',
              description: 'Leverage primary reporting intelligence isolating specific units representing primary confidentiality leakage pathways structurally analyzing behavioral metrics dynamically mapped over preliminary phases.',
            },
            {
              title: 'Integrate dynamic unit specific restrictions',
              description: 'Formulate specialized controls executing active blockage constraints limiting variables explicitly over recognized vulnerable divisions like legal, resources, or finance departments restricting exposure pathways forcefully.',
            },
            {
              title: 'Execute continuous analytical loop tuning',
              description: 'Monitor structural integrity consistently tweaking implementations dynamically based essentially upon accumulated intelligence preventing excessive operational restrictions mitigating disruptive false positive scenarios practically.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'resolution-priority',
          text: 'Navigating conflicting rule configurations structurally',
        },
        {
          type: 'p',
          text: 'Events subject potentially toward overlapping algorithmic rules evaluate specific collision-avoidance mechanisms orientating outcome mapping logically based natively on structural precedence factors as follows:',
        },
        {
          type: 'list',
          items: [
            'Maximum restriction prioritization governs outcomes enforcing severe blocks fundamentally overcoming generalized logic tracking parameters completely.',
            'Distinct targeted integrations inherently surpass encompassing generalized macro rules seamlessly allocating precision logic components effectively natively.',
            'Independent user account specific definitions process precedence explicitly outranking inherited group structural settings automatically organizing outcomes structurally.',
          ],
        },
        {
          type: 'h2',
          id: 'emergency-policies',
          text: 'Emergency rapid intervention protocols',
        },
        {
          type: 'p',
          text: 'Confronted urgently with critical analytical incident developments establishing severe leaks directly mandates enacting encompassing manual blockage configurations targeting immediate deployment sequences utilizing integrated forced-synchronization processes guaranteeing near real time mitigation universally executing containment seamlessly.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Macro interventions disrupt productivity cycles dynamically',
          text: 'Systemic sweeping operational halts intrinsically cascade across productive routines damaging operational pacing globally. Utilize exclusively during justifiable critical incident paradigms coordinating actively communicating factors transparently toward integrated structural departments simultaneously managing operational fallout efficiently.',
        },
      ],
    },
  ],
};
