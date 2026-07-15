import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { syncEmbed } from "./sync_personal_site_embed.mjs";

async function put(root, relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

test("只同步固定白名单并清理旧产物", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pp-tools-sync-"));
  const embedRoot = path.join(root, "dist-embed");
  const publicRoot = path.join(root, "public");
  const companionRoot = path.join(root, "companion-dist");
  const siteRoot = path.join(root, "site");
  const targetRoot = path.join(siteRoot, "tools", "pp-tools");

  try {
    await put(embedRoot, "pp-tools-embed.js", "bundle");
    await put(embedRoot, "pp-tools-embed.css", "styles");
    await put(embedRoot, "private.txt", "do not copy");
    await put(publicRoot, "images/tools/delta-force.webp", "delta");
    await put(publicRoot, "images/tools/gesture-cam.webp", "camera");
    await put(publicRoot, "images/tools/milk-tea.webp", "milk");
    await put(publicRoot, "images/tools/local-chat.png", "chat");
    await put(publicRoot, "vision/models/face_landmarker.task", "face");
    await put(publicRoot, "vision/models/hand_landmarker.task", "hand");
    await put(publicRoot, "vision/wasm/runtime.js", "wasm-js");
    await put(publicRoot, "downloads/sanpingfang-miniprogram-source.zip", "zip-data");
    await put(companionRoot, "Delta-Companion.exe", "companion-binary");
    await put(companionRoot, "delta-companion-version.json", '{"version":"1.0.0"}');
    await put(targetRoot, "old.js", "old");

    const report = await syncEmbed({ embedRoot, publicRoot, companionRoot, siteRoot });

    await assert.rejects(readFile(path.join(targetRoot, "old.js")));
    await assert.rejects(readFile(path.join(targetRoot, "private.txt")));
    assert.equal(await readFile(path.join(targetRoot, "pp-tools-embed.js"), "utf8"), "bundle");
    assert.equal(await readFile(path.join(targetRoot, "images/tools/local-chat.png"), "utf8"), "chat");
    assert.equal(report.fileCount, 12);
    const sourceZip = path.join(publicRoot, "downloads/sanpingfang-miniprogram-source.zip");
    const targetZip = path.join(targetRoot, "downloads/sanpingfang-miniprogram-source.zip");
    assert.equal(await sha256(sourceZip), await sha256(targetZip));
    const sourceExe = path.join(companionRoot, "Delta-Companion.exe");
    const targetExe = path.join(targetRoot, "downloads", "Delta-Companion.exe");
    assert.equal(await sha256(sourceExe), await sha256(targetExe));
    assert.equal(report.exeSha256, await sha256(sourceExe));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("拒绝清理不符合固定结构的目标", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "pp-tools-sync-safe-"));
  try {
    await assert.rejects(
      syncEmbed({ embedRoot: root, publicRoot: root, siteRoot: path.parse(root).root }),
      /tools[/\\]pp-tools/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
