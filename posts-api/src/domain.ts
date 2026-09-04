import { Schema } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

export class Post extends Schema.Class<Post>("Post")({
  id: Schema.String,
  title: Schema.String,
  content: Schema.String,
}) {}

export const Posts = Schema.Record(Schema.String, Post);
export type Posts = typeof Posts.Type;

export const NewPost = Schema.Struct({
  title: Schema.String.check(Schema.isMinLength(1)),
  content: Schema.String.check(Schema.isMinLength(1)),
});

export const Event = Schema.Struct({
  type: Schema.String,
});

export const PostStoredEvent = Schema.Struct({
  type: Schema.Literal("PostStored"),
  data: Post,
});

export const PostEvent = Schema.Union([PostStoredEvent]);
export type PostEvent = typeof PostEvent.Type;

export const ErrorSchema = Schema.Struct({
  error: Schema.Struct({
    code: Schema.String,
    message: Schema.String,
  }),
});

export const InternalServerError = ErrorSchema.pipe(HttpApiSchema.status(500));

export const errorify = (code: string, message: string): typeof ErrorSchema.Type => ({
  error: { code, message },
});
