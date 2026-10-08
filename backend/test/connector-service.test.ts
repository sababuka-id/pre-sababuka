import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/services/connector-service.js";

test("parseCsv preserves quoted commas and escaped quotes", () => {
  const rows = parseCsv('tahun,wilayah,nilai,catatan\n2025,6203,"24,07","Angka ""resmi"""\n');
  assert.deepEqual(rows, [{ tahun: "2025", wilayah: "6203", nilai: "24,07", catatan: 'Angka "resmi"' }]);
});

test("parseCsv returns an empty list for header-only resources", () => {
  assert.deepEqual(parseCsv("tahun,nilai\n"), []);
});
