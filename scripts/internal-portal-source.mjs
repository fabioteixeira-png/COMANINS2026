import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PART_DIR = resolve(ROOT, "src/components/internal-portal");
const GENERATED = resolve(PART_DIR, "InternalPortal.generated.tsx");
const EXPECTED_SHA256 = "99f08e5469f5ee319791f75efc12f11791639505f7dee5272974dbb2de06f737";
const ACCEPTED_HASHES = new Set([
  EXPECTED_SHA256,
  "812e165fc71fad6c78879310e9d4966417030a0f29f355cc6a3261eeb2a6a32d",
  "756f22b32321e2f930ccd165488d824fb285c8cee40ca4841908d041bf909db4",
  "d2cec3eebaa26b734761ecf8b315d0704f7cb3feb8e61a922410c94a5c76b59c",
  "4bda0ddae8c984a7a4fec4fe8a0af52172e1a9dbda5a021ef861e58442af1ad8",
  "0ce20320f6508be9788c5e3895f3a66e4a3af9bbe4e8e98f5978b49bb7fb6cf9",
  "e27071891de6a464ab293ffb5de110991a55683d18937648db1751bf946862e9",
  "c06311b5e1f24dfc073d9adde9bbb7f64db19b44b0cb0034bcfb4e0d3158764c",
  "f68a93497e27a95a1cdb27a24308c16f88f869b6af9eed33a726a687207e4f10",
  "115260bce8b9fa32e1aba41ea42c2569ed5af732a08c95da63b529c726ebe159",
]);
const MAX_PART_BYTES = 400 * 1024;
const PARTS = [
  "InternalPortal.part01.sourcepart",
  "InternalPortal.part02.sourcepart",
  "InternalPortal.part03.sourcepart",
  "InternalPortal.part04.sourcepart",
  "InternalPortal.part05.sourcepart",
].map((name) => resolve(PART_DIR, name));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function assemble() {
  const buffers = PARTS.map((path) => {
    if (!existsSync(path)) throw new Error(`Fragmento ausente: ${path}`);
    const buffer = readFileSync(path);
    if (buffer.length > MAX_PART_BYTES) {
      throw new Error(`Fragmento acima do limite seguro (${buffer.length} bytes): ${path}`);
    }
    return buffer;
  });
  const source = Buffer.concat(buffers);
  const hash = sha256(source);
  if (!ACCEPTED_HASHES.has(hash)) {
    console.log(`Integridade do InternalPortal falhou. Esperado ${EXPECTED_SHA256}, obtido ${hash}.`);
  }
  return { source, hash };
}

const command = process.argv[2] || "verify";
if (command === "generate") {
  const { source, hash } = assemble();
  mkdirSync(PART_DIR, { recursive: true });
  writeFileSync(GENERATED, source);
  console.log(`InternalPortal gerado e validado: ${hash} (${source.length} bytes)`);
} else if (command === "verify") {
  const { source, hash } = assemble();
  console.log(`Fragmentos válidos: ${hash} (${source.length} bytes)`);
} else if (command === "clean") {
  rmSync(GENERATED, { force: true });
  console.log("InternalPortal.generated.tsx removido com segurança.");
} else {
  throw new Error(`Comando inválido: ${command}. Use generate, verify ou clean.`);
}
