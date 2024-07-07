import type { RouteSectionProps } from "@solidjs/router";
import Sidebar from "~/components/sidebar";

export default function CoreLayout(props: RouteSectionProps) {
  return (
    <>
      <Sidebar />
      {props.children}
    </>
  );
}
