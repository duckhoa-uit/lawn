import test from "node:test";
import assert from "node:assert/strict";
import { formatBitrate } from "@/lib/utils";

test("formatBitrate formats bits per second into human-readable units", () => {
  assert.equal(formatBitrate(500), "500 bps");
  assert.equal(formatBitrate(1500), "1.5 kbps");
  assert.equal(formatBitrate(2_000_000), "2.0 Mbps");
});

test("formatBitrate handles zero", () => {
  assert.equal(formatBitrate(0), "0 bps");
});
