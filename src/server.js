if (process.env.JWT_SECRET === "changeme" && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be changed from the default before running in production");
}

const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
