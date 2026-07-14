import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";


const stylesheet = readFileSync(resolve("src/tools/delta-force/delta-force.css"), "utf8");


it("keeps unselected players gray and highlights only the selected player in green", () => {
  expect(stylesheet).toMatch(/\.delta-app\s+\.row-item\s*\{[^}]*background:\s*var\(--surface-2\)/s);
  expect(stylesheet).toMatch(/\.delta-app\s+\.row-item\.active\s*\{[^}]*background:\s*var\(--grn\)/s);
});
