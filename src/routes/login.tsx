import { createFileRoute } from "@tanstack/react-router";
import { MoveUpRightIcon } from "lucide-react";
import GoogleIcon from "~/components/icons/google";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { authClient } from "~/lib/client/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      <Card className="w-full max-w-sm gap-2">
        <CardHeader>
          <CardTitle className="flex w-full items-center justify-center gap-x-1">
            <MoveUpRightIcon className="size-10" />
            <h1 className="text-2xl font-semibold">Span</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={async () => {
              await authClient.signIn.social({ provider: "google" });
            }}
          >
            Login with Google
            <GoogleIcon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
