import fs from "node:fs";

const directivePattern = new RegExp(`@ts-${"nocheck"}\\b`, "u");
const directiveName = `@ts-${"nocheck"}`;

export default {
  meta: {
    type: "problem",
    docs: {
      description: `Disallow ${directiveName} directives.`,
    },
  },
  create(context) {
    return {
      Program(node) {
        const source = fs.readFileSync(context.filename, "utf-8");
        if (!directivePattern.test(source)) {
          return;
        }

        context.report({
          node,
          message: `Do not use ${directiveName}; fix the types or narrow the file scope. Skill: wrdn-typescript-type-safety.`,
        });
      },
    };
  },
};
