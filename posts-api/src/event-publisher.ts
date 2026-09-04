import { Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { PostEvent } from "./domain.ts";

export class EventPublisherError extends Schema.TaggedError<EventPublisherError>()("EventPublisherError", {
  cause: Schema.Defect(),
}) {}

export class EventPublisher extends Context.Service<EventPublisher, {
  readonly emit: (event: PostEvent) => Effect.Effect<void, EventPublisherError>;
}>()("POSTS/EventPublisher") {
  static readonly layer = Layer.effect(
    EventPublisher,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);

      const emit = Effect.fn("EventPublisher.emit")(function* (event: PostEvent) {
        yield* Effect.annotateCurrentSpan({ eventType: event.type });

        yield* HttpClientRequest.post("http://event-bus:4050/events").pipe(
          HttpClientRequest.schemaBodyJson(PostEvent)(event),
          Effect.flatMap(client.execute),
          Effect.asVoid,
          Effect.mapError((cause) => new EventPublisherError({ cause })),
        );
      });

      return EventPublisher.of({ emit });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
