import { useParams } from 'react-router-dom';
import './createTrip.css';
import InfoSection from '../view-trip/compo/InfoSelection2';
import ViewMap from '../view-trip/compo/ViewMap';


const ViewTripData = () => {
  console.log("IN ViewTripData FUNCTION");
  
  
  return (
    <div >
      <div >
        <ViewMap/>

      </div>

      {/* Information section <InfoSection/>*/}
      

      {/* hotel section <Hotels trip={trip}/>*/}
      

      {/* daily plan <PlacesToVisit trip={trip}/>*/}
      

      {/* footer <Footer/>*/}
      
    </div>
  );
};

export default ViewTripData;