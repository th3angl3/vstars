import express, { type Request, type Response, type NextFunction } from "express";
import scrapeVenueRoute from "./routes/scrapeVenueRoute.js";
import scrapeCourseRoute from "./routes/scrapeCourseRoute.js";
import ttRoute from "./routes/ttRoute.js";

const app = express();

app.use(express.json());
app.use("/api", scrapeVenueRoute)
app.use("/api", scrapeCourseRoute);
app.use("/api", ttRoute);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    console.error(err);
    res.status(500).json({ success: false, message });
});

export default app;