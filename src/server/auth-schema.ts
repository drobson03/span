import { Schema as AuthSchema, Sessions } from "@yielded/auth";
import { AuthPersistence } from "@yielded/auth-persistence-drizzle/Postgres";
import {
  bigint,
  boolean,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { user } from "../lib/server/db/schema/auth";
import { AppAuth } from "./auth-definition";

export const requirement = Sessions.AuthenticationRequirement.make({
  maximumAgeMillis: 30 * 24 * 60 * 60 * 1000,
  alternatives: [
    {
      factors: ["possession"],
      minimumCredentials: 1,
      userVerified: false,
      phishingResistant: false,
    },
  ],
});
// Only session services are composed here; OAuth uses the adapter's explicit services.
export const Persistence = AuthPersistence.make({ ...AppAuth, strategies: {} });
export const credentials = pgTable("span_auth_credentials", {
  credentialId: text("credentialId").notNull().unique(),
  subjectId: text("subjectId").notNull(),
  revision: text("revision").notNull(),
  active: boolean("active").notNull(),
});
export const storage = Persistence.managed({
  tables: { credentials },
  subjects: {
    table: user,
    id: "id",
    status: "enabled",
    activeValue: true,
    securityRevision: "securityRevision",
    idCodec: AuthSchema.SubjectId,
    requirements: () => Effect.succeed(requirement),
  },
  prefix: "span_auth",
});
export const { identifiers, sessions, sessionFlows } = storage.schema;
const millis = (name: string) => bigint(name, { mode: "number" });
export const oauthIdentities = pgTable("span_oauth_identity", {
  identityKey: text("identity_key").primaryKey(),
  provider: text("provider").notNull(),
  issuer: text("issuer").notNull(),
  externalSubject: text("external_subject").notNull(),
  state: text("state").notNull(),
  version: text("version").notNull(),
  subjectId: text("subject_id").references(() => user.id, {
    onDelete: "cascade",
  }),
  reservation: text("reservation"),
});
export const oauthLogins = pgTable("span_oauth_login", {
  moduleId: text("module_id").notNull(),
  credentialId: text("credential_id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  identityKey: text("identity_key").notNull().unique(),
  credentialRevision: text("credential_revision").notNull(),
  active: boolean("active").notNull(),
});
export const oauthFlows = pgTable(
  "span_oauth_flow",
  {
    moduleId: text("module_id").notNull(),
    flowId: text("flow_id").notNull(),
    commandId: text("command_id"),
    purpose: text("purpose").notNull(),
    generation: bigint("generation", { mode: "number" }),
    state: text("state"),
    version: text("version"),
    stateDigest: text("state_digest"),
    binderVerifier: text("binder_verifier"),
    binderExpiresAt: millis("binder_expires_at"),
    snapshot: text("snapshot"),
    issuedAt: millis("issued_at"),
    expiresAt: millis("expires_at"),
    claimId: text("claim_id"),
    claimedAt: millis("claimed_at"),
    claimExpiresAt: millis("claim_expires_at"),
    retentionUntil: millis("retention_until"),
  },
  (t) => [
    uniqueIndex("span_oauth_flow_key").on(t.moduleId, t.flowId),
    uniqueIndex("span_oauth_flow_command").on(t.moduleId, t.commandId),
    uniqueIndex("span_oauth_flow_state").on(t.stateDigest),
  ],
);
export const oauthIntents = pgTable(
  "span_oauth_intent",
  {
    moduleId: text("module_id").notNull(),
    reference: text("reference").notNull(),
    flowId: text("flow_id").notNull(),
    claimId: text("claim_id").notNull(),
    identityKey: text("identity_key").notNull(),
    version: text("version"),
    state: text("state"),
    snapshot: text("snapshot"),
    commandId: text("command_id"),
    fingerprint: text("fingerprint"),
    pendingReference: text("pending_reference"),
    expiresAt: millis("expires_at"),
    retentionUntil: millis("retention_until"),
  },
  (t) => [
    uniqueIndex("span_oauth_intent_key").on(t.moduleId, t.reference),
    uniqueIndex("span_oauth_intent_flow").on(t.moduleId, t.flowId),
  ],
);
export const oauthCommands = pgTable(
  "span_oauth_registration",
  {
    moduleId: text("module_id").notNull(),
    commandId: text("command_id").notNull(),
    reference: text("reference").notNull(),
    identityKey: text("identity_key").notNull(),
    fingerprint: text("fingerprint"),
    intentSnapshot: text("intent_snapshot"),
    applicationSnapshot: text("application_snapshot"),
    provisioningIdentity: text("provisioning_identity"),
    decision: text("decision"),
    retentionUntil: millis("retention_until"),
  },
  (t) => [
    uniqueIndex("span_oauth_registration_command").on(t.moduleId, t.commandId),
  ],
);
