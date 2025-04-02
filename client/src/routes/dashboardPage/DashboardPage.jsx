import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { SplineSceneBasic } from '../../components/ui/spline-scene-demo';

/**
 * DashboardPage Component
 *
 * This component is the main dashboard where users can create new chats, analyze images, or get coding assistance.
 * It includes an input form to submit queries, which initiates new chats.
 * 
 * ### Key Functionalities:
 * - **Mutation for New Chat Creation**: Creates a new chat with a POST request and navigates to the newly created chat's page.
 * - **Form Submission Handling**: Submits user input and triggers the mutation to create a chat.
 * 
 * ### React Query Usage:
 * - **useQueryClient**: For cache management, allowing the chat list to be refetched upon new chat creation.
 * - **useMutation**: For posting new chat requests to the server, invalidating cache for recent chats to stay updated.
 * 
 * ### Navigation:
 * - Redirects the user to the newly created chat's page after successful chat creation.
 * 
 * @component
 * @returns {JSX.Element} The rendered component for the Dashboard page.
 */

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async(text) => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({text}),
      }).then(res => res.json())
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      navigate(`/dashboard/chats/${id}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if(!text) return;
    mutation.mutate(text);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#222c31]">
      {/* Background Spline Scene Container */}
      <div className="absolute inset-0 w-full h-full">
        <SplineSceneBasic />
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative h-full flex flex-col items-center px-8">
          <div className="flex-1 flex flex-col items-center w-full max-w-6xl mx-auto pt-6">
            {/* Logo Section */}
            <div className="flex items-start gap-4 ml-[-150px] rounded-2xl backdrop-blur-sm pointer-events-auto">
              <img src="logo.png" alt="" className="w-16 h-16 mt-0" />
              <h1 className="text-6xl bg-gradient-to-r from-[#217bfe] to-[#e55571] bg-clip-text text-transparent font-bold">
                DreamTrip-AI
              </h1>
            </div>
          </div>

          {/* Input Section */}
          <div className="mt-auto w-full max-w-2xl bg-black/40 backdrop-blur-md rounded-2xl shadow-lg mb-20 border border-white/10 pointer-events-auto">
            <form className="w-full flex items-center justify-between" onSubmit={handleSubmit}>
              <input 
                type="text" 
                name="text" 
                placeholder="Ask me Anything..." 
                className="flex-1 py-4 px-6 bg-transparent border-none outline-none text-white text-lg placeholder-gray-400" 
              />
              <button className="bg-white/10 hover:bg-white/20 rounded-full border-none cursor-pointer p-4 m-3 flex items-center justify-center transition-all backdrop-blur-sm">
                <img src="/arrow.png" alt="" className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;