import React, { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { TripContext } from "../tripcontext/TripProvider";
import {
  RiSaveLine,
  RiCloseLine,
  RiCheckLine,
  RiMapPinLine,
  RiCalendarLine,
  RiTimeLine,
} from "react-icons/ri";
import { useAuth } from "@clerk/clerk-react";

/**
 * TripDetailsEditor Component
 *
 * אחראי על עריכת פרטי יומן מסע שנוצר ע"י המערכת
 *
 * Props:
 * - itineraryData: Object - מידע על היומן הנבחר לעריכה
 */
const TripDetailsEditor = ({ itineraryData }) => {
  const { getToken, userId } = useAuth();
  const { tripDetails, setTripDetails, setallTripData } =
    useContext(TripContext);

  // יצירת סטייט מקומי לעריכת היומן
  const [editedItinerary, setEditedItinerary] = useState({
    content: "",
    destination: "",
    duration: "",
    startDate: "",
    endDate: "",
  });

  // סטטוס העריכה
  const [editStatus, setEditStatus] = useState({
    isSaving: false,
    isSuccess: false,
    error: null,
    isEditing: false,
  });

  // אתחול הסטייט עם נתוני היומן כאשר הם מתקבלים
  useEffect(() => {
    if (itineraryData) {
      console.log(
        "TripDetailsEditor: Received new itinerary data",
        itineraryData
      );

      // בדיקה אם המשתמש כבר התחיל לערוך את היומן
      // אם כן, לא נרצה לאפס את הטקסט שלו
      if (editStatus.isEditing) {
        console.log("User is actively editing - not updating content");
        return;
      }

      let destination = "";
      let duration = "";
      let startDate = "";
      let endDate = "";

      // נסה להשיג את המטא-דאטה מפרטי הטיול
      if (itineraryData.tripDetails) {
        destination = itineraryData.tripDetails.vacation_location || "";
        duration = itineraryData.tripDetails.duration || "";

        if (itineraryData.tripDetails.dates) {
          startDate = itineraryData.tripDetails.dates.from || "";
          endDate = itineraryData.tripDetails.dates.to || "";
        }
      }

      // בדיקה אם יש מטא-דאטה ישירות באובייקט
      if (itineraryData.destination) destination = itineraryData.destination;
      if (itineraryData.duration) duration = itineraryData.duration;
      if (itineraryData.startDate) startDate = itineraryData.startDate;
      if (itineraryData.endDate) endDate = itineraryData.endDate;

      // כאשר עורכים יומן, מנסים לחלץ מידע מתוכן היומן אם חסר מידע מהטריפ דיטיילס
      if (!destination || !duration || !startDate || !endDate) {
        // ננסה לחלץ את היעד מהתוכן אם הוא לא הוגדר בפרטי הטיול
        const content = itineraryData.content || "";

        if (!destination) {
          const destinationMatch = content.match(
            /(?:trip to|in|for)\s+([^,\n]+)/i
          );
          if (destinationMatch) {
            destination = destinationMatch[1].trim();
          }
        }

        if (!duration) {
          const durationMatch = content.match(/(\d+)(?:-|\s)days?/i);
          if (durationMatch) {
            duration = durationMatch[1].trim();
          }
        }

        // בדיקות נוספות לחילוץ תאריכים אם חסר
        const dateRangeMatch = content.match(
          /(?:from|between)\s+(\w+\s+\d+)(?:st|nd|rd|th)?,?\s+(?:to|and|-)?\s+(\w+\s+\d+)(?:st|nd|rd|th)?/i
        );
        if (dateRangeMatch) {
          if (!startDate) startDate = dateRangeMatch[1].trim();
          if (!endDate) endDate = dateRangeMatch[2].trim();
        }
      }

      // בדיקה אם התוכן או הנתונים השתנו לפני עדכון הסטייט
      // זה יעזור למנוע עדכונים מיותרים שיכולים לגרום לאיבוד מידע שהמשתמש הזין
      const hasContentChanged =
        editedItinerary.content !== itineraryData.content;
      const hasMetadataChanged =
        editedItinerary.destination !== destination ||
        editedItinerary.duration !== duration ||
        editedItinerary.startDate !== startDate ||
        editedItinerary.endDate !== endDate;

      if (hasContentChanged || hasMetadataChanged) {
        console.log("TripDetailsEditor: Updating state with new data");
        setEditedItinerary({
          content: itineraryData.content || "",
          destination,
          duration,
          startDate,
          endDate,
        });
      } else {
        console.log("TripDetailsEditor: No changes detected in new data");
      }
    }
  }, [itineraryData, editStatus.isEditing]); // הסרת התלות ב-editedItinerary למניעת לולאה אינסופית

  // פונקציית טיפול בשינויים בטקסט
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    // סימון שהמשתמש התחיל לערוך
    if (!editStatus.isEditing) {
      setEditStatus((prev) => ({ ...prev, isEditing: true }));
    }
    setEditedItinerary((prev) => ({ ...prev, content: newContent }));
  };

  // פונקציית טיפול בשינויים בשדות מטא-דאטה
  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    // סימון שהמשתמש התחיל לערוך
    if (!editStatus.isEditing) {
      setEditStatus((prev) => ({ ...prev, isEditing: true }));
    }
    setEditedItinerary((prev) => ({ ...prev, [name]: value }));
  };

  // עדכון היומן בצ'אט בצורה מיידית
  const updateItineraryInChat = (messageId, newContent) => {
    if (
      !window.__processingHookState ||
      !window.__processingHookState.setPendingMessages
    ) {
      return false;
    }

    // עדכון ההודעה בצ'אט
    window.__processingHookState.setPendingMessages((prevMessages) => {
      // חיפוש ההודעה לפי מזהה
      const updatedMessages = prevMessages.map((msg) => {
        // אם זו ההודעה שצריך לעדכן
        if (
          msg.id === messageId ||
          (msg.isItinerary && msg.message && msg.message.includes("Day 1:"))
        ) {
          return {
            ...msg,
            message: newContent,
            displayMessage: newContent,
            wasUpdated: true,
            updatedAt: new Date().toISOString(),
            // הוספת מאפיינים לאנימציה
            highlight: true,
            animation: {
              pulse: true,
              fadeIn: true,
            },
          };
        }
        return msg;
      });

      return updatedMessages;
    });

    console.log("עדכון היומן בצ'אט הושלם בהצלחה");
    return true;
  };

  // שמירת היומן המעודכן
  const handleSave = async () => {
    setEditStatus({
      isSaving: true,
      isSuccess: false,
      error: null,
      isEditing: false,
    });

    try {
      // קבלת מזהה הצ'אט מנתוני היומן או מה-URL
      const chatId =
        itineraryData.chatId || window.location.pathname.split("/").pop();

      if (!chatId) {
        throw new Error("לא ניתן למצוא את מזהה הצ'אט");
      }

      // הכנת הנתונים המעודכנים לשמירה
      const updatedData = {
        itinerary: editedItinerary.content,
        metadata: {
          destination: editedItinerary.destination,
          duration: editedItinerary.duration,
          dates: {
            from: editedItinerary.startDate,
            to: editedItinerary.endDate,
          },
          updatedAt: new Date().toISOString(),
          editedByUser: true,
        },
      };

      // בנייה של כותרות ההרשאה
      const headers = { "Content-Type": "application/json" };
      if (userId) {
        const token = await getToken();
        headers.Authorization = `Bearer ${token}`;
      }

      // 1. עדכון מיידי של היומן בצ'אט לפני השמירה בשרת
      if (itineraryData.messageId) {
        updateItineraryInChat(itineraryData.messageId, editedItinerary.content);
      }

      // 2. עדכון פרטי הטיול בקונטקסט
      if (setTripDetails && tripDetails) {
        const updatedTripDetails = {
          ...tripDetails,
          vacation_location: editedItinerary.destination,
          duration: editedItinerary.duration,
          dates: {
            from: editedItinerary.startDate,
            to: editedItinerary.endDate,
          },
        };

        setTripDetails(updatedTripDetails);

        // 3. עדכון היומן המלא בקונטקסט
        if (setallTripData) {
          setallTripData((prevData) => ({
            ...prevData,
            itinerary: editedItinerary.content,
            metadata: {
              ...prevData?.metadata,
              destination: editedItinerary.destination,
              duration: editedItinerary.duration,
              dates: {
                from: editedItinerary.startDate,
                to: editedItinerary.endDate,
              },
              updatedAt: new Date().toISOString(),
            },
          }));
        }
      }

      // 4. שמירת הנתונים בשרת
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/itineraries?userId=${userId}`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            chatId,
            ...updatedData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`שגיאה בשמירת היומן: ${response.status}`);
      }

      const result = await response.json();

      // עדכון הסטטוס להצלחה
      setEditStatus({
        isSaving: false,
        isSuccess: true,
        error: null,
        isEditing: false, // איפוס דגל העריכה לאחר שמירה מוצלחת
      });

      // 5. עדכון היומן בזיכרון המקומי כדי להציג אותו בצ'אט כשחוזרים אליו
      window.__updatedItinerary = {
        content: editedItinerary.content,
        messageId: itineraryData.messageId,
        timestamp: Date.now(),
      };

      // 6. עדכון גם ה-editItineraryData בזיכרון המקומי
      window.__editItineraryData = {
        content: editedItinerary.content,
        messageId: itineraryData.messageId,
        destination: editedItinerary.destination,
        duration: editedItinerary.duration,
        startDate: editedItinerary.startDate,
        endDate: editedItinerary.endDate,
        timestamp: Date.now(),
      };

      // שמירה ב-localStorage לשימוש בצ'אט
      localStorage.setItem(
        "updatedItinerary",
        JSON.stringify({
          content: editedItinerary.content,
          messageId: itineraryData.messageId,
          timestamp: Date.now(),
        })
      );

      // שמירה ב-localStorage גם עבור עמוד העריכה
      localStorage.setItem(
        "editItineraryData",
        JSON.stringify({
          content: editedItinerary.content,
          messageId: itineraryData.messageId,
          destination: editedItinerary.destination,
          duration: editedItinerary.duration,
          startDate: editedItinerary.startDate,
          endDate: editedItinerary.endDate,
          timestamp: Date.now(),
          // שמירת tripDetails בפורמט מחרוזת
          tripDetails: JSON.stringify({
            vacation_location: editedItinerary.destination,
            duration: editedItinerary.duration,
            dates: {
              from: editedItinerary.startDate,
              to: editedItinerary.endDate,
            },
          }),
        })
      );

      // 7. אירוע מותאם לעדכון היומן - מאפשר לקומפוננטות אחרות להאזין לשינוי
      const updateEvent = new CustomEvent("itineraryUpdated", {
        detail: {
          content: editedItinerary.content,
          messageId: itineraryData.messageId,
          metadata: updatedData.metadata,
        },
      });
      document.dispatchEvent(updateEvent);

      // הודעת הצלחה שתיעלם אחרי 3 שניות
      setTimeout(() => {
        setEditStatus((prev) => ({ ...prev, isSuccess: false }));
      }, 3000);

      return result;
    } catch (error) {
      console.error("שגיאה בשמירת היומן:", error);
      setEditStatus({
        isSaving: false,
        isSuccess: false,
        error: error.message || "שגיאה בשמירת היומן",
        isEditing: true, // משאיר את דגל העריכה במקרה של שגיאה
      });
    }
  };

  // פונקציה לביטול העריכה וחזרה לגרסה המקורית
  const handleCancel = () => {
    // איפוס דגל העריכה
    setEditStatus((prev) => ({ ...prev, isEditing: false }));

    // החזרת הנתונים המקוריים מה-props
    if (itineraryData) {
      setEditedItinerary({
        content: itineraryData.content || "",
        destination: itineraryData.destination || "",
        duration: itineraryData.duration || "",
        startDate: itineraryData.startDate || "",
        endDate: itineraryData.endDate || "",
      });
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-[#1E2132] rounded-xl shadow-xl border border-blue-500/20 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-4 border-b border-blue-500/20">
          <h2 className="text-2xl font-bold text-white">עריכת יומן מסע</h2>
          <p className="text-blue-300 mt-1">
            כאן תוכל לערוך את פרטי יומן המסע שלך
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* מידע בסיסי על הטיול */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-blue-300 mb-1">
                יעד הטיול
              </label>
              <div className="relative">
                <RiMapPinLine className="absolute text-blue-400 left-3 top-3" />
                <input
                  type="text"
                  name="destination"
                  value={editedItinerary.destination}
                  onChange={handleMetadataChange}
                  className="w-full pl-10 pr-3 py-2 bg-[#232536] border border-blue-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="לאן אתה נוסע?"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-blue-300 mb-1">
                משך הטיול
              </label>
              <div className="relative">
                <RiTimeLine className="absolute text-blue-400 left-3 top-3" />
                <input
                  type="text"
                  name="duration"
                  value={editedItinerary.duration}
                  onChange={handleMetadataChange}
                  className="w-full pl-10 pr-3 py-2 bg-[#232536] border border-blue-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="מספר ימים"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-blue-300 mb-1">
                תאריך התחלה
              </label>
              <div className="relative">
                <RiCalendarLine className="absolute text-blue-400 left-3 top-3" />
                <input
                  type="text"
                  name="startDate"
                  value={editedItinerary.startDate}
                  onChange={handleMetadataChange}
                  className="w-full pl-10 pr-3 py-2 bg-[#232536] border border-blue-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="תאריך התחלה"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-blue-300 mb-1">
                תאריך סיום
              </label>
              <div className="relative">
                <RiCalendarLine className="absolute text-blue-400 left-3 top-3" />
                <input
                  type="text"
                  name="endDate"
                  value={editedItinerary.endDate}
                  onChange={handleMetadataChange}
                  className="w-full pl-10 pr-3 py-2 bg-[#232536] border border-blue-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="תאריך סיום"
                />
              </div>
            </div>
          </div>

          {/* תוכן היומן */}
          <div className="form-group">
            <label className="block text-sm font-medium text-blue-300 mb-1">
              תוכן היומן
            </label>
            <textarea
              name="content"
              value={editedItinerary.content}
              onChange={handleContentChange}
              rows="15"
              className="w-full px-3 py-3 bg-[#232536] border border-blue-500/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono text-sm"
              style={{ direction: "ltr", textAlign: "left" }}
            ></textarea>
            <p className="text-xs text-gray-400 mt-1">
              ערוך את תוכן היומן בפורמט Markdown. שמור על המבנה הכללי לתצוגה
              נכונה.
            </p>
          </div>

          {/* כפתורי פעולה */}
          <div className="flex flex-wrap justify-end gap-2 mt-6">
            {editStatus.isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="px-4 py-2 rounded-md flex items-center gap-2 text-sm bg-gray-600 hover:bg-gray-700 text-white"
                disabled={editStatus.isSaving}
              >
                <RiCloseLine className="text-lg" />
                בטל שינויים
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${
                editStatus.isSuccess
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : editStatus.isSaving
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              disabled={editStatus.isSaving || editStatus.isSuccess}
            >
              {editStatus.isSuccess ? (
                <>
                  <RiCheckLine className="text-lg" />
                  נשמר בהצלחה
                </>
              ) : editStatus.isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <RiSaveLine className="text-lg" />
                  </motion.div>
                  שומר...
                </>
              ) : (
                <>
                  <RiSaveLine className="text-lg" />
                  שמור שינויים
                </>
              )}
            </motion.button>
          </div>

          {/* הודעת סטטוס */}
          <AnimatedStatusMessage status={editStatus} />
        </div>
      </motion.div>
    </div>
  );
};

/**
 * רכיב להצגת הודעות סטטוס עם אנימציה
 */
const AnimatedStatusMessage = ({ status }) => {
  if (!status.isSuccess && !status.error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 rounded-lg flex items-center gap-2 ${
        status.isSuccess
          ? "bg-green-900/20 text-green-300 border border-green-500/30"
          : "bg-red-900/20 text-red-300 border border-red-500/30"
      }`}
    >
      {status.isSuccess ? (
        <>
          <RiCheckLine className="text-lg" />
          <span>היומן נשמר בהצלחה!</span>
        </>
      ) : (
        <>
          <RiCloseLine className="text-lg" />
          <span>{status.error || "אירעה שגיאה בשמירת היומן"}</span>
        </>
      )}
    </motion.div>
  );
};

export default TripDetailsEditor;
