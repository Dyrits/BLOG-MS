import { Hono, Context } from "npm:hono";
import { cors } from "npm:hono/cors";

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
  return context.json(posts[id].comments);
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
  return context.json({ id: uuid, post$id: id, content });
});

Deno.serve({ port: 4010 }, app.fetch);
