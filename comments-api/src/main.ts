import express, { Request, Response } from "npm:express";

const app = express();
app.use(express.json());

interface Comment {
  id: string;
  post$id: string;
  content: string;
}

interface Posts {
  [id: string]: { comments: Comment[] };
}

const posts: Posts = JSON.parse(
  new TextDecoder().decode(Deno.readFileSync("./data/posts.json")),
);

app.get("/", (_: Request, response: Response) => {
  response.json({ message: "The Comments API is up and running." });
});

app.get("/posts/:id/comments", (request: Request, response: Response) => {
  const { id } = request.params;
  response.json(posts[id].comments);
});

app.post("/posts/:id/comments", (request: Request, response: Response) => {
  const { id } = request.params;
  const { content } = request.body;
  const uuid =  crypto.randomUUID()
  const post = posts[id] || { id, comments: [] };
  const comments = post.comments;
  comments.push({ id: uuid, post$id: id, content });
  post.comments = comments;
  posts[id] = post;
  Deno.writeFile(
    "data/posts.json",
    new TextEncoder().encode(JSON.stringify(posts)),
  );
  response.json({ id: uuid, post$id: id, content });
});

app.listen(Deno.env.get("PORT"), () => {
  console.log(
    `The Comments API is up and running on: http://localhost:${
      Deno.env.get("PORT")
    }`,
  );
});
