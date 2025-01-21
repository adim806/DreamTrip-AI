import ViewMap from '../view-trip/compo/ViewMap';
import { TripContext } from '@/components/tripcontext/TripProvider';
import { useContext, useEffect } from 'react';
import LeftContainer from '../view-trip/compo/LeftContainer';

const ViewTripData = () => {
  const { tripDetails } = useContext(TripContext);

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
