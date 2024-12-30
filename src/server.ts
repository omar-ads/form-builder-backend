import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import authRoutes from "./routers/auth";
import formRoutes from "./routers/forms";
import "dotenv/config";
import logger from "./logger";

const app = express();

app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());

app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);

// Error handling
app.use(
  (
    err: Error,
    _: express.Request,
    res: express.Response,
    __: express.NextFunction
  ) => {
    logger.error(`Error occurred: ${err.message}`);
    res.status(500).send("Internal Server Error");
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
