import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "~/app.css";
import Sidebar from "~/components/sidebar";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Suspense>
            <Sidebar />
            {props.children}
          </Suspense>
        </MetaProvider>
      )}
      explicitLinks
    >
      <FileRoutes />
    </Router>
  );
}
