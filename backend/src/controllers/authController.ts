import bcrypt from "bcryptjs";
import { CookieOptions, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { createUser, findUserByEmail } from "../db/sqlite";
import asyncHandler from "../utils/asyncHandler";
import type { StringValue } from "ms";

const JWT_COOKIE_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN ??
  "7d") as StringValue;

function getCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function getClearCookieOptions(): CookieOptions {
  const { maxAge, ...cookieOptions } = getCookieOptions();
  void maxAge;
  return cookieOptions;
}

const signup = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body ?? {};

  if (!fullName || !email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "fullName, email and password are required",
    });
  }

  const normalizedFullName = String(fullName).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordValue = String(password);

  if (!normalizedFullName || !normalizedEmail || !passwordValue) {
    return res.status(400).json({
      status: "fail",
      message: "fullName, email and password are required",
    });
  }

  const existingUser = findUserByEmail(normalizedEmail);
  if (existingUser) {
    return res
      .status(409)
      .json({ status: "fail", message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(passwordValue, 12);
  const userId = createUser({
    fullName: normalizedFullName,
    email: normalizedEmail,
    passwordHash,
  });

  return res.status(201).json({
    status: "success",
    message: "Signup successful",
    data: {
      user: {
        id: userId,
        fullName: normalizedFullName,
        email: normalizedEmail,
      },
    },
  });
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ status: "fail", message: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordValue = String(password);

  const user = findUserByEmail(normalizedEmail);
  if (!user) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(
    passwordValue,
    user.passwordHash,
  );
  if (!passwordMatches) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.cookie(JWT_COOKIE_NAME, token, getCookieOptions());

  return res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    },
  });
});

const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(JWT_COOKIE_NAME, getClearCookieOptions());

  return res
    .status(200)
    .json({ status: "success", message: "Logout successful" });
});

export default {
  signup,
  login,
  logout,
};
