CREATE TABLE "span_auth_credentials" (
	"credentialId" text NOT NULL UNIQUE,
	"subjectId" text NOT NULL,
	"revision" text NOT NULL,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "span_auth_identifiers" (
	"namespace" text NOT NULL,
	"value" text NOT NULL,
	"subject_id" text NOT NULL,
	"revision" text NOT NULL,
	"verified_at" bigint,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "span_oauth_registration" (
	"module_id" text NOT NULL,
	"command_id" text NOT NULL,
	"reference" text NOT NULL,
	"identity_key" text NOT NULL,
	"fingerprint" text,
	"intent_snapshot" text,
	"application_snapshot" text,
	"provisioning_identity" text,
	"decision" text,
	"retention_until" bigint
);
--> statement-breakpoint
CREATE TABLE "span_oauth_flow" (
	"module_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"command_id" text,
	"purpose" text NOT NULL,
	"generation" bigint,
	"state" text,
	"version" text,
	"state_digest" text,
	"binder_verifier" text,
	"binder_expires_at" bigint,
	"snapshot" text,
	"issued_at" bigint,
	"expires_at" bigint,
	"claim_id" text,
	"claimed_at" bigint,
	"claim_expires_at" bigint,
	"retention_until" bigint
);
--> statement-breakpoint
CREATE TABLE "span_oauth_identity" (
	"identity_key" text PRIMARY KEY,
	"provider" text NOT NULL,
	"issuer" text NOT NULL,
	"external_subject" text NOT NULL,
	"state" text NOT NULL,
	"version" text NOT NULL,
	"subject_id" text,
	"reservation" text
);
--> statement-breakpoint
CREATE TABLE "span_oauth_intent" (
	"module_id" text NOT NULL,
	"reference" text NOT NULL,
	"flow_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"identity_key" text NOT NULL,
	"version" text,
	"state" text,
	"snapshot" text,
	"command_id" text,
	"fingerprint" text,
	"pending_reference" text,
	"expires_at" bigint,
	"retention_until" bigint
);
--> statement-breakpoint
CREATE TABLE "span_oauth_login" (
	"module_id" text NOT NULL,
	"credential_id" text PRIMARY KEY,
	"subject_id" text NOT NULL,
	"identity_key" text NOT NULL UNIQUE,
	"credential_revision" text NOT NULL,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "span_auth_sessionFlows" (
	"flow_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"state" text NOT NULL,
	"pending_digest" text,
	"dedup_until" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "span_auth_sessions" (
	"session_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"digest" text NOT NULL,
	"version" text NOT NULL,
	"security_revision" text NOT NULL,
	"issued_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"absolute_expires_at" bigint NOT NULL,
	"record" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "security_revision" text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "span_auth_identifiers_key_0" ON "span_auth_identifiers" ("namespace","value");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_registration_command" ON "span_oauth_registration" ("module_id","command_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_flow_key" ON "span_oauth_flow" ("module_id","flow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_flow_command" ON "span_oauth_flow" ("module_id","command_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_flow_state" ON "span_oauth_flow" ("state_digest");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_intent_key" ON "span_oauth_intent" ("module_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "span_oauth_intent_flow" ON "span_oauth_intent" ("module_id","flow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_auth_sessionFlows_key_0" ON "span_auth_sessionFlows" ("flow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_auth_sessions_key_0" ON "span_auth_sessions" ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "span_auth_sessions_key_1" ON "span_auth_sessions" ("digest");--> statement-breakpoint
ALTER TABLE "span_oauth_identity" ADD CONSTRAINT "span_oauth_identity_subject_id_user_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "span_oauth_login" ADD CONSTRAINT "span_oauth_login_subject_id_user_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- Preserve the old admin ban status in Yielded's session authority.
UPDATE "user" SET enabled = NOT COALESCE(banned, false);
--> statement-breakpoint
-- Canonical Yielded identity key: SHA-256 of versioned length-prefixed UTF-8 fields.
-- Link by Google's immutable subject, never by an email supplied at sign-in.
INSERT INTO span_oauth_identity (identity_key, provider, issuer, external_subject, state, version, subject_id)
SELECT 'v1:' || rtrim(translate(encode(sha256(
  int4send(octet_length('effect-auth/oauth-identity-key/v1')) || convert_to('effect-auth/oauth-identity-key/v1', 'UTF8') ||
  int4send(octet_length('google')) || convert_to('google', 'UTF8') ||
  int4send(octet_length('https://accounts.google.com')) || convert_to('https://accounts.google.com', 'UTF8') ||
  int4send(octet_length(convert_to(a.account_id, 'UTF8'))) || convert_to(a.account_id, 'UTF8')
), 'base64'), '+/', '-_'), '='), 'google', 'https://accounts.google.com', a.account_id, 'Owned', 'v1', a.user_id
FROM account a WHERE a.provider_id = 'google';
--> statement-breakpoint
INSERT INTO span_oauth_login (module_id, credential_id, subject_id, identity_key, credential_revision, active)
SELECT 'span/google', 'google-account:' || a.id, a.user_id, i.identity_key, u.security_revision, u.enabled
FROM account a JOIN "user" u ON u.id = a.user_id
JOIN span_oauth_identity i ON i.provider = 'google' AND i.external_subject = a.account_id AND i.subject_id = a.user_id
WHERE a.provider_id = 'google';
--> statement-breakpoint
INSERT INTO span_auth_credentials ("credentialId", "subjectId", revision, active)
SELECT credential_id, subject_id, credential_revision, active FROM span_oauth_login;
