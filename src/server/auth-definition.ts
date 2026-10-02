import { Auth, OAuth, Sessions } from "@yielded/auth";
import { AuthApi, Registration } from "../shared/auth";

export const AppAuth = Auth.make(AuthApi, {
  sessions: Sessions.stateful({ idleTimeout: "7 days", maxAge: "30 days" }),
  strategies: {
    oauth: OAuth.makeRegistration({
      namespace: "span/google",
      registration: Registration,
      registrationPolicy: {
        lifetimeMillis: 300_000,
        maximumVerificationAgeMillis: 300_000,
        retentionMillis: 86_400_000,
      },
    }),
  },
  defaultStrategy: "oauth",
});
