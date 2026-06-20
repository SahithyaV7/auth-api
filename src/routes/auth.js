const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { registerValidation, loginValidation } = require("../validators/authValidators");
const validate = require("../middleware/validate");
const { createUser, findUser } = require("../services/userService");

const router = express.Router();

router.post("/register", registerValidation, validate, async (req, res, next) => {
  const { username, password } = req.body;
  try {
    await createUser(username, password);
    // 200 per spec; 201 would be more semantically correct for resource creation
    res.status(200).json({ message: "User created" });
  } catch (err) {
    if (err.message === "USERNAME_TAKEN") {
      return res.status(409).json({ error: "Username already exists" });
    }
    next(err);
  }
});

router.post("/login", loginValidation, validate, async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
