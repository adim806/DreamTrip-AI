import { Link } from "react-router-dom";


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
            <Link key={index} to={'https://www.google.com/maps/search/?api=1&query='+hotel?.name+','+hotel?.address} target="_blank"> 
            <div className="hover:scale-105 transition-all cursor-pointer" >
                <img src='/place_holder.jpeg' className="rounded-xl" />
                <div className="my-2 flex flex-col gap-2">
                    <h2 className="font-medium">{hotel?.name}</h2>
                    <h2 className="text-xs text-gray-500">📍{hotel?.address}</h2>
                    <h2 className="text-sm">💰{hotel?.price}</h2>
                    <h2 className="text-sm">⭐{hotel?.rating} stars</h2>

                </div>
            </div>
            </Link>
        ))}
      </div>
    </div>
  );
};

export default Hotels;
