const express = require("express");
const User = require("../models/User");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
  res.send("User routes");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phonenumber } = req.body;
    const user = new User({ name, email, password, phonenumber });
    await user.save();
    res.status(201).send({ user, message: "User created success" });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Unable to login, user not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error("invalid password");
    }

    const token = jwt.sign(
      {
        _id: user._id.toString(),
      },
      process.env.SECRETKEY_JWT
    );

    res.send({ user, token, message: "Login Success" });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

module.exports = router;
