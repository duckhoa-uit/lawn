import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicWatchUrl,
  buildShareUrl,
  copyToClipboard,
} from "./shareClipboard";

type WriteText = (text: string) => Promise<void>;

interface NavigatorWithClipboard {
  clipboard?: { writeText: WriteText };
}

/**
 * Stub `navigator.clipboard` so the helper can be exercised without a real
 * browser Clipboard API. Restored to `undefined` after the suite so the stub
 * never leaks into other test files.
 */
function setClipboard(writeText: WriteText | undefined): void {
  const nav = globalThis.navigator as unknown as NavigatorWithClipboard;
  nav.clipboard = writeText === undefined ? undefined : { writeText };
}

after(() => setClipboard(undefined));

test("buildShareUrl composes the restricted share url", () => {
  assert.equal(
    buildShareUrl("https://lawn.example", "abc123"),
    "https://lawn.example/share/abc123",
  );
});

test("buildPublicWatchUrl composes the public watch url", () => {
  assert.equal(
    buildPublicWatchUrl("https://lawn.example", "vid_42"),
    "https://lawn.example/watch/vid_42",
  );
});

test("copyToClipboard returns true and writes the text on success", async () => {
  const written: string[] = [];
  setClipboard((text) => {
    written.push(text);
    return Promise.resolve();
  });

  const ok = await copyToClipboard("https://lawn.example/share/abc123");

  assert.equal(ok, true);
  assert.deepEqual(written, ["https://lawn.example/share/abc123"]);
});

test("copyToClipboard returns false when the clipboard write rejects", async () => {
  const calls: string[] = [];
  setClipboard((text) => {
    calls.push(text);
    return Promise.reject(new Error("clipboard permission denied"));
  });

  const ok = await copyToClipboard("https://lawn.example/share/abc123");

  // A rejected write (permission denied / insecure context) must not surface a
  // success state, and the rejection must be swallowed rather than thrown.
  assert.equal(ok, false);
  assert.deepEqual(calls, ["https://lawn.example/share/abc123"]);
});

test("copyToClipboard returns false when the Clipboard API is unavailable", async () => {
  setClipboard(undefined);

  const ok = await copyToClipboard("https://lawn.example/share/abc123");

  assert.equal(ok, false);
});

test("copyToClipboard does not report success before the write settles", async () => {
  let resolveWrite: () => void = () => {};
  setClipboard(
    () =>
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      }),
  );

  let result: boolean | undefined;
  const pending = copyToClipboard("https://lawn.example/share/abc123").then(
    (ok) => {
      result = ok;
    },
  );

  // While the clipboard write is still pending, the result must not have
  // resolved — so a success state gated on this value cannot be shown early.
  assert.equal(result, undefined);

  resolveWrite();
  await pending;

  assert.equal(result, true);
});
