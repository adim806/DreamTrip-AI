import { TripContext } from '@/components/tripcontext/TripProvider';
import { Button } from '@/components/ui/button';
import { getPlaceDetails, PHOTO_REF_URL } from '@/service/GlobalApi';
import { data } from 'autoprefixer';
import { useContext, useEffect, useState } from 'react';
import { IoIosSend } from "react-icons/io";


const InfoSection = ({trip,alltrip}) => {
  console.log("IN infoSection111 FUNCTION");
  //console.log("trip:"+trip?);

  //console.log("alltrip:"+alltrip?);
  //console.dir(alltrip?);


  console.log("hotels:"+alltrip?.hotels[0]);
  // הדפסת מערך המלונות כולו בפורמט JSON עם ריווח
  console.log(JSON.stringify(alltrip?.hotels, null, 2));
  console.log("starting forEACH\n");

  //test succ for printing the hotel from obj trip data print hotels details
  alltrip?.hotels?.forEach((hotel, index) => {
    console.log(`Hotel ${index + 1}:`);
    console.log(`  Name: ${hotel.name}`);
    console.log(`  Rating: ${hotel.rating}`);
    console.log(`  Location: ${hotel.location}`);
  });

  //let tempData= JSON.stringify(alltrip);
  //console.log("before parse alltrip:"+ JSON.parse(JSON.stringify(alltrip)));

  //console.log(tempData);
  //console.log("my tripObject with stringfy:\n" + JSON.stringify(alltrip));
  //console.log("type of:\n" + typeof tempData);


  const [photo_url, setPhotoUrl] = useState();
  useEffect(()=>{
    trip&&getPlacePhoto();
    
  },[trip,alltrip])
  


  const getPlacePhoto=async()=>{
    const data={
      textQuery:trip?.vacation_location
    }
    const result= await getPlaceDetails(data).then(resp=>{
      console.log(resp.data.places[0].photos[3].name);
      const photo_url=PHOTO_REF_URL.replace('{NAME}',resp.data.places[0].photos[3].name);
      setPhotoUrl(photo_url);
    });
    
  }

 
  
  return (
    <>
    
    <div className='photoHOTEL #073c13'>
      <img src={photo_url?photo_url:"/place_holder.jpeg"} className='h-[360px] w-full object-cover rounded-xl' />
      <div className="flex justify-between items-center">
        <div className='my-5 flex flex-col gap-2'>
          <h2 className='font-bold text-2xl'>
          {trip?.vacation_location}</h2>
          <div className="flex gap-5">
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>📅{trip?.duration} Days</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>💰{trip?.constraints?.budget.travel_type} Budget</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>🥂{trip?.constraints?.travel_type} travlers</h2>

          </div>
        </div>
        <Button><IoIosSend /> </Button>

      </div>
      
    </div>
    
    <div>
        
    </div>
    </>
    
  );
};

export default InfoSection;
