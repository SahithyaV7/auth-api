const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ error: "Internal server error" });
  }
  res.status(500).json({ error: err.message });
};

module.exports = errorHandler;
