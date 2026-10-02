import type { Html, HtmlBuilder } from "foldkit/html";
import { Card } from "../../components/ui/card";
import type { Message } from "../messages";

export const link = (h: HtmlBuilder<Message>, href: string, text: string) =>
  h.a([h.Href(href), h.Class("text-sm underline underline-offset-4")], [text]);
export const section = (
  h: HtmlBuilder<Message>,
  title: string,
  children: (Html | string)[],
) =>
  Card(
    {},
    [
      Card.header({}, [Card.title({}, [title], h)], h),
      Card.content({}, children, h),
    ],
    h,
  );
