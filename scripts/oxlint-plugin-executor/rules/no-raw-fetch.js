import {
  getPropertyName,
  isDeclarationFile,
  isIdentifier,
  unwrapExpression,
} from "../utils.js";

const message =
  "Do not call raw fetch in core/plugin code. Route HTTP through Effect HttpClient or an explicit package-local boundary. Skill: wrdn-effect-raw-fetch-boundary.";

const shouldCheck = (filename) => !isDeclarationFile(filename);

const isGlobalFetchMember = (node) => {
  const expression = unwrapExpression(node);
  if (expression?.type !== "MemberExpression") {
    return false;
  }
  const object = unwrapExpression(expression.object);
  const property = getPropertyName(expression.property);
  return (
    property === "fetch" &&
    (isIdentifier(object, "globalThis") ||
      isIdentifier(object, "window") ||
      isIdentifier(object, "self"))
  );
};

const isBareFetchCall = (node) => isIdentifier(unwrapExpression(node), "fetch");

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw fetch outside approved Effect HTTP boundaries.",
    },
  },
  create(context) {
    if (!shouldCheck(context.filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (isBareFetchCall(node.callee) || isGlobalFetchMember(node.callee)) {
          context.report({ node: node.callee, message });
        }
      },
      MemberExpression(node) {
        if (
          node.parent?.type === "CallExpression" &&
          node.parent.callee === node
        ) {
          return;
        }
        if (isGlobalFetchMember(node)) {
          context.report({ node, message });
        }
      },
    };
  },
};
