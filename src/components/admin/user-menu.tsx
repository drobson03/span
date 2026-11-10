import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserWithRole } from "better-auth/plugins";
import {
  BanIcon,
  LogOutIcon,
  MoreVerticalIcon,
  ShieldIcon,
  ShieldOffIcon,
  UndoIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "~/lib/client/auth";
import { isAdmin } from "~/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Spinner } from "../ui/kibo-ui/spinner";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

// Better Auth's client resolves errors rather than throwing them
async function unwrap<T>(
  promise: Promise<{ error: { message?: string } | null; data: T }>,
) {
  const { data, error } = await promise;

  if (error) {
    throw new Error(error.message ?? "Something went wrong");
  }

  return data;
}

export default function UserMenu({
  user,
  isSelf,
}: {
  user: UserWithRole;
  isSelf: boolean;
}) {
  const queryClient = useQueryClient();
  const [banning, setBanning] = useState(false);
  const [banReason, setBanReason] = useState("");

  const mutation = useMutation({
    mutationFn: async ({
      action,
    }: {
      action: () => Promise<unknown>;
      success: string;
    }) => await action(),
    onSuccess: (_, { success }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(success);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const admin = isAdmin(user);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={mutation.isPending}>
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Admins can't lock themselves out */}
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={() =>
              mutation.mutate({
                action: () =>
                  unwrap(
                    authClient.admin.setRole({
                      userId: user.id,
                      role: admin ? "user" : "admin",
                    }),
                  ),
                success: admin
                  ? `${user.name} is no longer an admin`
                  : `${user.name} is now an admin`,
              })
            }
          >
            {admin ? (
              <ShieldOffIcon className="size-4" />
            ) : (
              <ShieldIcon className="size-4" />
            )}
            {admin ? "Remove admin" : "Make admin"}
          </DropdownMenuItem>
          {user.banned ? (
            <DropdownMenuItem
              onSelect={() =>
                mutation.mutate({
                  action: () =>
                    unwrap(authClient.admin.unbanUser({ userId: user.id })),
                  success: `Unbanned ${user.name}`,
                })
              }
            >
              <UndoIcon className="size-4" />
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() => setBanning(true)}
            >
              <BanIcon className="size-4" />
              Ban
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={() =>
              mutation.mutate({
                action: () =>
                  unwrap(
                    authClient.admin.revokeUserSessions({ userId: user.id }),
                  ),
                success: `Signed ${user.name} out everywhere`,
              })
            }
          >
            <LogOutIcon className="size-4" />
            Sign out everywhere
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={banning}
        onOpenChange={(open) => {
          setBanning(open);
          if (!open) setBanReason("");
        }}
      >
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(
                {
                  action: () =>
                    unwrap(
                      authClient.admin.banUser({
                        userId: user.id,
                        banReason: banReason.trim() || undefined,
                      }),
                    ),
                  success: `Banned ${user.name}`,
                },
                {
                  onSuccess: () => {
                    setBanning(false);
                    setBanReason("");
                  },
                },
              );
            }}
          >
            <DialogHeader>
              <DialogTitle>Ban {user.name}?</DialogTitle>
              <DialogDescription>
                They'll be signed out everywhere and won't be able to sign back
                in until unbanned.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ban-reason-${user.id}`}>Reason (optional)</Label>
              <Textarea
                id={`ban-reason-${user.id}`}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Spinner className="size-4" /> : "Ban"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
