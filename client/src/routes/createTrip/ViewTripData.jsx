import { useParams } from 'react-router-dom';
import './createTrip.css';
import InfoSection from '../view-trip/compo/InfoSelection2';


const ViewTripData = () => {
  console.log("IN ViewTripData FUNCTION");
  
  
  return (
    <div className="CreateTrip p-10 md:px-20 lg:px-44 xl:px-56 h-screen overflow-y-scroll">
      {/* Information section */}
      <InfoSection />

      {/* hotel section <Hotels trip={trip}/>*/}
      

      {/* daily plan <PlacesToVisit trip={trip}/>*/}
      

      {/* footer <Footer/>*/}
      
    </div>
  );
};

export default ViewTripData;