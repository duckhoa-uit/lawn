import test from "node:test";
import assert from "node:assert/strict";
import { formatPercentage } from "@/lib/utils";

test("formatPercentage formats with one decimal by default", () => {
  assert.equal(formatPercentage(0.1234), "12.3%");
});

test("formatPercentage respects an explicit fractionDigits of 0", () => {
  assert.equal(formatPercentage(0.5, 0), "50%");
});

test("formatPercentage formats small values", () => {
  assert.equal(formatPercentage(0.001), "0.1%");
});
