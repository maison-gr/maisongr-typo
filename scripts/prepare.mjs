// npm's `prepare`: builds dist/ from src/. Runs after `npm install` in a checkout, before `npm pack` and publishing,
// and when the package is installed from git (pre-commit installs its hooks with `npm install -g git+file://…`).
// In that last case npm doesn't install the development tools, so the compiler is installed here first: only
// typescript and @types/node, at the versions package.json names, next to the source and never saved.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const run = (args) => {
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const tsc = "node_modules/typescript/bin/tsc";
if (!existsSync(tsc)) {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("prepare.mjs runs from npm (npm install, npm pack)");
  const dev = JSON.parse(readFileSync("package.json", "utf8")).devDependencies;
  run([npm, "install", "--global=false", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock",
    `typescript@${dev.typescript}`, `@types/node@${dev["@types/node"]}`]);
}
run([tsc, "-p", "tsconfig.build.json"]);
