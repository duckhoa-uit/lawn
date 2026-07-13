import test from "node:test";
import assert from "node:assert/strict";
import { copyToClipboard } from "@/lib/clipboard";

type WriteText = (text: string) => Promise<void>;

function setClipboard(writeText: WriteText | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  });
}

test("copyToClipboard awaits the clipboard write and returns true on success", async () => {
  const calls: string[] = [];
  let resolveWrite: () => void = () => undefined;
  const writeText: WriteText = (text) => {
    calls.push(text);
    return new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
  };
  setClipboard(writeText);

  const promise = copyToClipboard("https://example.com/share/abc");

  // While the clipboard write is still pending, the helper must not have
  // resolved yet — it is awaiting the underlying promise.
  let settled = false;
  promise.then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(settled, false, "should not resolve before clipboard write");
  assert.deepEqual(calls, ["https://example.com/share/abc"]);

  resolveWrite();
  const result = await promise;

  assert.equal(result, true, "should report success after the write completes");
});

test("copyToClipboard passes the exact URL through to the clipboard", async () => {
  const calls: string[] = [];
  setClipboard((text) => {
    calls.push(text);
    return Promise.resolve();
  });

  const result = await copyToClipboard("https://lawn.test/watch/public-123");

  assert.equal(result, true);
  assert.deepEqual(calls, ["https://lawn.test/watch/public-123"]);
});

test("copyToClipboard returns false when clipboard permission is denied", async () => {
  const calls: string[] = [];
  setClipboard((text) => {
    calls.push(text);
    return Promise.reject(new DOMException("Clipboard write blocked", "NotAllowedError"));
  });

  const result = await copyToClipboard("https://example.com/share/xyz");

  assert.equal(result, false, "must not report success on rejection");
  assert.deepEqual(calls, ["https://example.com/share/xyz"]);
  // And it must not throw an unhandled rejection.
});

test("copyToClipboard returns false when the write rejects for any reason", async () => {
  setClipboard(() => Promise.reject(new Error("insecure context")));

  const result = await copyToClipboard("https://example.com/share/xyz");

  assert.equal(result, false);
});

test("copyToClipboard returns false when the Clipboard API is unavailable", async () => {
  setClipboard(undefined);

  const result = await copyToClipboard("https://example.com/share/xyz");

  assert.equal(result, false, "insecure contexts without clipboard must not show success");
});
