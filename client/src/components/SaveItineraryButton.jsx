import React, { useState, useContext } from 'react';
import { RiSaveLine, RiCheckLine } from 'react-icons/ri';
import tripPlanService from '@/utils/services/tripPlanService';
import { useToast } from '@/components/ui/use-toast';
import { TripContext } from '@/components/tripcontext/TripProvider';

/**
 * Button component for saving itineraries from chat
 */
const SaveItineraryButton = ({ rawContent, destination, duration, chatId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const { tripDetails } = useContext(TripContext);

  const handleSave = async () => {
    if (isSaved || isSaving) return;

    try {
      setIsSaving(true);

      // Get the vacation location from trip context
      const vacationLocation = tripDetails?.vacation_location;
      console.log("Saving itinerary with vacation location:", vacationLocation);

      // Use vacation_location from trip context as the primary destination
      let finalDestination = vacationLocation || destination;
      
      // If still no destination, try to extract from content
      if (!finalDestination && rawContent) {
        // Try to extract destination from the content
        const destinationMatch = rawContent.match(/(?:יעד|destination):\s*([^\n]+)/i);
        if (destinationMatch && destinationMatch[1]) {
          finalDestination = destinationMatch[1].trim();
        }
      }

      // Extract duration from content if not provided
      let finalDuration = duration;
      if (!finalDuration && rawContent) {
        // Try to extract duration from the content
        const durationMatch = rawContent.match(/(?:משך|duration):\s*([^\n]+)/i) || 
                             rawContent.match(/(\d+)\s+(?:ימים|days)/i);
        if (durationMatch && durationMatch[1]) {
          finalDuration = durationMatch[1].trim();
        }
      }

      // Prepare data for saving to savedTrips
      const tripData = {
        plan: rawContent,
        tripDetails: {
          destination: finalDestination || "Unknown destination",
          duration: finalDuration || "Unknown duration",
          vacation_location: vacationLocation // Include the original vacation_location
        },
        destination: finalDestination || "Unknown destination",
        duration: finalDuration || "Unknown duration",
        chatId,
        structuredPlan: {
          destination: finalDestination || "Unknown destination",
          duration: finalDuration || "Unknown duration"
        }
      };

      // Call API to save trip
      const success = await tripPlanService.saveToMyTrips(tripData);

      if (success) {
        // Show success message
        toast({
          title: "יומן המסע נשמר בהצלחה!",
          description: "תוכל לצפות בו בדף 'היומנים שלי'",
          variant: "success",
        });

        // Dispatch custom event that can be listened to elsewhere in the app
        const savedEvent = new CustomEvent('tripPlanGenerated', { 
          detail: { 
            savedTripId: chatId,
            destination: finalDestination 
          }
        });
        document.dispatchEvent(savedEvent);

        setIsSaved(true);
      } else {
        throw new Error("Failed to save itinerary");
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      
      toast({
        title: "שגיאה בשמירת יומן המסע",
        description: error.message || "אירעה שגיאה בשמירת יומן המסע. נסה שנית מאוחר יותר.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isSaved || isSaving || !rawContent}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
        isSaved
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
      title={isSaved ? "יומן המסע נשמר" : "שמור את יומן המסע"}
    >
      {isSaving ? (
        <>
          <span className="animate-spin">⏳</span>
          שומר...
        </>
      ) : isSaved ? (
        <>
          <RiCheckLine />
          נשמר
        </>
      ) : (
        <>
          <RiSaveLine />
          שמור יומן מסע
        </>
      )}
    </button>
  );
};

export default SaveItineraryButton; 