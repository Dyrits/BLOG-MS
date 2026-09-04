import { dispose, handler } from "./app.ts";

const port = Number.parseInt(Deno.env.get("PORT") ?? "4005", 10);

const server = Deno.serve({ hostname: "0.0.0.0", port }, handler);
console.log(`The Posts API is up and running on: http://localhost:${port}`);

const shutdown = async () => {
  await server.shutdown();
  await dispose();
};

Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);
