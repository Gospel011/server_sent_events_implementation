import bcrypt from "bcryptjs";
import { CookieOptions, NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { createUser, findUserByEmail } from "../db/sqlite";
import asyncHandler from "../utils/asyncHandler";
import type { StringValue } from "ms";

const JWT_COOKIE_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN ??
  "7d") as StringValue;

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  fullName: string;
}

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

function getCookieValue(req: Request, cookieName: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const targetPrefix = `${cookieName}=`;
  const targetCookie = cookies.find((entry) => entry.startsWith(targetPrefix));

  if (!targetCookie) return undefined;
  return decodeURIComponent(targetCookie.slice(targetPrefix.length));
}

const isLoggedIn = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = getCookieValue(req, JWT_COOKIE_NAME);
    if (!token) {
      return res
        .status(401)
        .json({ status: "fail", message: "You are not logged in" });
    }

    let decodedToken: AuthTokenPayload;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid or expired token" });
    }

    if (!decodedToken.sub || !decodedToken.fullName) {
      return res.status(401).json({ status: "fail", message: "Invalid token" });
    }

    req.user = {
      id: decodedToken.sub,
      fullName: decodedToken.fullName,
    };

    next();
  },
);

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
    { sub: String(user.id), fullName: user.fullName },
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
  isLoggedIn,
  signup,
  login,
  logout,
};
