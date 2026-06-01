import express, { type Request, type Response, type NextFunction } from "express";
import scrapeRoute from "./routes/scrapeRoute.js";

const app = express();

app.use(express.json());
app.use('/api', scrapeRoute);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: err.message 
    });
});

export default app;