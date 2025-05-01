import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

const port = process.env.PORT || 3000;
const app = express();
dotenv.config();

// Print startup information
console.log("Starting server with config:");
console.log("- CLIENT_URL:", process.env.CLIENT_URL || "http://localhost:5173");
console.log("- Clerk configured:", !!process.env.CLERK_SECRET_KEY);

// Enable CORS with all necessary headers
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-ID"],
  })
);

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Query params:`, req.query);
  next();
});

// Fallback auth middleware for development
const devAuthMiddleware = (req, res, next) => {
  // Extract userId from headers or query params for development
  const userId = req.query.userId;

  if (userId) {
    req.auth = { userId };
    console.log("Using query param auth with userId:", userId);
    return next();
  }

  // Try Clerk auth as fallback
  ClerkExpressRequireAuth({
    onError: (err) => {
      console.log("Clerk auth failed:", err.message);
      return res.status(401).json({ error: "Authentication required" });
    },
  })(req, res, next);
};

// Choose auth middleware
const authMiddleware = devAuthMiddleware;

// Connect to MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

// Configure ImageKit
try {
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  });

  // ImageKit auth endpoint
  app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
  });
} catch (error) {
  console.error("Error initializing ImageKit:", error.message);
}

// Create a new chat
app.post("/api/chats", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });
    const savedChat = await newChat.save();

    const userChats = await UserChats.find({ userId: userId });

    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [{ _id: savedChat._id, title: text.substring(0, 40) }],
      });
      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }
    res.status(201).send(savedChat._id);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).send("Error creating chats!");
  }
});

// Get user's chat list
app.get("/api/userchats", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  console.log("Backend: Fetching chats for user:", userId);

  try {
    const userChats = await UserChats.find({ userId: userId });

    if (!userChats || userChats.length === 0) {
      console.log("No chats found for user:", userId);
      return res.status(200).send([]);
    }

    console.log(`Found ${userChats[0].chats.length} chats for user ${userId}`);
    res.status(200).send(userChats[0].chats);
  } catch (error) {
    console.error("Error fetching userchats:", error);
    res.status(500).send("Error fetching userchats");
  }
});

// Get chat history by ID
app.get("/api/chats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: userId });
    res.status(200).send(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).send("Error fetching chat");
  }
});

// Update chat history with new conversation
app.put("/api/chats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.error("Error adding conversation:", err);
    res.status(500).send("Error adding conversation!");
  }
});

// Update chat title
app.put("/api/userchats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;
  const { title } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).send("Title cannot be empty");
  }

  try {
    const result = await UserChats.updateOne(
      { userId, "chats._id": chatId },
      { $set: { "chats.$.title": title } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Chat not found");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error updating chat title:", error);
    res.status(500).send("Error updating chat title");
  }
});

// Delete a chat
app.delete("/api/userchats/:id", authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const chatId = req.params.id;

  try {
    const userChatsResult = await UserChats.updateOne(
      { userId },
      { $pull: { chats: { _id: chatId } } }
    );

    const chatResult = await Chat.deleteOne({ _id: chatId, userId });

    if (userChatsResult.modifiedCount === 0 && chatResult.deletedCount === 0) {
      return res.status(404).send("Chat not found");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).send("Error deleting chat");
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(401).send("Authentication error");
});

// Start server
app.listen(port, () => {
  connect();
  console.log(`Server running on port ${port}`);
});
