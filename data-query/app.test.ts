import { afterAll, describe, expect, test } from "bun:test";
import { dispose, handler } from "./app.ts";

afterAll(dispose);

describe("data-query HTTP API", () => {
	test.each(["/posts", "/events"])("returns 501 for %s", async (path) => {
		const response = await handler(new Request(`http://localhost${path}`));

		expect(response.status).toBe(501);
		expect(await response.json()).toEqual({
			error: {
				code: "NOT_IMPLEMENTED",
				message: `${path === "/posts" ? "Posts" : "Events"} query is not implemented`,
			},
		});
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
	});

	test("returns a structured 404", async () => {
		const response = await handler(new Request("http://localhost/missing"));

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: { code: "NOT_FOUND", message: "Route not found" },
		});
	});
});
