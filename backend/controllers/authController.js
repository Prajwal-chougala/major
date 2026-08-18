const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        message: "Name, email, mobile and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: mobile.trim(),
      passwordHash,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email/mobile number and password are required.",
      });
    }

    const value = identifier.trim();

    // Determine whether the user entered an email or mobile number.
    const isEmail = value.includes("@");

    const query = isEmail
      ? { email: value.toLowerCase() }
      : { mobile: value };

    const user = await User.findOne(query).select("+passwordHash +password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email/mobile number or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account has been disabled.",
      });
    }

    const hashToCompare = user.passwordHash || user.password;
    if (!hashToCompare) {
      return res.status(401).json({
        message: "Invalid account state.",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      hashToCompare
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email/mobile number or password.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to login.",
    });
  }
};

module.exports = {
  register,
  login,
};