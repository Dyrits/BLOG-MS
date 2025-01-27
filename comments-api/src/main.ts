import { Hono, Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import axios from "npm:axios";

const app = new Hono();

app.use(cors());

interface Comment {
  id: string;
  post$id: string;
  content: string;
}

interface Posts {
  [id: string]: { comments: Comment[] };
}

const posts: Posts = JSON.parse(
  Deno.readTextFileSync("./data/posts.json"),
);

app.get("/", (context: Context) => {
  console.log("The Comments API is up and running.");
  return context.json({ message: "The Comments API is up and running." });
});

app.get("/posts/:id/comments", (context: Context) => {
  const id = context.req.param("id")
  return context.json(posts[id] ? posts[id].comments : []);
});

app.post("/posts/:id/comments", async (context: Context) => {
  const id = context.req.param("id");
  const { content } = await context.req.json();
  const uuid =  crypto.randomUUID()
  const post = posts[id] || { id, comments: [] };
  const comments = post.comments;
  comments.push({ id: uuid, post$id: id, content });
  post.comments = comments;
  posts[id] = post;
  Deno.writeTextFileSync(
    "data/posts.json",
    JSON.stringify(posts)
  );
  axios.post("http://event-bus:4050/events", {
    type: "CommentCreated",
    data: { id: uuid, post$id: id, content },
  }).catch(console.error);
  return context.json({ id: uuid, post$id: id, content });
});

app.post("/events", async (context: Context) => {
  const { type } = await context.req.json();
  console.log("Received Event:", type);
  return context.json({ status: "OK" });
});

Deno.serve({ port: 4010 }, app.fetch);
