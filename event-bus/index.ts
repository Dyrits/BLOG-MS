import app from "./app";

Bun.serve({
  fetch: app.fetch,
  hostname: "0.0.0.0",
  port: 4050,
});

console.log(
  `The event bus is up and running on: http://localhost:${
    process.env.PORT
  }`,
);