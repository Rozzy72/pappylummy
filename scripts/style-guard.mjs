import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
const root = resolve(import.meta.dirname, "..");
const skip = new Set([
  "node_modules",
  ".git",
  ".next",
  "work",
  "temp-product-images",
  "local-checkout-runner",
]);
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    skip.has(e.name)
      ? []
      : e.isDirectory()
        ? files(join(dir, e.name))
        : [join(dir, e.name)],
  );
const errors = [];
for (const file of files(root)) {
  const path = relative(root, file).replaceAll("\\", "/");
  if (
    /\.(css|scss|sass|less)$/.test(path) &&
    !["src/app/globals.css", "packages/tokens/src/tokens.css"].includes(path)
  )
    errors.push(`${path}: stylesheet outside allowlist`);
  if (!/^(src|packages\/ui)\//.test(path) || !/\.tsx?$/.test(path)) continue;
  const source = readFileSync(file, "utf8");
  if (
    /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\()/.test(source)
  )
    errors.push(`${path}: raw color`);
  const ast = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function visit(node) {
    if (ts.isJsxAttribute(node) && path.startsWith("src/")) {
      const name = node.name.getText(ast);
      // next/font provides generated font variable class names, not call-site styling.
      const font =
        path === "src/app/layout.tsx" &&
        name === "className" &&
        node.getText(ast).includes("geistSans.variable") &&
        node.getText(ast).includes("geistMono.variable");
      // Explicitly reviewed marketing composition; tokens/values remain guarded.
      const editorial = path === "src/components/home/campaign.tsx" ||
        path === "src/components/home/football-discovery.tsx";
      if ((name === "className" && !font && !editorial) || name === "style")
        errors.push(`${path}: use shared UI props instead of ${name}`);
    }
    if (
      ts.isVariableDeclaration(node) &&
      path.startsWith("src/") &&
      ["TONES", "VARIANTS", "SIZES", "RADII", "SPACE"].includes(
        node.name.getText(ast),
      )
    )
      errors.push(`${path}: vocabulary must come from @sd/ui`);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (
    /\[[^\]]*(?:#[0-9a-f]|\d+(?:px|rem|dvh|vw)|\d+\/\d+)[^\]]*\]/i.test(source)
  )
    errors.push(`${path}: arbitrary utility value`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "Styling policy passed: shared props, tokens, vocabulary and CSS allowlist.",
);
