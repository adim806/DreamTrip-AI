import { useEffect, useState } from "react";
import { getPlaceDetails, PHOTO_REF_URL } from "@/service/GlobalApi";

const Hotels = ({ trip, alltrip }) => {
  console.log("IN Hotels FUNCTION");
  console.log("Trip:", trip);
  console.log("All Trip:", alltrip);

  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (alltrip?.hotels?.length > 0) {
      alltrip.hotels.forEach((hotel, index) => {
        getPlacePhoto(hotel.name, index);
      });
    }
  }, [alltrip,trip]);

  const getPlacePhoto = async (hotelName, index) => {
    try {
      const data = { textQuery: hotelName };
      const result = await getPlaceDetails(data);
      const photoRef = result.data.places[0]?.photos?.[3]?.name;
      if (photoRef) {
        const photoUrl = PHOTO_REF_URL.replace('{NAME}', photoRef);

        setPhotos((prevPhotos) => {
          const newPhotos = [...prevPhotos];
          newPhotos[index] = photoUrl;
          return newPhotos;
        });
      }
    } catch (error) {
      console.error("Failed to fetch photo:", error);
    }
  };

  return (
    <div className="bg-lime-700 p-4 rounded-lg h-[600px] overflow-hidden">
      <h2 className="font-bold text-xl mt-5 text-white">Hotels Recommendation:</h2>

      <div className="h-[500px] overflow-y-scroll mt-4">
        {alltrip?.hotels?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {alltrip.hotels.map((hotel, index) => (
              <div 
                key={index} 
                className="hover:scale-105 transition-all cursor-pointer p-3 bg-white rounded-lg shadow-lg flex flex-col items-center"
              >
                <img
                  src={photos[index] || "/place_holder.jpeg"}
                  alt={hotel.name}
                  className="rounded-lg h-[150px] w-full object-cover"
                />
                <div className="mt-2 w-full text-center">
                  <h2 className="font-semibold text-lg text-gray-800">{hotel.name}</h2>
                  <p className="text-xs text-gray-600 mt-1">📍 {hotel.address}</p>
                  <div className="flex justify-center mt-1 gap-2 text-sm text-gray-700">
                    <span>💰 {hotel.price}</span>
                    <span>⭐ {hotel.rating} stars</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white mt-4">No hotels found</p>
        )}
      </div>
    </div>
  );
};

export default Hotels;
