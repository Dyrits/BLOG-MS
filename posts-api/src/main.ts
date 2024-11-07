import express, { Request, Response } from "npm:express";
import cors from "npm:cors";

const app = express();

app.use(cors());
app.use(express.json());

interface Post {
  id: string;
  title: string;
  content: string;
}

interface Posts {
  [id: string]: Post;
}

const posts: Posts = JSON.parse(Deno.readTextFileSync("data/posts.json"));

app.get("/", (_: Request, response: Response) => {
  response.json({ message: "The Posts API is up and running." });
});

app.get("/posts", (_: Request, response: Response) => {
  response.json(posts);
});

app.post("/posts", (request: Request, response: Response) => {
  const { title, content } = request.body;
  const uuid = crypto.randomUUID()
  posts[uuid] = { id: uuid, title, content };
  Deno.writeTextFileSync("data/posts.json", JSON.stringify(posts));
  response.json(posts[uuid]);
});

app.listen(Deno.env.get("PORT"), () => {
  console.log(
    `The Posts API is up and running on: http://localhost:${
      Deno.env.get("PORT")
    }`,
  );
});
