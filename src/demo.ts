// Deno consumer of oresoftware/flags-2-env.
//
// Asserts the contract in EXPECTED.md. Exits non-zero on the first
// disagreement, which is what makes `docker run` the whole test.

// A static relative import into [install].dir, deliberately: a jsr: or https:
// specifier would put a network fetch between this fixture and the thing it is
// supposed to be testing, and would need --allow-net on top of the FFI grant.
import { parse } from "../.vendor/.zed/oresoftware/flags-2-env/clients/deno/lib.ts";

const repo = `${import.meta.dirname}/..`;
const configPath = `${repo}/.cli-flags.toml`;

// Deno FFI has no environment-variable fallback the way the Ruby and Bun
// clients do: the library path is passed per call, and the permission granted
// in the Dockerfile CMD has to name that same file.
const libraryPath = `${repo}/.vendor/.zed/oresoftware/flags-2-env/build/libflags2env.so`;

const defaults: Record<string, string> = {
  PORT: "3000",
  DEBUG: "false",
  APP_ENV: "development",
  COLOR: "true",
};
const overridden: Record<string, string> = {
  PORT: "8181",
  DEBUG: "true",
  APP_ENV: "production",
  COLOR: "true",
};

const cases: [string, string[], Record<string, string>][] = [
  ["defaults", [], defaults],
  ["long flags", ["--port", "8181", "--debug=t", "--mode", "production"], overridden],
  ["short flags", ["-p", "8181", "-d", "1", "--env", "production"], overridden],
  ["long aliases", ["--listen-port", "8181", "--debug", "1", "--mode", "production"], overridden],
  ["joined by =", ["--port=8181", "--debug=yes", "--mode=production"], overridden],
  ["negation", ["--no-color"], { ...defaults, COLOR: "false" }],
];

let failures = 0;

for (const [label, flags, expected] of cases) {
  const got = parse(["demo", ...flags], { configPath, libraryPath });
  const keys = Object.keys(expected).sort();
  const ok = keys.every((key) => got[key] === expected[key]) &&
    Object.keys(got).length === keys.length;

  if (!ok) failures += 1;
  console.log(`${(ok ? "ok" : "FAIL").padEnd(4)} ${label.padEnd(13)} demo ${flags.join(" ")}`);
  for (const key of keys) console.log(`       ${key}=${got[key] ?? "<missing>"}`);
  if (!ok) {
    console.error(`       expected ${JSON.stringify(expected)}`);
    console.error(`       got      ${JSON.stringify(got)}`);
  }
}

if (failures > 0) {
  console.error(`\ndeno-app: ${failures} of ${cases.length} cases disagree with the contract`);
  Deno.exit(1);
}

console.log(`\ndeno-app OK: ${cases.length} cases, via Deno.dlopen into oresoftware/flags-2-env`);
