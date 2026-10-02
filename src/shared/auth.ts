import {
  AuthContract,
  Hooks,
  Identity,
  OAuth,
  Operations,
} from "@yielded/auth";
import { Schema } from "effect";

export const Claims = Schema.Struct({
  displayName: Schema.String,
  email: Schema.String,
});
export const Registration = Schema.Struct({
  displayName: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
});
export const AuthApi = AuthContract.make("span/auth", {
  claims: Claims,
  actions: (sessions) => ({
    signIn: AuthContract.oauthSignIn(),
    completeSignIn: AuthContract.oauthCompleteSignIn(sessions),
    register: AuthContract.action({
      payload: Schema.Struct({
        reference: OAuth.OAuthRegistrationReference,
        flowId: Operations.RequestBindingFlowId,
        commandId: OAuth.OAuthCommandId,
        registration: Registration,
      }),
      success: OAuth.OAuthRegistrationResult,
      error: Schema.Union([
        OAuth.OAuthRejected,
        OAuth.OAuthUnavailable,
        OAuth.OAuthMethodUnsupported,
        Hooks.HookDenied,
        Identity.IdentityConflict,
      ]),
      mode: "mutation",
      replay: "single-use",
      credentials: true,
      requestFields: {
        requestBinding: "request-binding",
        credential: "registration",
      },
    }),
  }),
});
