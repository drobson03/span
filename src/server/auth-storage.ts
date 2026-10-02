import { Schema as AuthSchema, OAuth, Sessions } from "@yielded/auth";
import { PersistenceMappingError } from "@yielded/auth-persistence/Adapter";
import * as Mapping from "@yielded/auth-persistence-drizzle";
import * as Native from "@yielded/auth-persistence-drizzle/Postgres";
import { eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { user } from "../lib/server/db/schema/auth";
import { Registration } from "../shared/auth";
import { AppAuth } from "./auth-definition";
import {
  credentials,
  oauthCommands,
  oauthFlows,
  oauthIdentities,
  oauthIntents,
  oauthLogins,
} from "./auth-schema";

const error = () =>
  PersistenceMappingError.make({ operation: "span.oauth", cause: undefined });
const uuid = Effect.sync(() => crypto.randomUUID());
const subjectId: Mapping.SubjectIdCodec<string> = {
  toNative: (id) => Effect.succeed(id),
  toSubject: (id) =>
    Schema.decodeUnknownEffect(AuthSchema.SubjectId)(id).pipe(
      Effect.mapError(error),
    ),
  equals: (a, b) => a === b,
};
const subject = {
  table: user,
  id: "id",
  status: "enabled",
  securityRevision: "securityRevision",
  isActiveStatus: (v: unknown) => v === true,
  activeCondition: eq(user.enabled, true),
} as const;
const authority = {
  table: credentials,
  subjectId: "subjectId",
  credentialId: "credentialId",
  revision: "revision",
  status: "active",
  isActiveStatus: (v: unknown) => v === true,
  activeCondition: eq(credentials.active, true),
  encodeInsert: ({
    subjectId,
    credentialId,
    revision,
  }: {
    subjectId: string;
    credentialId: string;
    revision: Sessions.SecurityRevision;
  }) => ({ subjectId, credentialId, revision, active: true }),
} as const;
const credential = {
  table: oauthLogins,
  moduleId: "moduleId",
  credentialId: "credentialId",
  subjectId: "subjectId",
  identityKey: "identityKey",
  credentialRevision: "credentialRevision",
  status: "active",
  isActiveStatus: (v: unknown) => v === true,
  activeCondition: eq(oauthLogins.active, true),
  removal: "delete",
  encodeInsert: (input: {
    moduleId: string;
    subjectId: string;
    identityKey: string;
    credentialId: string;
    credentialRevision: Sessions.SecurityRevision;
  }) => ({ ...input, active: true }),
} as const;
const clock: Mapping.OAuthClock = {
  encodeInstant: (v) => v,
  decodeInstant: Schema.decodeUnknownSync(OAuth.OAuthInstant),
  engineNowMillis: sql`floor(extract(epoch from clock_timestamp()) * 1000)::bigint`,
};
const flow = {
  table: oauthFlows,
  moduleId: "moduleId",
  flowId: "flowId",
  commandId: "commandId",
  purpose: "purpose",
  generation: "generation",
  state: "state",
  version: "version",
  stateDigest: "stateDigest",
  binderVerifier: "binderVerifier",
  binderExpiresAt: "binderExpiresAt",
  snapshot: "snapshot",
  issuedAt: "issuedAt",
  expiresAt: "expiresAt",
  claimId: "claimId",
  claimedAt: "claimedAt",
  claimExpiresAt: "claimExpiresAt",
  retentionUntil: "retentionUntil",
  encodeInsert: (input: {
    moduleId: string;
    flowId: string;
    purpose: "sign-in" | "link";
  }) => input,
} as const;
const ownership = {
  mode: "integrated",
  tuple: {
    table: oauthIdentities,
    identityKey: "identityKey",
    provider: "provider",
    issuer: "issuer",
    externalSubject: "externalSubject",
    state: "state",
    version: "version",
    subjectId: "subjectId",
    reservation: "reservation",
    encodeInsert: (input: {
      identityKey: string;
      identity: typeof OAuth.OAuthExternalIdentity.Type;
      subjectId?: string;
    }) => ({
      identityKey: input.identityKey,
      provider: input.identity.provider,
      issuer: input.identity.issuer,
      externalSubject: input.identity.subject,
      subjectId: input.subjectId,
      state: "Unowned",
      version: crypto.randomUUID(),
    }),
  },
} as const;
const signIn = {
  subject,
  authority,
  subjectId,
  clock,
  flow,
  credential,
  ownership: {
    table: oauthIdentities,
    identityKey: "identityKey",
    provider: "provider",
    issuer: "issuer",
    externalSubject: "externalSubject",
    subjectId: "subjectId",
    ownedCondition: eq(oauthIdentities.state, "Owned"),
    decodeSubjectId: (row: typeof oauthIdentities.$inferSelect) =>
      row.subjectId!,
  },
  constraints: Mapping.requiredOAuthSignInConstraints,
} as const;
const intent = {
  table: oauthIntents,
  moduleId: "moduleId",
  reference: "reference",
  flowId: "flowId",
  claimId: "claimId",
  identityKey: "identityKey",
  version: "version",
  state: "state",
  snapshot: "snapshot",
  commandId: "commandId",
  fingerprint: "fingerprint",
  pendingReference: "pendingReference",
  expiresAt: "expiresAt",
  retentionUntil: "retentionUntil",
  encodeInsert: (i: OAuth.OAuthRegistrationIntent) => ({
    moduleId: i.context.moduleId,
    reference: i.reference,
    flowId: i.context.flowId,
    claimId: i.claimId,
    identityKey: "",
  }),
} as const;
const intents = {
  signIn,
  ownership,
  intent,
  tupleConstraints: Mapping.requiredOAuthTupleConstraints,
  registrationConstraints: {
    intentReference:
      Mapping.requiredOAuthRegistrationConstraints.intentReference,
    intentFlow: Mapping.requiredOAuthRegistrationConstraints.intentFlow,
  },
  eligibility: {
    condition: ({ intent }: { intent: OAuth.OAuthRegistrationIntent }) =>
      sql`${intent.identity.provider === "google" && intent.identity.issuer === "https://accounts.google.com" && intent.profile?.emailVerified === true}`,
  },
};
const registration = {
  mode: "atomic",
  subjectId,
  subject,
  credential,
  authority,
  ownership,
  intent,
  clock,
  command: {
    table: oauthCommands,
    moduleId: "moduleId",
    commandId: "commandId",
    reference: "reference",
    identityKey: "identityKey",
    fingerprint: "fingerprint",
    intentSnapshot: "intentSnapshot",
    applicationSnapshot: "applicationSnapshot",
    provisioningIdentity: "provisioningIdentity",
    decision: "decision",
    retentionUntil: "retentionUntil",
    encodeInsert: (i: {
      intent: OAuth.OAuthRegistrationIntent;
      commandId: string;
      fingerprint: string;
      registration: typeof Registration.Type;
      provisioningIdentity: string;
    }) => ({
      moduleId: i.intent.context.moduleId,
      reference: i.intent.reference,
      commandId: i.commandId,
      identityKey: "",
    }),
  },
  tupleConstraints: Mapping.requiredOAuthTupleConstraints,
  constraints: Mapping.requiredOAuthRegistrationConstraints,
  inspect: ({ registration }: { registration: typeof Registration.Type }) =>
    Effect.succeed({
      fingerprint: JSON.stringify(registration),
      eligible: registration.displayName.trim().length > 0,
    }),
  snapshot: (r: typeof Registration.Type) => Effect.succeed(r),
  application: {
    encode: JSON.stringify,
    decode: (s: string) =>
      Schema.decodeUnknownSync(Registration)(JSON.parse(s)),
  },
  eligibility: {
    admission: ({ intent }: { intent: OAuth.OAuthRegistrationIntent }) =>
      sql`${intent.profile?.emailVerified === true}`,
    postcondition: ({ nativeSubjectId }: { nativeSubjectId?: string }) =>
      sql`exists(select 1 from ${user} where ${user.id} = ${nativeSubjectId ?? ""} and ${user.enabled} = true)`,
  },
  allocateProvisioningIdentity: uuid,
  allocateSubjectId: uuid,
  allocateCredentialId: uuid,
  allocateRevision: uuid.pipe(Effect.map(Sessions.SecurityRevision.make)),
  retentionMillis: 86_400_000,
  encodeSubjectInsert: (
    {
      intent,
      registration,
    }: {
      intent: OAuth.OAuthRegistrationIntent;
      registration: typeof Registration.Type;
    },
    ids: { subjectId: string; securityRevision: Sessions.SecurityRevision },
  ) => ({
    id: ids.subjectId,
    securityRevision: ids.securityRevision,
    enabled: true,
    name: registration.displayName.trim(),
    email: intent.profile?.email ?? "",
    emailVerified: true,
    image: intent.profile?.avatarUrl ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
} as const;

export const OAuthStorageLive = Layer.effectContext(
  Effect.gen(function* () {
    const signInServices = yield* Native.makeOAuthSignInServices(signIn);
    const intentServices =
      yield* Native.makeOAuthRegistrationIntentServices(intents);
    const registrationServices =
      yield* Native.makeOAuthRegistrationServices(registration);
    return Context.make(
      OAuth.OAuthSignInPersistence,
      signInServices.oauthSignInPersistence,
    ).pipe(
      Context.add(
        OAuth.OAuthRegistrationIntents,
        intentServices.oauthRegistrationIntents,
      ),
      Context.add(
        AppAuth.strategies.oauth.registration.RegistrationAuthority,
        registrationServices.registrationAuthority,
      ),
    );
  }),
);
