import assert from "node:assert/strict";
import test from "node:test";
import * as Effect from "effect/Effect";
import { existingBranchOnly } from "../infra/database.ts";

function fixture() {
  const calls = [];
  const provider = existingBranchOnly({
    reconcile: (input) =>
      Effect.sync(() => {
        calls.push("reconcile");
        return input.output;
      }),
    delete: () =>
      Effect.sync(() => {
        calls.push("delete");
      }),
  });
  const input = {
    news: { name: "main", project: { projectId: "existing-project" } },
    output: {
      branchName: "main",
      projectId: "existing-project",
      branchId: "existing-branch",
    },
  };
  return { provider, calls, input };
}

test("a missing or replaced branch cannot trigger native provider creation", async () => {
  const { provider, calls, input } = fixture();
  await assert.rejects(
    Effect.runPromise(provider.reconcile({ ...input, output: undefined })),
    /must already exist/,
  );
  assert.deepEqual(calls, []);
});

test("changing the configured project or branch cannot retarget existing data", async () => {
  for (const news of [
    { name: "another-branch", project: { projectId: "existing-project" } },
    { name: "main", project: { projectId: "another-project" } },
  ]) {
    const { provider, calls, input } = fixture();
    await assert.rejects(
      Effect.runPromise(provider.reconcile({ ...input, news })),
      /retarget/,
    );
    assert.deepEqual(calls, []);
  }
});

test("an unchanged existing branch delegates to the native Neon provider", async () => {
  const { provider, calls, input } = fixture();
  assert.deepEqual(
    await Effect.runPromise(provider.reconcile(input)),
    input.output,
  );
  assert.deepEqual(calls, ["reconcile"]);
});

test("stack removal cannot delete the existing branch", async () => {
  const { provider, calls } = fixture();
  await Effect.runPromise(provider.delete({}));
  assert.deepEqual(calls, []);
});
