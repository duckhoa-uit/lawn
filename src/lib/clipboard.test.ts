import test from "node:test";
import assert from "node:assert/strict";
import { copyTextToClipboard } from "@/lib/clipboard";

type NavigatorClipboard = {
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
};

type FakeTextarea = {
  value: string;
  setAttribute: (name: string, value: string) => void;
  style: Record<string, string>;
  focus: () => void;
  select: () => void;
  setSelectionRange: (start: number, end: number) => void;
  parentNode: { removeChild: (node: FakeTextarea) => void } | null;
};

type Focusable = {
  focus: () => void;
};

type FakeRange = {
  id: string;
  cloneRange: () => FakeRange;
};

type FakeSelection = {
  rangeCount: number;
  getRangeAt: (index: number) => FakeRange;
  removeAllRanges: () => void;
  addRange: (range: FakeRange) => void;
};

type FakeDocument = {
  body: { appendChild: (node: FakeTextarea) => void };
  createElement: (tag: string) => FakeTextarea;
  execCommand: (command: string) => boolean;
  activeElement?: Focusable | null;
};

const globalRef = globalThis as unknown as {
  navigator?: NavigatorClipboard;
  document?: FakeDocument;
  window?: { getSelection?: () => FakeSelection | null };
};

const originalNavigator = globalRef.navigator;
const originalDocument = globalRef.document;
const originalWindow = globalRef.window;

function makeFakeTextarea(): FakeTextarea {
  return {
    value: "",
    setAttribute() {},
    style: {},
    focus() {},
    select() {},
    setSelectionRange() {},
    parentNode: null,
  };
}

function makeFakeDocument(
  execCommand: (command: string) => boolean,
  activeElement?: Focusable | null,
): FakeDocument {
  const textareas: FakeTextarea[] = [];
  return {
    body: {
      appendChild(node: FakeTextarea) {
        node.parentNode = { removeChild: (n) => {
          const index = textareas.indexOf(n);
          if (index !== -1) textareas.splice(index, 1);
        } };
        textareas.push(node);
      },
    },
    createElement() {
      return makeFakeTextarea();
    },
    execCommand,
    activeElement,
  };
}

function setNavigator(clipboard?: NavigatorClipboard["clipboard"]) {
  if (clipboard === undefined) {
    globalRef.navigator = undefined;
  } else {
    globalRef.navigator = { clipboard };
  }
}

function setDocument(document?: FakeDocument) {
  globalRef.document = document;
}

function setWindow(window?: { getSelection?: () => FakeSelection | null }) {
  globalRef.window = window;
}

test("copyTextToClipboard uses the modern Clipboard API and returns true on success", async () => {
  const written: string[] = [];
  let execCalled = false;
  setNavigator({
    writeText: async (text: string) => {
      written.push(text);
    },
  });
  setDocument(makeFakeDocument(() => {
    execCalled = true;
    return false;
  }));

  try {
    const result = await copyTextToClipboard("hello");
    assert.equal(result, true);
    assert.deepEqual(written, ["hello"]);
    assert.equal(execCalled, false, "fallback execCommand should not be used");
  } finally {
    globalRef.navigator = originalNavigator;
    globalRef.document = originalDocument;
    globalRef.window = originalWindow;
  }
});

test("copyTextToClipboard falls back to execCommand when the modern API rejects", async () => {
  const writeCalls: string[] = [];
  let execCalled = 0;
  setNavigator({
    writeText: async (text: string) => {
      writeCalls.push(text);
      throw new Error("Clipboard permission denied");
    },
  });
  setDocument(
    makeFakeDocument(() => {
      execCalled += 1;
      return true;
    }),
  );

  try {
    const result = await copyTextToClipboard("fallback me");
    assert.equal(result, true);
    assert.deepEqual(writeCalls, ["fallback me"]);
    assert.equal(execCalled, 1, "fallback execCommand should be invoked once");
  } finally {
    globalRef.navigator = originalNavigator;
    globalRef.document = originalDocument;
    globalRef.window = originalWindow;
  }
});

test("copyTextToClipboard restores focus and selection after fallback copy", async () => {
  let focusRestored = 0;
  let execCalled = 0;
  let removeAllRangesCalled = 0;
  const restoredRanges: FakeRange[] = [];
  const initialRange: FakeRange = {
    id: "initial",
    cloneRange: () => ({ id: "initial-clone", cloneRange: () => initialRange }),
  };
  const selection: FakeSelection = {
    rangeCount: 1,
    getRangeAt: (index: number) => {
      assert.equal(index, 0);
      return initialRange;
    },
    removeAllRanges: () => {
      removeAllRangesCalled += 1;
    },
    addRange: (range: FakeRange) => {
      restoredRanges.push(range);
    },
  };

  setNavigator({
    writeText: async () => {
      throw new Error("Clipboard permission denied");
    },
  });
  setDocument(
    makeFakeDocument(
      () => {
        execCalled += 1;
        return true;
      },
      {
        focus: () => {
          focusRestored += 1;
        },
      },
    ),
  );
  setWindow({ getSelection: () => selection });

  try {
    const result = await copyTextToClipboard("restore me");
    assert.equal(result, true);
    assert.equal(execCalled, 1);
    assert.equal(removeAllRangesCalled, 1);
    assert.deepEqual(restoredRanges.map((range) => range.id), ["initial-clone"]);
    assert.equal(focusRestored, 1);
  } finally {
    globalRef.navigator = originalNavigator;
    globalRef.document = originalDocument;
    globalRef.window = originalWindow;
  }
});

test("copyTextToClipboard returns false when every copy path fails", async () => {
  const writeCalls: string[] = [];
  let execCalled = 0;
  setNavigator({
    writeText: async (text: string) => {
      writeCalls.push(text);
      throw new Error("Clipboard permission denied");
    },
  });
  setDocument(
    makeFakeDocument(() => {
      execCalled += 1;
      return false;
    }),
  );

  try {
    const result = await copyTextToClipboard("doomed");
    assert.equal(result, false);
    assert.deepEqual(writeCalls, ["doomed"]);
    assert.equal(execCalled, 1);
  } finally {
    globalRef.navigator = originalNavigator;
    globalRef.document = originalDocument;
    globalRef.window = originalWindow;
  }
});

test("copyTextToClipboard returns false and never throws in an SSR / no-DOM environment", async () => {
  setNavigator(undefined);
  setDocument(undefined);

  try {
    const result = await copyTextToClipboard("no-dom");
    assert.equal(result, false);
  } finally {
    globalRef.navigator = originalNavigator;
    globalRef.document = originalDocument;
    globalRef.window = originalWindow;
  }
});
