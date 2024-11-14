import { db } from '@/service/firebaseConfig';
import { doc, getDoc, limitToLast } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import InfoSection from '../compo/infoSection';
import Hotels from '../compo/Hotels';
import PlacesToVisit from '../compo/PlacesToVisit';
import Footer from '../compo/Footer';


const Viewtrip = () => {
  console.log("IN VIEW TRIP FUNCTION");

  const {tripID}= useParams();
  const[trip,setTrip]=useState([]);
  useEffect(()=>{
    tripID&&GetTriData();
  },[tripID]);

  //use to get trip info from the fire base

  const GetTriData=async() =>{
      const docRef= doc(db,'AiTrips',tripID);
      const docSnap= await getDoc(docRef);
      if(docSnap.exists()) {
        console.log("Document:", docSnap.data());
        setTrip(docSnap.data());
      }

      else{
        console.log("No such document!");
        //toast("no trip found");  
      }
    };
  
  return (
    <div className='flex p-10 md:px-20 lg:px-44 xl:px-56 h-screen overflow-y-scroll'>
      {/* Information section */}
      <InfoSection trip={trip}/>

      {/* hotel section */}
      <Hotels trip={trip}/>

      {/* daily plan */}
      <PlacesToVisit trip={trip}/>

      {/* footer */}
      <Footer/>
    </div>
  );
};

export default Viewtrip;
