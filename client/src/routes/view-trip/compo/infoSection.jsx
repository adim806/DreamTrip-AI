import { Button } from '@/components/ui/button';

import { useEffect, useState } from 'react';

import { IoIosSend } from "react-icons/io";


const InfoSection = ({trip}) => {
  console.log("IN infoSection FUNCTION");

  
  return (
    <div>
      <img src='/place_holder.jpeg' className='h-[360px] w-full object-cover rounded-xl' />
      <div className="flex justify-between items-center">
        <div className='my-5 flex flex-col gap-2'>
          <h2 className='font-bold text-2xl'>
            {trip?.userSelection?.vacation_location}</h2>
          <div className="flex gap-5">
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>📅{trip?.userSelection?.duration} Day</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>💰{trip?.userSelection?.constraints?.budget} Budget</h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-md md:text-md'>🥂No. of travlers: {trip?.userSelection?.constraints?.travel_type}</h2>

          </div>
        </div>
        <Button><IoIosSend /> </Button>

      </div>
    </div>
  );
};

export default InfoSection;
