// The built package as a user gets it: the library from dist, and the CLI run as a separate process on real files.
// Run after `npm run build`. No test framework, so it also runs on the oldest supported Node.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, typeset } from "../dist/index.js";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input, encoding: "utf8" });

assert.equal(typeset("Prêt ? Il est 8h30 : 29$"), "Prêt? Il est 8 h 30 : 29 $");
assert.equal(check("Prêt?").length, 0);

const dir = mkdtempSync(join(tmpdir(), "maisongr-typo-smoke-"));
try {
  const md = join(dir, "page.md");
  writeFileSync(md, "# Bienvenue !\n\nOuvert de 8h à 17h : `a ? b`\n");

  const found = run(["check", dir]);
  assert.equal(found.status, 1, found.stderr);
  assert.match(found.stdout, /page\.md:1:12 {2}high-punctuation/);
  assert.match(found.stdout, /4 problems in 1 file/);

  const json = JSON.parse(run(["check", md, "--json"]).stdout);
  assert.equal(json.ok, false);
  assert.equal(json.issues, 4);

  const fixed = run(["fix", md]);
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.equal(readFileSync(md, "utf8"), "# Bienvenue!\n\nOuvert de 8 h à 17 h : `a ? b`\n");
  assert.equal(run(["check", md]).status, 0);

  assert.equal(run(["--locale", "fr-FR"], "Prêt?").stdout, "Prêt ?");
  assert.equal(run(["check"]).status, 2);
  assert.equal(run(["--locale", "fr-BE"], "x").status, 2);
  assert.match(execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" }), /^\d+\.\d+\.\d+\n$/);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log("smoke: ok");
