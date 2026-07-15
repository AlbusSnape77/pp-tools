import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EMBED_FILES = ["pp-tools-embed.js", "pp-tools-embed.css"];
const PUBLIC_FILES = [
  "images/tools/delta-force.webp",
  "images/tools/gesture-cam.webp",
  "images/tools/milk-tea.webp",
  "images/tools/local-chat.png",
  "vision/models/face_landmarker.task",
  "vision/models/hand_landmarker.task",
  "downloads/sanpingfang-miniprogram-source.zip",
];

async function listFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function ensureFiles(entries) {
  for (const entry of entries) {
    const file = await stat(entry.source).catch(() => null);
    if (!file?.isFile()) throw new Error(`Missing required embed file: ${entry.source}`);
  }
}

async function hashFile(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

export async function syncEmbed({ embedRoot, publicRoot, companionRoot, siteRoot }) {
  const resolvedSite = path.resolve(siteRoot);
  if (resolvedSite === path.parse(resolvedSite).root) {
    throw new Error("Site root must be a project directory containing tools/pp-tools.");
  }
  const targetRoot = path.resolve(resolvedSite, "tools", "pp-tools");
  const expectedRelative = path.join("tools", "pp-tools");
  if (path.relative(resolvedSite, targetRoot) !== expectedRelative) {
    throw new Error("Sync target must be exactly <site-root>/tools/pp-tools.");
  }

  const wasmFiles = await listFiles(publicRoot, path.join("vision", "wasm")).catch(() => []);
  if (!wasmFiles.length) throw new Error("Missing required embed directory: vision/wasm");

  const entries = [
    ...EMBED_FILES.map((relativePath) => ({ source: path.join(embedRoot, relativePath), relativePath })),
    ...PUBLIC_FILES.map((relativePath) => ({ source: path.join(publicRoot, relativePath), relativePath })),
    ...wasmFiles.map((relativePath) => ({ source: path.join(publicRoot, relativePath), relativePath })),
    { source: path.join(companionRoot, "Delta-Companion.exe"), relativePath: "downloads/Delta-Companion.exe" },
    { source: path.join(companionRoot, "delta-companion-version.json"), relativePath: "downloads/delta-companion-version.json" },
  ];
  await ensureFiles(entries);

  await rm(targetRoot, { recursive: true, force: true });
  let totalBytes = 0;
  for (const entry of entries) {
    const target = path.join(targetRoot, entry.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(entry.source, target);
    totalBytes += (await stat(target)).size;
  }

  const zipRelative = "downloads/sanpingfang-miniprogram-source.zip";
  const zipSha256 = await hashFile(path.join(targetRoot, zipRelative));
  const exeRelative = "downloads/Delta-Companion.exe";
  const exePath = path.join(targetRoot, exeRelative);
  const exeSha256 = await hashFile(exePath);
  const exeBytes = (await stat(exePath)).size;
  return { targetRoot, fileCount: entries.length, totalBytes, zipSha256, exeSha256, exeBytes };
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function main() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDirectory, "..");
  const siteRoot = readArgument("--site-root");
  if (!siteRoot) throw new Error("Usage: node sync_personal_site_embed.mjs --site-root <path>");
  const companionRoot = readArgument("--companion-root");
  const report = await syncEmbed({
    embedRoot: path.join(projectRoot, "frontend", "dist-embed"),
    publicRoot: path.join(projectRoot, "frontend", "public"),
    companionRoot: companionRoot ? path.resolve(companionRoot) : path.join(projectRoot, "companion", "dist"),
    siteRoot,
  });
  console.log(`Synced ${report.fileCount} files (${report.totalBytes} bytes) to ${report.targetRoot}`);
  console.log(`Mini program ZIP SHA-256: ${report.zipSha256}`);
  console.log(`Delta Companion: ${report.exeBytes} bytes, SHA-256 ${report.exeSha256}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
