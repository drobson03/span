import { Runtime } from "foldkit";
import { init } from "./client/init";
import { Message } from "./client/messages";
import { Model } from "./client/model";
import { update } from "./client/update";
import { view } from "./client/view";
import "./app.css";

Runtime.run(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.querySelector("#root"),
    routing: {
      onUrlRequest: (request) => Message.ClickedLink({ request }),
      onUrlChange: (url) => Message.ChangedUrl({ url }),
    },
    devTools: { Message },
  }),
);
