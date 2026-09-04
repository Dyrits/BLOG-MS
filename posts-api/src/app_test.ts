import { dispose, handler } from "./app.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};

Deno.test("posts API routes and persistence", async () => {
  const original = Deno.cwd();
  const temporary = await Deno.makeTempDir();

  try {
    await Deno.mkdir(`${temporary}/data`);
    await Deno.writeTextFile(`${temporary}/data/posts.json`, "{}");
    Deno.chdir(temporary);

    const health = await handler(new Request("http://localhost/"));
    assertEquals(health.status, 200);
    assertEquals(await health.json(), { message: "The Posts API is up and running." });

    const invalid = await handler(
      new Request("http://localhost/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "", content: "" }),
      }),
    );
    assertEquals(invalid.status, 400);
    assertEquals(await invalid.json(), {
      error: { code: "BAD_REQUEST", message: "Invalid request" },
    });

    const store = await handler(
      new Request("http://localhost/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Effect", content: "Typed effects" }),
      }),
    );
    assertEquals(store.status, 200);
    const stored = await store.json();
    assertEquals(stored.title, "Effect");
    assertEquals(stored.content, "Typed effects");

    const list = await handler(new Request("http://localhost/posts"));
    assertEquals(list.status, 200);
    assertEquals((await list.json())[stored.id], stored);

    const listed = JSON.parse(await Deno.readTextFile("data/posts.json"));
    assertEquals(listed[stored.id], stored);

    const event = await handler(
      new Request("http://localhost/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "PostStored" }),
      }),
    );
    assertEquals(event.status, 200);
    assertEquals(await event.json(), { status: "OK" });

    const missing = await handler(new Request(`http://localhost/${crypto.randomUUID()}`));
    assertEquals(missing.status, 404);
    assertEquals(await missing.json(), {
      error: { code: "NOT_FOUND", message: "Route not found" },
    });

    const preflight = await handler(
      new Request("http://localhost/posts", {
        method: "OPTIONS",
        headers: { origin: "http://localhost:5173" },
      }),
    );
    assertEquals(preflight.headers.get("access-control-allow-origin"), "*");
  } finally {
    await dispose();
    Deno.chdir(original);
    await Deno.remove(temporary, { recursive: true });
  }
});
