import { createFileRoute } from "@tanstack/react-router";
import GoogleIcon from "~/components/icons/google";
import MoveUpRightIcon from "~/components/icons/span";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center border p-4 sm:max-w-sm md:px-6">
        <div className="mb-2 flex w-full items-center justify-center space-x-2 p-4">
          <MoveUpRightIcon className="size-10" />
          <h1 className="text-2xl font-semibold text-black">Span</h1>
        </div>
        <a
          className="flex w-full items-center justify-between border px-3 py-2 transition-colors hover:bg-gray-50"
          href="/api/auth/google/login"
        >
          Login with Google
          <GoogleIcon className="size-8" />
        </a>
      </div>
    </div>
  );
}
