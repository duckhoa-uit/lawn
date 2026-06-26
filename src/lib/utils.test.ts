import test from "node:test";
import assert from "node:assert/strict";
import { greetWinter } from "@/lib/utils";

test("greetWinter returns the expected greeting", () => {
  assert.equal(greetWinter(), "Hello, Winter!");
});
