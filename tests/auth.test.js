const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const redis = require("../src/config/redis");

beforeAll(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

describe("POST /api/v1/register", () => {
  test("200 on valid input", async () => {
    const res = await request(app)
      .post("/api/v1/register")
      .send({ username: "testuser", password: "Secure1!" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "User created" });
  });

  test("400 when username missing", async () => {
    const res = await request(app)
      .post("/api/v1/register")
      .send({ password: "Secure1!" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  test("400 when password too weak", async () => {
    const res = await request(app)
      .post("/api/v1/register")
      .send({ username: "testuser2", password: "weakpassword" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  test("409 when username already taken", async () => {
    await request(app)
      .post("/api/v1/register")
      .send({ username: "dupeuser", password: "Secure1!" });

    const res = await request(app)
      .post("/api/v1/register")
      .send({ username: "dupeuser", password: "Secure1!" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Username already exists" });
  });
});

describe("POST /api/v1/login", () => {
  beforeAll(async () => {
    await request(app)
      .post("/api/v1/register")
      .send({ username: "loginuser", password: "Secure1!" });
  });

  test("200 with token on valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/login")
      .send({ username: "loginuser", password: "Secure1!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.sub).toBe("loginuser");
  });

  test("401 on wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/login")
      .send({ username: "loginuser", password: "WrongPass1!" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  test("401 on unknown username", async () => {
    const res = await request(app)
      .post("/api/v1/login")
      .send({ username: "nobody", password: "Secure1!" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  test("400 when body is empty", async () => {
    const res = await request(app)
      .post("/api/v1/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });
});
