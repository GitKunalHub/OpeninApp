const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.SECRETKEY_JWT);
    const user = await User.findOne({
      _id: decoded._id,
    });

    if (!user) {
      throw new Error("invalid login");
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};

module.exports = auth;
