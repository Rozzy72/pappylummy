// Compile the actual shared UI package for the existing isolated CJS harnesses.
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
let cached;
export function loadUi() {
  if (cached) return cached;
  const load = (file) => {
    const compiledModule = new Module(file);
    compiledModule.require = (name) =>
      name === "./jersey"
        ? load("packages/ui/src/jersey.tsx")
        : name === "./scales"
          ? load("packages/ui/src/scales.ts")
          : name === "next/link"
            ? {
                default: ({ children, ...props }) =>
                  require("react").createElement("a", props, children),
              }
            : require(name);
    compiledModule._compile(
      ts.transpileModule(
        readFileSync(new URL("../" + file, import.meta.url), "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        },
      ).outputText,
      file,
    );
    return compiledModule.exports;
  };
  cached = load("packages/ui/src/index.tsx");
  return cached;
}
