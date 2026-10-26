import { Effect, Layer, Ref, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import {
	HttpApi,
	HttpApiBuilder,
	HttpApiEndpoint,
	HttpApiGroup,
} from "effect/http-api";

const Comment = Schema.Struct({
	id: Schema.String,
	content: Schema.String,
});

const Post = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	content: Schema.String,
	comments: Schema.Array(Comment),
});

const Posts = Schema.Record(Schema.String, Post);
type Posts = typeof Posts.Type;

const PostStoredEvent = Schema.Struct({
	type: Schema.Literal("PostStored"),
	data: Schema.Struct({
		id: Schema.String,
		title: Schema.String,
		content: Schema.String,
	}),
});

const CommentStoredEvent = Schema.Struct({
	type: Schema.Literal("CommentStored"),
	data: Schema.Struct({
		id: Schema.String,
		post$id: Schema.String,
		content: Schema.String,
	}),
});

// The event bus forwards every event to every service, so unknown types must be accepted and ignored.
const OtherEvent = Schema.Struct({
	type: Schema.String,
});

const Event = Schema.Union([PostStoredEvent, CommentStoredEvent, OtherEvent]);
type Event = typeof Event.Type;

const EventAcknowledgement = Schema.Struct({ status: Schema.String });

class DataQueryGroup extends HttpApiGroup.make("data-query", {
	topLevel: true,
}).add(
	HttpApiEndpoint.get("PostsList", "/posts", {
		success: Posts,
	}),
	HttpApiEndpoint.post("EventsReceive", "/events", {
		payload: Event,
		success: EventAcknowledgement,
	}),
) {}

class DataQueryApi extends HttpApi.make("data-query").add(DataQueryGroup) {}

const project = (posts: Posts, event: Event): Posts => {
	if (Schema.is(PostStoredEvent)(event)) {
		const { id, title, content } = event.data;
		return { ...posts, [id]: { id, title, content, comments: [] } };
	}

	if (Schema.is(CommentStoredEvent)(event)) {
		const { id, post$id, content } = event.data;
		const post = posts[post$id];
		// A comment whose post was never received cannot be shown, so it is dropped.
		if (!post) return posts;
		return {
			...posts,
			[post$id]: { ...post, comments: [...post.comments, { id, content }] },
		};
	}

	return posts;
};

const DataQueryHandlers = HttpApiBuilder.group(
	DataQueryApi,
	"data-query",
	Effect.fn("DataQueryHandlers")(function* (handlers) {
		const posts = yield* Ref.make<Posts>({});

		return handlers
			.handle("PostsList", () => Ref.get(posts))
			.handle("EventsReceive", ({ payload }) =>
				Ref.update(posts, (current) => project(current, payload)).pipe(
					Effect.as({ status: "OK" }),
				),
			);
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
