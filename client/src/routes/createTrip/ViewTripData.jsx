import ViewMap from "../view-trip/compo/ViewMap";
import {
  TripContext,
  TripProvider,
} from "@/components/tripcontext/TripProvider";
import { useContext, useEffect } from "react";
import LeftContainer from "../view-trip/compo/LeftContainer";

const ViewTripData = () => {
  console.log("IN ViewTripData FUNCTION");
  const { tripDetails, setTripDetails } = useContext(TripContext);

  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
  }, [tripDetails]);
  return (
    <div
      style={{
        height: "90vh", // Full viewport height
        display: "flex", // Flexbox container for side-by-side layout
        margin: "0", // Ensure no margins cause overflow
        padding: "0", // Remove padding
      }}
    >
      {/* Left Container */}
      <LeftContainer trip={tripDetails} />

      {/* Right Container */}
      <ViewMap trip={tripDetails} />
    </div>
  );
};

export default ViewTripData;
