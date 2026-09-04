import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import {
	HttpApi,
	HttpApiBuilder,
	HttpApiEndpoint,
	HttpApiGroup,
	HttpApiSchema,
} from "effect/unstable/httpapi";

const ErrorSchema = Schema.Struct({
	error: Schema.Struct({
		code: Schema.String,
		message: Schema.String,
	}),
});

const NotImplemented = ErrorSchema.pipe(HttpApiSchema.status(501));

class DataQueryGroup extends HttpApiGroup.make("data-query", {
	topLevel: true,
}).add(
	HttpApiEndpoint.get("posts", "/posts", {
		error: NotImplemented,
		success: Schema.Unknown,
	}),
	HttpApiEndpoint.get("events", "/events", {
		error: NotImplemented,
		success: Schema.Unknown,
	}),
) {}

class DataQueryApi extends HttpApi.make("data-query").add(DataQueryGroup) {}

const NotImplementedError = (resource: string) =>
	Effect.fail({
		error: {
			code: "NOT_IMPLEMENTED",
			message: `${resource} query is not implemented`,
		},
	});

const DataQueryHandlers = HttpApiBuilder.group(
	DataQueryApi,
	"data-query",
	Effect.fn("DataQueryHandlers")(function* (handlers) {
		return handlers.handleAll({
			posts: () => NotImplementedError("Posts"),
			events: () => NotImplementedError("Events"),
		});
	}),
);

const ApiRoutes = HttpApiBuilder.layer(DataQueryApi).pipe(
	Layer.provide(DataQueryHandlers),
);

const web = HttpRouter.toWebHandler(
	ApiRoutes.pipe(Layer.provide(HttpServer.layerServices)),
);

export const handler = async (request: Request): Promise<Response> => {
	const response = await web.handler(request);
	const headers = new Headers(response.headers);

	for (const [name, value] of Object.entries({
		"content-security-policy": "default-src 'none'",
		"cross-origin-opener-policy": "same-origin",
		"cross-origin-resource-policy": "same-origin",
		"referrer-policy": "no-referrer",
		"x-content-type-options": "nosniff",
		"x-frame-options": "SAMEORIGIN",
	})) {
		headers.set(name, value);
	}

	if (response.status === 404) {
		headers.set("content-type", "application/json");
		return new Response(
			JSON.stringify({
				error: { code: "NOT_FOUND", message: "Route not found" },
			}),
			{ status: 404, headers },
		);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

export const dispose = web.dispose;
