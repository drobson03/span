// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

const appRoot = document.getElementById("app");

if (appRoot) {
  mount(() => <StartClient />, appRoot);
}
