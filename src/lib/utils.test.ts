import test from "node:test";
import assert from "node:assert/strict";
import { greetAutumn } from "@/lib/utils";

test("greetAutumn returns Hello, Autumn!", () => {
  assert.equal(greetAutumn(), "Hello, Autumn!");
});
