import { build } from "esbuild";

const buildResult = await build({
  entryPoints: [new URL("../smoke/browser-entry.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome110", "firefox115", "safari16.4"],
  minify: true,
  sourcemap: false,
  write: false
});

const output = buildResult.outputFiles[0];
if (!output) throw new Error("Browser bundle was not generated");
if (output.contents.byteLength > 40_000) {
  throw new Error(`Browser bundle exceeds 40,000 bytes: ${output.contents.byteLength}`);
}
const source = output.text;
if (/\bnode:|\bprocess\.|\brequire\(/u.test(source)) {
  throw new Error("Browser bundle contains a Node.js-only reference");
}

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const module = await import(moduleUrl);
const result = module.browserSmokeResult;
if (result?.decision !== "reject" || !result.issues?.some((issue) => issue.code === "INSULT")) {
  throw new Error(`Unexpected browser bundle result: ${JSON.stringify(result)}`);
}

console.log(`browser bundle smoke: ok (${output.contents.byteLength} bytes minified)`);
