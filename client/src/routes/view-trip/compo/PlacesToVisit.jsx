import PlaceCarditem from "./PlaceCarditem";


const PlacesToVisit = ({trip}) => {
  console.log("IN PlacesToVisit FUNCTION");
  //<h2>{place?.place}</h2>
  
  return (
    <div>
      <h2 className="font-bold text-xl">PlacesToVisit</h2>

      <div>
        {trip?.tripData?.itinerary.map((item,index)=>(
            <div className="mt-5" key={index}>
                <h2 className="font-medium text-lg">Day {item.day}:</h2>
                <div className="grid md:grid-cols-2 gap-5">
                {item?.plan?.map((place,index)=>(
                    <div className="" key={index}>
                        <h2 className="font-medium text-sm text-orange-400">{place?.time}</h2>
                        <PlaceCarditem place={place}/>
                        
                    </div>
                ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PlacesToVisit;
