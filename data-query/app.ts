import express, { type Request, type Response } from "express";
import helmet from "helmet";

const app = express();

app.use(helmet);
app.use(express.json());

app.get("/posts", (_request: Request, _response: Response) => {});

app.get("/events", (_request: Request, _response: Response) => {});

export default app;
