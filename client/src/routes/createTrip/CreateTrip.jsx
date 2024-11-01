import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import './createTrip.css';





const CreateTrip = () => {

  // Initializes the navigate function for programmatic routing
  
  return (
    <div className="CreateTrip">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>create trip</h1>
        </div>
      </div>

    </div>
  );
};

export default CreateTrip;