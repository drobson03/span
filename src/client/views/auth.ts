import type { Html, HtmlBuilder } from "foldkit/html";
import { button } from "../../components/ui/button";
import { input } from "../../components/ui/input";
import { Message } from "../messages";
import type { Model } from "../model";
import { section } from "./shared";

export const loginView = (
  model: Model,
  h: HtmlBuilder<Message>,
  errorView: Html,
): Html =>
  h.main(
    [h.Class("min-h-screen grid place-items-center p-6")],
    [
      h.div(
        [h.Class("w-full max-w-sm")],
        [
          section(h, "Span", [
            h.p(
              [h.Class("text-muted-foreground mb-5")],
              ["Track your workouts. Build consistency. See your progress."],
            ),
            errorView,
            button(
              { onClick: Message.SignIn(), isDisabled: model.busy },
              model.busy ? "Connecting…" : "Continue with Google",
              h,
            ),
          ]),
        ],
      ),
    ],
  );
export const registrationView = (
  model: Model,
  h: HtmlBuilder<Message>,
  errorView: Html,
): Html =>
  h.main(
    [h.Class("min-h-screen grid place-items-center p-6")],
    [
      h.div(
        [h.Class("w-full max-w-sm")],
        [
          section(h, "Finish setting up Span", [
            h.p(
              [h.Class("mb-4 text-muted-foreground")],
              [
                "Choose the name shown on your account. Then sign in to start tracking.",
              ],
            ),
            errorView,
            h.form(
              [h.OnSubmit(Message.Register()), h.Class("space-y-4")],
              [
                input(
                  {
                    id: "registration-name",
                    label: "Your name",
                    value: model.registrationName,
                    onInput: (value) => Message.RegistrationName({ value }),
                  },
                  h,
                ),
                button(
                  {
                    type: "submit",
                    isDisabled: model.busy || !model.registrationName.trim(),
                  },
                  model.busy ? "Creating account…" : "Create account",
                  h,
                ),
              ],
            ),
          ]),
        ],
      ),
    ],
  );
