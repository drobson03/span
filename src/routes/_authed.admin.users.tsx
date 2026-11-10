import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import UserMenu from "~/components/admin/user-menu";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/kibo-ui/spinner";
import { authClient } from "~/lib/client/auth";
import { getUserQueryOptions } from "~/lib/server/auth/functions";
import { isAdmin } from "~/lib/utils";

const USERS_PAGE_SIZE = 25;

export const Route = createFileRoute("/_authed/admin/users")({
  loader: () => {
    return {
      crumb: "Users",
    };
  },
  component: AdminUsers,
});

function AdminUsers() {
  const { data: currentUser } = useQuery(getUserQueryOptions);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const deferredSearch = useDeferredValue(search.trim());

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "users", { search: deferredSearch, page }],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: USERS_PAGE_SIZE,
          offset: page * USERS_PAGE_SIZE,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(deferredSearch
            ? {
                searchValue: deferredSearch,
                searchField: deferredSearch.includes("@") ? "email" : "name",
                searchOperator: "contains",
              }
            : {}),
        },
      });

      if (error) {
        throw new Error(error.message ?? "Failed to load users");
      }

      return data;
    },
    placeholderData: keepPreviousData,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  return (
    <div className="bg-border -m-4 flex h-full grow flex-col gap-[0.0625rem] overflow-y-auto rounded-b-xl">
      <div className="bg-background flex flex-col gap-4 p-4 md:px-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <Input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {isPending ? (
        <div className="bg-background flex justify-center p-4">
          <Spinner className="size-4" />
        </div>
      ) : null}
      {error ? (
        <div className="bg-background text-destructive p-4 md:px-6">
          {error.message}
        </div>
      ) : null}
      {users.map((user) => (
        <div
          key={user.id}
          className="bg-background flex flex-row items-center justify-between gap-4 p-4 md:px-6"
        >
          <div className="flex min-w-0 flex-row items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="size-8 shrink-0 rounded-full"
              />
            ) : (
              <div className="bg-muted size-8 shrink-0 rounded-full" />
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-sm">
                {user.email}
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            {isAdmin(user) ? <Badge>Admin</Badge> : null}
            {user.banned ? <Badge variant="destructive">Banned</Badge> : null}
            <UserMenu user={user} isSelf={user.id === currentUser?.id} />
          </div>
        </div>
      ))}
      {!isPending && !error && users.length === 0 ? (
        <div className="bg-background text-muted-foreground p-4 text-center md:px-6">
          No users found
        </div>
      ) : null}
      {pageCount > 1 ? (
        <div className="bg-background flex flex-row items-center justify-between p-4 md:px-6">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((page) => page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((page) => page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
