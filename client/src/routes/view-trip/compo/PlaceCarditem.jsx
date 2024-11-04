import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FaMapLocationDot } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { getPlaceDetails, PHOTO_REF_URL } from "@/service/GlobalApi";


const PlaceCarditem = ({place}) => {
  
  const [photo_url, setPhotoUrl] = useState();
  useEffect(()=>{
    place&&getPlacePhoto();
  },[place])


  const getPlacePhoto=async()=>{
    const data={
      textQuery:place?.place
    }
    const result= await getPlaceDetails(data).then(resp=>{
      //console.log(resp.data.places[0].photos[3].name);
      const photo_url=PHOTO_REF_URL.replace('{NAME}',resp.data.places[0].photos[3].name);
      setPhotoUrl(photo_url);
    });
    
  }
  
  return (
    <Link to={'https://www.google.com/maps/search/?api=1&query='+place?.place} target="_blank">
        <div className="border rounded-xl p-3 flex gap-5 hover:scale-105 transition-all hover:shadow-md cursor-pointer">
            <img src={photo_url?photo_url:"/place_holder.jpeg"} className="w-[130px] h-[130px] rounded-xl object-cover" />
            <div>
                <h2 className="font-bold text-lg">{place?.place}</h2>
                <p className="text-sm text-gray-400">{place?.details}</p>
                <h2 className="mt-2">🕙 {place?.time_to_spend}</h2>
                <Button size="sm"><FaMapLocationDot/></Button>
            </div>
        </div>
    </Link>
  );
};

export default PlaceCarditem;
