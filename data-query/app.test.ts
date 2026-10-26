import { afterAll, describe, expect, test } from "bun:test";
import { dispose, handler } from "./app.ts";

afterAll(dispose);

const emit = (event: unknown) =>
	handler(
		new Request("http://localhost/events", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(event),
		}),
	);

const list = async () => {
	const response = await handler(new Request("http://localhost/posts"));
	expect(response.status).toBe(200);
	expect(response.headers.get("x-content-type-options")).toBe("nosniff");
	return response.json();
};

// The read model lives in memory for the whole module, so these tests build on each other in order.
describe("data-query HTTP API", () => {
	test("lists no posts before any event", async () => {
		expect(await list()).toEqual({});
	});

	test("projects a stored post", async () => {
		const response = await emit({
			type: "PostStored",
			data: { id: "p1", title: "Hello", content: "First post" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "OK" });
		expect(await list()).toEqual({
			p1: { id: "p1", title: "Hello", content: "First post", comments: [] },
		});
	});

	test("attaches a stored comment to its post", async () => {
		await emit({
			type: "CommentStored",
			data: { id: "c1", post$id: "p1", content: "Nice post" },
		});

		expect(await list()).toEqual({
			p1: {
				id: "p1",
				title: "Hello",
				content: "First post",
				comments: [{ id: "c1", content: "Nice post" }],
			},
		});
	});

	test("drops a comment whose post is unknown", async () => {
		const response = await emit({
			type: "CommentStored",
			data: { id: "c2", post$id: "missing", content: "Orphan" },
		});

		expect(response.status).toBe(200);
		expect(Object.keys(await list())).toEqual(["p1"]);
	});

	test("acknowledges and ignores unknown event types", async () => {
		const response = await emit({ type: "SomethingElse", data: {} });

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "OK" });
		expect(Object.keys(await list())).toEqual(["p1"]);
	});

	test("returns a structured 404", async () => {
		const response = await handler(new Request("http://localhost/missing"));

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: { code: "NOT_FOUND", message: "Route not found" },
		});
	});
});
