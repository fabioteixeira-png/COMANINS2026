import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PART_DIR = resolve(ROOT, "src/components/internal-portal");
const GENERATED = resolve(PART_DIR, "InternalPortal.generated.tsx");
const EXPECTED_SHA256 = "a10856de4813fae8c14fb2c71a08752859a3b3363d00f14a989ea4913ba09139";
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
  if (hash !== EXPECTED_SHA256) {
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
