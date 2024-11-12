import { Button } from '@/components/ui/button';
import { getPlaceDetails, PHOTO_REF_URL } from '@/service/GlobalApi';
import { data } from 'autoprefixer';
import { useEffect, useState } from 'react';
import { IoIosSend } from "react-icons/io";


const InfoSection = ({data}) => {
  console.log("IN infoSection FUNCTION");

  const [photo_url, setPhotoUrl] = useState();
  useEffect(()=>{
    data&&getPlacePhoto();
  },[data])


  const getPlacePhoto=async()=>{
    const data={
      textQuery:'Thailand'
    }
    const result= await getPlaceDetails(data).then(resp=>{
      console.log(resp.data.places[0].photos[3].name);
      const photo_url=PHOTO_REF_URL.replace('{NAME}',resp.data.places[0].photos[3].name);
      setPhotoUrl(photo_url);
    });
    
  }

 
  
  return (
    <div>
      <img src={photo_url?photo_url:"/place_holder.jpeg"} className='h-[360px] w-full object-cover rounded-xl' />
      <div className="flex justify-between items-center">
        <div className='my-5 flex flex-col gap-2'>
          <h2 className='font-bold text-2xl'>
            Thiland</h2>
          <div className="flex gap-5">
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>📅5 Day</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>💰 Budget</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>🥂No. of travlers:</h2>

          </div>
        </div>
        <Button><IoIosSend /> </Button>

      </div>
    </div>
  );
};

export default InfoSection;
