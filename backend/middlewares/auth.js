import jwt from "jsonwebtoken";
import User from "../models/user.js";

// מפתח סודי לחתימת JWT - בסביבת ייצור יש לשמור זאת בקובץ .env
const JWT_SECRET = "dreamtrip-secret-key";

// middleware לאימות משתמש באמצעות JWT
const auth = async (req, res, next) => {
  try {
    // קבלת הטוקן מה-header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "אימות נדרש" });
    }

    const token = authHeader.replace("Bearer ", "");

    // פענוח הטוקן
    const decoded = jwt.verify(token, JWT_SECRET);

    // מציאת המשתמש לפי המזהה בטוקן
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error("משתמש לא נמצא");
    }

    // הוספת פרטי המשתמש לאובייקט הבקשה
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("שגיאת אימות:", error.message);
    res.status(401).json({ error: "נא להתחבר מחדש" });
  }
};

export default auth;
