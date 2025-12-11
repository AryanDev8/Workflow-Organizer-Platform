// backend/controllers/auth-controller.js
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Verification from "../models/verification.js";
import { sendEmail } from "../libs/send-email.js";
import mongoose from "mongoose";
import aj from "../libs/arcjet.js";

/**
 * Helper: call Arcjet safely with a request snapshot.
 * Returns the decision object or null if Arcjet threw => fail-open.
 */
async function runArcjetProtect(req, requested = 5) {
  try {
    const snapshot = {
      ip: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1",
      headers: req.headers || {},
      method: req.method,
      path: req.originalUrl || req.url || "/",
      body: { ...(req.body || {}) },
      query: { ...(req.query || {}) },
    };

    // normalize email for validateEmail rule if present
    if (snapshot.body.email) snapshot.body.email = String(snapshot.body.email).trim().toLowerCase();

    // Try snapshot form first (more robust), fallback to raw req if SDK requires it
    try {
      const decision = await aj.protect({ request: snapshot }, { requested });
      console.log("[arcjet] decision (raw):", JSON.stringify(decision, null, 2));
      return decision;
    } catch (errSnapshot) {
      console.warn("[arcjet] protect(snapshot) failed, trying raw req:", errSnapshot?.message || errSnapshot);
      try {
        const decision2 = await aj.protect(req, { requested });
        console.log("[arcjet] decision (raw from req):", JSON.stringify(decision2, null, 2));
        return decision2;
      } catch (errRaw) {
        console.error("[arcjet] protect() threw:", errRaw?.stack || errRaw);
        // fail-open in dev by returning null (so request continues)
        return null;
      }
    }
  } catch (outer) {
    console.error("[arcjet] unexpected error:", outer);
    return null;
  }
}

export const registerUser = async (req, res) => {
  try {
    console.log("[register] payload:", req.body);
    const { email, name, password, confirmPassword } = req.body || {};

    // Run arcjet protection (safe)
    const decision = await runArcjetProtect(req, 5);

    // If Arcjet gave a decision object and it denies -> reject
    if (decision && typeof decision.isDenied === "function" && decision.isDenied()) {
      // prefer json responses in Express
      return res.status(403).json({ message: "Request blocked by anti-bot policy" });
    }

    // 1) basic validation
    if (!email || !name || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2) normalize email
    const normalizedEmail = String(email).trim().toLowerCase();

    // 3) check existing
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" }); // 409 = conflict
    }

    // 4) hash password & create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      password: hashedPassword,
      isEmailVerified: false,
    });

    // 5) create verification token (JWT)
    const verificationToken = jwt.sign(
      { userId: newUser._id, purpose: "email-verification" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const verificationRecord = await Verification.create({
      userId: newUser._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    });

    // 6) prepare and send email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(
      verificationToken
    )}&id=${newUser._id}`;
    const mailBody = `<p>Hi ${newUser.name},</p>
                      <p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`;
    const emailSubject = "Verify your email";

    const emailResult = await sendEmail(newUser.email, emailSubject, mailBody);
    console.log("[register] sendEmail result:", emailResult);

    if (!emailResult || emailResult.ok === false) {
      // cleanup the partial records so you don't leave an unusable user
      try {
        await Verification.deleteOne({ _id: verificationRecord._id });
        await User.deleteOne({ _id: newUser._id });
      } catch (cleanupErr) {
        console.error("[register] cleanup error:", cleanupErr);
      }
      return res.status(502).json({
        message: "Failed to send verification email",
        details: emailResult?.error || null,
      });
    }

    // 7) success
    return res.status(201).json({
      message: "Verification email sent. Please check your inbox.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("[register] unexpected error:", error);
    return res.status(500).json({ message: "Internal Server error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 1️⃣ Check email verification
    if (!user.isEmailVerified) {
      let existingVerification = await Verification.findOne({ userId: user._id });

      // If no verification exists or expired → create new token
      if (!existingVerification || existingVerification.expiresAt < new Date()) {
        if (existingVerification) {
          await Verification.deleteOne({ _id: existingVerification._id });
        }

        const newToken = jwt.sign(
          { userId: user._id, purpose: "email-verification" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        existingVerification = await Verification.create({
          userId: user._id,
          token: newToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });

        // Send email again
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(
          newToken
        )}&id=${user._id}`;

        const mailBody = `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`;

        await sendEmail(user.email, "Verify your email", mailBody);
      }

      return res.status(403).json({
        message: "Email not verified. A new verification email has been sent.",
      });
    }

    // 2️⃣ Password check
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Generate login token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("[login] error:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};


export const verifyEmail = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    const id = req.body?.id || req.query?.id;

    if (!token || !id) {
      return res.status(400).json({ message: "Missing token or id" });
    }

    if (typeof token !== "string") {
      return res.status(400).json({ message: "Invalid token format" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (payload.userId !== id) {
      return res.status(400).json({ message: "Token does not match user" });
    }

    if (payload.purpose !== "email-verification") {
      return res.status(400).json({ message: "Invalid token purpose" });
    }

    const record = await Verification.findOne({ userId: id, token });
    if (!record) {
      return res.status(404).json({ message: "Verification record not found" });
    }

    if (record.expiresAt < new Date()) {
      await Verification.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "Verification token expired" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    user.isEmailVerified = true;
    await user.save();

    await Verification.deleteOne({ _id: record._id });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("[verifyEmail] error:", err);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

export const resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email });

    if(!user) {
        return res.status(400).json({message: "User not found"});
    }

    if(!user.isEmailVerified) {
        return res.status(400).json({message: "Please verify your email first"});
    }

    const existingVerification = await Verification.findOne({userId: user._id});
    if(existingVerification &&  existingVerification.expiresAt > new Date()) {
        return res.status(400).json({message: "A reset link has already been sent to your email. Please check your inbox or spam."});
    }   

    if(existingVerification && existingVerification.expiresAt <= new Date()) {
        await Verification.findByIdAndDelete({ _id: existingVerification._id });
    }

    const resetPasswordToken = jwt.sign(
        { userId: user._id, purpose: "password-reset" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );

    await Verification.create({
        userId: user._id,
        token: resetPasswordToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
        resetPasswordToken
    )}&id=${user._id}`;
    const emailBody = `<p>Hi ${user.name},</p>
                       <p>Click <a href="${resetPasswordLink}">here</a> to reset your password. This link will expire in 15 minutes.</p>`;
    const emailSubject = "Reset your password";

    const isEmailSent = await sendEmail(user.email, emailSubject, emailBody);

    if(!isEmailSent) {
        return res.status(500).json({ message: "Failed to send reset password email" });
    }

    return res.status(200).json({ message: "Password reset link sent" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

export const verifyResetPasswordTokenAndResetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if(!payload) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { userId, purpose } = payload;

        if(purpose !== "password-reset") {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const verificationRecord = await Verification.findOne({ userId, token });

        if(!verificationRecord) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const isTokenExpired = verificationRecord.expiresAt < new Date();

        if(isTokenExpired) {
            return res.status(401).json({ message: "Token expired" });
        }

        const user = await User.findById(userId);
        if(!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if(newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        await Verification.findByIdAndDelete(verificationRecord._id);
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server error" });
    }
};