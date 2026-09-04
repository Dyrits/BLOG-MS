import { Context, Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { PostsApi } from "./api.ts";
import { errorify, Post } from "./domain.ts";
import { EventPublisher } from "./event-publisher.ts";
import { PostRepository } from "./post-repository.ts";

const PostsHandlers = HttpApiBuilder.group(
  PostsApi,
  "posts",
  Effect.fn("PostsHandlers")(function* (handlers) {
    const repository = yield* PostRepository;
    const publisher = yield* EventPublisher;

    return handlers.handleAll({
      health: () => Effect.succeed({ message: "The Posts API is up and running." }),
      index: () => repository.index,
      store: Effect.fn("PostsHandlers.store")(function* ({ payload }) {
        const post = new Post({ id: crypto.randomUUID(), ...payload });
        const stored = yield* repository.store(post).pipe(
          Effect.mapError(() => errorify("STORAGE_ERROR", "Unable to persist the post")),
        );

        yield* publisher.emit({ type: "PostStored", data: stored }).pipe(
          Effect.catch((error) => Effect.logError("Unable to publish PostStored event", error)),
        );
        return stored;
      }),
      receive: ({ payload }) =>
        Effect.log(`Received Event: ${payload.type}`).pipe(
          Effect.as({ status: "OK" }),
        ),
    });
  }),
);

const ApiRoutes = HttpApiBuilder.layer(PostsApi).pipe(
  Layer.provide(PostsHandlers),
  Layer.provide([PostRepository.layer, EventPublisher.layer]),
);

const Routes = Layer.merge(ApiRoutes, HttpRouter.cors());
const web = HttpRouter.toWebHandler(
  Routes.pipe(Layer.provide(HttpServer.layerServices)),
);

interface ErrorDescriptor {
  readonly code: string;
  readonly message: string;
}

const errors: Readonly<Partial<Record<number, ErrorDescriptor>>> = {
  400: { code: "BAD_REQUEST", message: "Invalid request" },
  404: { code: "NOT_FOUND", message: "Route not found" },
};

export const handler = async (request: Request): Promise<Response> => {
  const response = await web.handler(request, Context.empty());

  const structured = (response: Response): boolean => {
    const content = response.headers.get("content-type");
    return !!content && content.startsWith("application/json");
  };

  const error = errors[response.status] ||
    (response.status >= 500 && !structured(response)
      ? { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" }
      : void 0);

  if (error) {
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify(errorify(error.code, error.message)), {
      status: response.status,
      headers,
    });
  }

  return response;
};

export const dispose = web.dispose;
