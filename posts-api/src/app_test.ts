import { dispose, handler } from "./app.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};

Deno.test("posts API routes and persistence", async () => {
  const originalDirectory = Deno.cwd();
  const temporaryDirectory = await Deno.makeTempDir();

  try {
    await Deno.mkdir(`${temporaryDirectory}/data`);
    await Deno.writeTextFile(`${temporaryDirectory}/data/posts.json`, "{}");
    Deno.chdir(temporaryDirectory);

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

    const created = await handler(
      new Request("http://localhost/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Effect", content: "Typed effects" }),
      }),
    );
    assertEquals(created.status, 200);
    const post = await created.json();
    assertEquals(post.title, "Effect");
    assertEquals(post.content, "Typed effects");

    const listed = await handler(new Request("http://localhost/posts"));
    assertEquals(listed.status, 200);
    assertEquals((await listed.json())[post.id], post);

    const persisted = JSON.parse(await Deno.readTextFile("data/posts.json"));
    assertEquals(persisted[post.id], post);

    const event = await handler(
      new Request("http://localhost/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "PostStored" }),
      }),
    );
    assertEquals(event.status, 200);
    assertEquals(await event.json(), { status: "OK" });

    const missing = await handler(new Request("http://localhost/missing"));
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
    Deno.chdir(originalDirectory);
    await Deno.remove(temporaryDirectory, { recursive: true });
  }
});
