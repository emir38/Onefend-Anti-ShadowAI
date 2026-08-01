-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER', 'AUDITOR', 'USER');

-- CreateEnum
CREATE TYPE "ApplicationCategory" AS ENUM ('AI_ASSISTANT', 'PRODUCTIVITY', 'CLOUD_STORAGE', 'COMMUNICATION', 'DEVELOPMENT', 'SOCIAL_MEDIA', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('ALLOW', 'WARN', 'SOFT_BLOCK', 'BLOCK', 'LOG', 'REDACTED_SEND', 'USER_OVERRIDE', 'USER_OVERRIDE_BLOCKED', 'EDIT', 'CLEAR_TEXT', 'WARNED_PROCEED', 'ALLOWED');

-- CreateEnum
CREATE TYPE "DataCategory" AS ENUM ('PII', 'PHI', 'FINANCIAL', 'CREDENTIALS', 'INTELLECTUAL_PROPERTY', 'NETWORK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('WEBHOOK', 'SYSLOG', 'SIEM', 'DLP');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('EXTENSION', 'DESKTOP_AGENT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'INSTALLED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlatformCategory" AS ENUM ('AI_CHAT', 'CODE_ASSISTANT', 'PRODUCTIVITY', 'DESIGN', 'DATA_ANALYTICS', 'CRM', 'DOCUMENT', 'SPECIALIZED', 'COLLABORATION', 'TRANSLATION', 'IMAGE_GENERATION', 'AUDIO_VIDEO', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "InterventionMode" AS ENUM ('BLOCKING', 'OBSERVATION');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'Onefend',
    "enforceMfa" BOOLEAN NOT NULL DEFAULT false,
    "auditLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "eventRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "enable_regex_blocking" BOOLEAN NOT NULL DEFAULT true,
    "intervention_mode" "InterventionMode" NOT NULL DEFAULT 'BLOCKING',
    "save_evidence" BOOLEAN NOT NULL DEFAULT false,
    "ai_rate_limit" INTEGER NOT NULL DEFAULT 1000,
    "ai_context_prompt" TEXT,
    "approved_ai_name" TEXT,
    "approved_ai_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "password" TEXT,
    "mfa_secret" TEXT,
    "is_mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_backup_codes" TEXT[],
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_type" "DeviceType" NOT NULL DEFAULT 'EXTENSION',
    "deviceInfo" JSONB NOT NULL,
    "extension_version" TEXT,
    "jwt_token_hash" TEXT,
    "enrollment_token" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT,
    "category" "ApplicationCategory" NOT NULL DEFAULT 'UNKNOWN',
    "ai_description" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "isKnown" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "action" "PolicyAction" NOT NULL DEFAULT 'ALLOW',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_group_assignments" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_group_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "url" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enrollment_token_id" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installed_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensitive_data_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DataCategory" NOT NULL,
    "pattern" TEXT,
    "description" TEXT,
    "defaultAction" "PolicyAction" NOT NULL DEFAULT 'LOG',
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "allowOverride" BOOLEAN NOT NULL DEFAULT false,
    "requireJustification" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "case_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensitive_data_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "application_id" TEXT,
    "platform" TEXT NOT NULL,
    "conversation_id" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 1,
    "sensitive_data_detected" BOOLEAN NOT NULL DEFAULT false,
    "data_types" JSONB NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "action" "PolicyAction" NOT NULL,
    "user_override" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "input_length" INTEGER NOT NULL,
    "pattern_matches" JSONB NOT NULL,
    "analysis_source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ai_category" TEXT,
    "ai_risk_level" "RiskLevel",
    "ai_summary" TEXT,
    "evidence" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "webhook_url" TEXT,
    "webhook_events" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT[],
    "category" "PlatformCategory" NOT NULL,
    "selectors" JSONB NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "icon_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "regex" TEXT NOT NULL,
    "case_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "multiline" BOOLEAN NOT NULL DEFAULT false,
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "default_action" "PolicyAction" NOT NULL DEFAULT 'WARN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "total_detections" INTEGER NOT NULL DEFAULT 0,
    "last_detected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_id" TEXT,
    "resource_type" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "threshold" INTEGER,
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "recipients" TEXT[],
    "run_time" TEXT NOT NULL DEFAULT '00:00',
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excluded_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excluded_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_domain_key" ON "applications"("domain");

-- CreateIndex
CREATE INDEX "applications_domain_idx" ON "applications"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_application_id_key" ON "policies"("application_id");

-- CreateIndex
CREATE INDEX "policies_application_id_idx" ON "policies"("application_id");

-- CreateIndex
CREATE INDEX "policy_group_assignments_policy_id_idx" ON "policy_group_assignments"("policy_id");

-- CreateIndex
CREATE INDEX "policy_group_assignments_group_id_idx" ON "policy_group_assignments"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_group_assignments_policy_id_group_id_key" ON "policy_group_assignments"("policy_id", "group_id");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_application_id_idx" ON "events"("application_id");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_tokens_token_key" ON "enrollment_tokens"("token");

-- CreateIndex
CREATE INDEX "enrollment_tokens_token_idx" ON "enrollment_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_email_key" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_enrollment_token_id_key" ON "invitations"("enrollment_token_id");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_data_patterns_name_key" ON "sensitive_data_patterns"("name");

-- CreateIndex
CREATE INDEX "sensitive_data_patterns_enabled_idx" ON "sensitive_data_patterns"("enabled");

-- CreateIndex
CREATE INDEX "sensitive_data_patterns_category_idx" ON "sensitive_data_patterns"("category");

-- CreateIndex
CREATE INDEX "conversation_events_user_id_idx" ON "conversation_events"("user_id");

-- CreateIndex
CREATE INDEX "idx_timestamp" ON "conversation_events"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "conversation_events_risk_level_action_idx" ON "conversation_events"("risk_level", "action");

-- CreateIndex
CREATE INDEX "conversation_events_platform_idx" ON "conversation_events"("platform");

-- CreateIndex
CREATE INDEX "conversation_events_data_types_idx" ON "conversation_events" USING GIN ("data_types");

-- CreateIndex
CREATE INDEX "conversation_events_pattern_matches_idx" ON "conversation_events" USING GIN ("pattern_matches");

-- CreateIndex
CREATE INDEX "integrations_is_active_idx" ON "integrations"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "platform_configs_name_key" ON "platform_configs"("name");

-- CreateIndex
CREATE INDEX "platform_configs_is_active_idx" ON "platform_configs"("is_active");

-- CreateIndex
CREATE INDEX "platform_configs_category_idx" ON "platform_configs"("category");

-- CreateIndex
CREATE INDEX "platform_configs_is_official_idx" ON "platform_configs"("is_official");

-- CreateIndex
CREATE INDEX "detection_patterns_category_idx" ON "detection_patterns"("category");

-- CreateIndex
CREATE INDEX "detection_patterns_is_active_idx" ON "detection_patterns"("is_active");

-- CreateIndex
CREATE INDEX "system_audit_logs_timestamp_idx" ON "system_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "system_audit_logs_action_idx" ON "system_audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "excluded_domains_domain_key" ON "excluded_domains"("domain");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_group_assignments" ADD CONSTRAINT "policy_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_group_assignments" ADD CONSTRAINT "policy_group_assignments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_enrollment_token_id_fkey" FOREIGN KEY ("enrollment_token_id") REFERENCES "enrollment_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
