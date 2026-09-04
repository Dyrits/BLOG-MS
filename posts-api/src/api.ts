import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { Event, InternalServerError, NewPost, Post, Posts } from "./domain.ts";

const Message = Schema.Struct({ message: Schema.String });
const EventAcknowledgement = Schema.Struct({ status: Schema.String });

class PostsGroup extends HttpApiGroup.make("posts", { topLevel: true }).add(
  HttpApiEndpoint.get("health", "/", { success: Message }),
  HttpApiEndpoint.get("index", "/posts", {
    success: Posts,
  }),
  HttpApiEndpoint.post("store", "/posts", {
    payload: NewPost,
    success: Post,
    error: InternalServerError,
  }),
  HttpApiEndpoint.post("receive", "/events", {
    payload: Event,
    success: EventAcknowledgement,
  }),
) {}

export class PostsApi extends HttpApi.make("posts-api").add(PostsGroup) {}
