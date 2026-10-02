import { format } from "date-fns";
import { Option } from "effect";
import type { Runtime } from "foldkit";
import { LoadData } from "./commands";
import { blankDraft } from "./draft";
import type { Message } from "./messages";
import type { Model } from "./model";

export const calendarMonth = (path: string) => {
  const match = /^\/calendar\/(\d{4})\/(\d{1,2})$/.exec(path);
  if (
    match &&
    Number(match[2]) >= 1 &&
    Number(match[2]) <= 12 &&
    Number(match[1]) >= 1000
  ) {
    return `${match[1]}-${match[2]!.padStart(2, "0")}-01`;
  }
  return format(new Date(), "yyyy-MM-01");
};
export const init: Runtime.RoutingApplicationInit<Model, Message> = (url) => ({
  model: {
    path: url.pathname,
    search: Option.getOrElse(url.search, () => ""),
    session: null,
    workouts: [],
    exerciseTypes: [],
    draft: blankDraft(),
    tags: [],
    metric: "maxWeight",
    month: calendarMonth(url.pathname),
    loading: true,
    busy: false,
    error: "",
    registrationName: "",
    deleteId: null,
  },
  commands: [LoadData()],
});
