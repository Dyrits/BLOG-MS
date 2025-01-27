import express, { Request, Response } from "npm:express";
import axios from "npm:axios";
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
  axios.post("http://event-bus:4050/events", {
    type: "PostCreated",
    data: posts[uuid],
  }).catch(console.error);
  response.json(posts[uuid]);
});

app.post("/events", (request: Request, response: Response) => {
  console.log("Received Event:", request.body.type);
  response.json({ status: "OK" });
});

app.listen(Deno.env.get("PORT"), () => {
  console.log(
    `The Posts API is up and running on: http://localhost:${
      Deno.env.get("PORT")
    }`,
  );
});
