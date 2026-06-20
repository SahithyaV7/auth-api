const { body } = require("express-validator");

// Validates new user input: alphanumeric username and strong password
const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/),
  body("password")
    .notEmpty()
    .isLength({ min: 8 })
    .custom((value) => {
      if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(value)) {
        throw new Error("Password must contain uppercase, number, and special character");
      }
      return true;
    }),
];

// Ensures username and password are present before hitting the auth logic
const loginValidation = [
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
];

module.exports = { registerValidation, loginValidation };
