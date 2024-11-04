import { getPlaceDetails, PHOTO_REF_URL } from "@/service/GlobalApi";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


const HotelCarditem = ({hotel}) => {

    console.log("IN HotelCarditem FUNCTION");
    const [photo_url, setPhotoUrl] = useState();
    useEffect(()=>{
        hotel&&getPlacePhoto();
    },[hotel])

    const getPlacePhoto=async()=>{
        const data={
        textQuery:hotel?.name
        }
        const result= await getPlaceDetails(data).then(resp=>{
        console.log(resp.data.places[0].photos[3].name);
        const photo_url=PHOTO_REF_URL.replace('{NAME}',resp.data.places[0].photos[3].name);
        setPhotoUrl(photo_url);
        });
        
    }


  return (
    <Link to={'https://www.google.com/maps/search/?api=1&query='+hotel?.name+','+hotel?.address} target="_blank"> 
    <div className="hover:scale-105 transition-all cursor-pointer" >
        <img src={photo_url?photo_url:"/place_holder.jpeg"} className="rounded-xl h-[180px] w-full object-cover" />
        <div className="my-2 flex flex-col gap-2">
            <h2 className="font-medium">{hotel?.name}</h2>
            <h2 className="text-xs text-gray-500">📍{hotel?.address}</h2>
            <h2 className="text-sm">💰{hotel?.price}</h2>
            <h2 className="text-sm">⭐{hotel?.rating} stars</h2>
        </div>
    </div>
    </Link>
  );
};

export default HotelCarditem;
