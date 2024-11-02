import { useParams } from 'react-router-dom';
import './createTrip.css';


const CreateTrip = () => {
    //const {tripID}= useParams();
  
  return (
    <div className="CreateTrip">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>create trip for </h1>
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;