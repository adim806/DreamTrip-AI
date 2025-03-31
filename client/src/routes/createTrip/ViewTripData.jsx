import React, { useState, useContext, useEffect } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import ViewMap from "../view-trip/compo/ViewMap";
import SearchData from "../view-trip/compo/SearchData";
import ChatPage from "../chatPage/ChatPage";
import { TripContext } from "@/components/tripcontext/TripProvider";

const ViewTripData = () => {
  const { tripDetails } = useContext(TripContext);
  const [activeTab, setActiveTab] = useState(0); // 0: צ'אט, 1: חיפוש, 2: פרטי טיול

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
  }, [tripDetails]);

  // פונקציה לבחירת התוכן שמוצג בחצי המסך השמאלי בהתאם לטאב הנבחר
  const renderLeftContent = () => {
    switch (activeTab) {
      case 0:
        return <ChatPage />;
      case 1:
        return <SearchData trip={tripDetails} />;
      case 2:
        return (
          <Box p={2}>
            <h2>פרטי טיול</h2>
            <p>כאן יוצגו פרטי הטיול</p>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box height="90vh" display="flex" flexDirection="column">
      {/* תפריט ניווט בעיצוב Material UI */}
      <Tabs
        value={activeTab}
        onChange={handleChange}
        centered
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="צ'אט" />
        <Tab label="חיפוש" />
        <Tab label="פרטי טיול" />
      </Tabs>

      {/* אזור התוכן הראשי המחולק לשני חלקים */}
      <Box flex={1} display="flex" borderTop="1px solid #ccc">
        {/* צד שמאל: תוכן בהתאם לטאב שנבחר */}
        <Box flex={1} overflow="auto" borderRight="1px solid #ccc">
          {renderLeftContent()}
        </Box>
        {/* צד ימין: תמיד מציג את המפה */}
        <Box flex={1}>
          <ViewMap trip={tripDetails} />
        </Box>
      </Box>
    </Box>
  );
};

export default ViewTripData;
