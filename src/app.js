require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
require("./config/redis");
const authRouter = require("./routes/auth");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", authRouter);

module.exports = app;
