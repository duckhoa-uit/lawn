import test from "node:test";
import assert from "node:assert/strict";
import { greetSummer } from "@/lib/utils";

test("greetSummer returns 'Hello, Summer!'", () => {
  assert.equal(greetSummer(), "Hello, Summer!");
});
