import { Hono } from "hono";
import { logger } from "hono/logger";
import axios from "axios";

const app = new Hono();

app.use("*", logger());

app.get("/", (context) => {
  return context.json({ message: "The Event Bus is up and running." });
});

app.post("/events", async (context) => {
  const event = await context.req.json();
  axios.post("http://posts-api:4005/events", event).catch(console.error);
  axios.post("http://comments-api:4010/events", event).catch(console.error);
  return context.json({ status: "OK" });
});

export default app;