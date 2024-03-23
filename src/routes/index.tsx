import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getAuthenticatedUser } from "~/server/utils";

export const route = {
  load: () => getAuthenticatedUser(),
};

export default function Home() {
  const user = createAsync(() => getAuthenticatedUser());
  return (
    <main>
      <Title>Hello World</Title>
      <h1>{`Hey ${user()?.name}`}</h1>
      <p>
        Visit{" "}
        <a href="https://start.solidjs.com" target="_blank">
          start.solidjs.com
        </a>{" "}
        to learn how to build SolidStart apps.
      </p>
    </main>
  );
}
