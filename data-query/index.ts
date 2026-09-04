import { dispose, handler } from "./app";

const port = Number.parseInt(Bun.env.PORT ?? "4100", 10);

const server = Bun.serve({
	fetch: handler,
	hostname: "0.0.0.0",
	port,
});

console.log(`The data query is up and running on: ${server.url}`);

const shutdown = async () => {
	server.stop();
	await dispose();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
