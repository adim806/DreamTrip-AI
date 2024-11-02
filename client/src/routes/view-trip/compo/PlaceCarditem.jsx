import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FaMapLocationDot } from "react-icons/fa6";


const PlaceCarditem = ({place}) => {

  
  return (
    <Link to={'https://www.google.com/maps/search/?api=1&query='+place?.place} target="_blank">
        <div className="border rounded-xl p-3 flex gap-5 hover:scale-105 transition-all hover:shadow-md cursor-pointer">
            <img src="/place_holder.jpeg" className="w-[130px] h-[130px] rounded-xl" />
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
