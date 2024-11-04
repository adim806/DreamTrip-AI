import { Link } from "react-router-dom";
import HotelCarditem from "./HotelCarditem";


const Hotels = ({trip}) => {
  console.log("IN Hotels FUNCTION");
  console.log(trip);

  
  return (
    <div>
      <h2 className="font-bold text-xl mt-5">Hotels Recommendation:</h2>
      {console.log(trip.tripData) } 
      {trip?.tripData?.hotels?.length === 0 && <p>No hotels found</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {trip?.tripData?.hotels?.map((hotel,index)=>(
          <HotelCarditem key={index} hotel={hotel}/>
        ))}
      </div>
    </div>
  );
};

export default Hotels;
