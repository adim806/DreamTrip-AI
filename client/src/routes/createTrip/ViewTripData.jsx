
import './createTrip.css';
import ViewMap from '../view-trip/compo/ViewMap';
import { TripContext, TripProvider } from '@/components/tripcontext/TripProvider';
import { useContext, useEffect } from 'react';

const ViewTripData = () => {
  console.log("IN ViewTripData FUNCTION");
  const { tripDetails, setTripDetails } = useContext(TripContext);


  useEffect(() => {
    console.log("Trip details updated:", tripDetails);
    // עדכונים נוספים בהתאם לטריגר
  }, [tripDetails]);
  return (
    <div >
      <div >
        <ViewMap trip={tripDetails}/>

      </div>

      {/* Information section <InfoSection/>*/}
      

      {/* hotel section <Hotels trip={trip}/>*/}
      

      {/* daily plan <PlacesToVisit trip={trip}/>*/}
      

      {/* footer <Footer/>*/}
      
    </div>
  );
};

export default ViewTripData;