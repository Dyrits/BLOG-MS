import { Context, Effect, Layer, Ref, Schema, Semaphore } from "effect";
import { Post, Posts } from "./domain.ts";

export class PostRepositoryError extends Schema.TaggedError<PostRepositoryError>()("PostRepositoryError", {
  cause: Schema.Defect(),
}) {}

export class PostRepository extends Context.Service<PostRepository, {
  readonly list: Effect.Effect<Posts>;
  readonly store: (post: Post) => Effect.Effect<Post, PostRepositoryError>;
}>()("blog-ms/posts-api/PostRepository") {
  static readonly layer = Layer.effect(
    PostRepository,
    Effect.gen(function* () {
      const path = "data/posts.json";
      const temporary = `${path}.tmp`;
      const initial = yield* Effect.tryPromise({
        try: () => Deno.readTextFile(path),
        catch: (cause) => new PostRepositoryError({ cause }),
      }).pipe(
        Effect.flatMap((json) =>
          Effect.try({
            try: () => JSON.parse(json) as unknown,
            catch: (cause) => new PostRepositoryError({ cause }),
          })
        ),
        Effect.flatMap(Schema.decodeUnknownEffect(Posts)),
        Effect.mapError((cause) => new PostRepositoryError({ cause })),
      );
      const state = yield* Ref.make(initial);
      const list = Ref.get(state);
      const semaphore = yield* Semaphore.make(1);
      const store = Effect.fn("PostRepository.store")(function* (post: Post) {
        return yield* semaphore.withPermits(1)(
          Effect.gen(function* () {
            const current = yield* Ref.get(state);
            const updated = { ...current, [post.id]: post };
            const encoded = yield* Schema.encodeUnknownEffect(Posts)(updated).pipe(
              Effect.mapError((cause) => new PostRepositoryError({ cause })),
            );
            const json = yield* Effect.try({
              try: () => JSON.stringify(encoded),
              catch: (cause) => new PostRepositoryError({ cause }),
            });

            yield* Effect.tryPromise({
              try: async () => {
                await Deno.writeTextFile(temporary, json);
                await Deno.rename(temporary, path);
              },
              catch: (cause) => new PostRepositoryError({ cause }),
            });
            yield* Ref.set(state, updated);
            return post;
          }),
        );
      });

      return PostRepository.of({ list, store });
    }),
  );
}
