import { useContext, useState } from 'react';
import './newPromt.css'
import { useRef, useEffect} from 'react';
import  Upload from '../upload/Upload';
import { IKImage } from 'imagekitio-react';

import Markdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@google/generative-ai';


import { useNavigate } from 'react-router-dom';
import { TripContext } from '../tripcontext/TripProvider';


/**
 * NewPromt Component
 * 
 * This component handles the interactive chat interface with functionality for user input, 
 * image upload, and dynamic conversation display. It manages user queries, processes responses 
 * from the Gemini AI model, and updates the chat log based on user interactions.
 *
 * Key Functionalities:
 * - **User Input Handling**: Captures user text input and submits it to the chat model.
 * - **Image Uploading**: Integrates image uploads via the ImageKit API for adding visuals to conversations.
 * - **Gemini Model Interaction**: Uses Gemini API's `startChat` method to manage chat history 
 *    and respond to user messages dynamically.
 * - **Real-Time Chat Display**: Displays each user query and Gemini's response in real-time, 
 *    leveraging Markdown for text formatting and streaming for seamless conversation.
 * - **Auto Scroll**: Automatically scrolls the chat to the latest message.
 *
 * Props:
 * - `data` (Object): Contains chat history and metadata about previous interactions in the chat.
 *
 * State:
 * - `question` (String): Stores the current user question being processed.
 * - `answer` (String): Holds the Gemini AI's response to the latest user question.
 * - `img` (Object): Manages image data, including loading status, error states, and both database 
 *    and AI-derived data for uploaded images.
 *
 * References:
 * - `endRef` (Ref): References the end of the chat container to enable auto-scrolling to the latest message.
 * - `formRef` (Ref): References the form input for resetting after successful submission.
 * 
 * Important Methods:
 * - **add(text, isInitial)**: Sends a message to the Gemini model. If `isInitial` is true, it initializes
 *    the chat with the first message. Otherwise, it updates the conversation with each user input.
 * - **handleSubmit(e)**: Event handler for submitting the form, initiates `add()` with the user query.
 *
 * API Integration:
 * - Uses react-query's `useMutation` to manage `PUT` requests to the server for saving chat data.
 * - `useMutation` triggers a re-fetch of chat data upon success, ensuring the latest chat state is displayed.
 * 
 * Usage:
 * Place this component within a layout or chat page to create a responsive and interactive
 * chat interface with support for rich text, image upload, and real-time updates.
 *
 */





const NewPromt = ({data})=>{
    const [question,setQuestion] = useState(""); 
    const [answer,setAnswer] = useState(""); 
    const [img, setImg] = useState({
        isLoading: false,
        error: "",
        dbData: {},
        aiData: {},
    });
    console.log("API Key:", import.meta.env.VITE_GEMINI_PUBLIC_KEY);

    const [loading,setloading] = useState(false);
    const navigate = useNavigate();
    const [userOBJ,setUserOBJ] = useState({});

    //this is the main model (model_1)
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `
      You are a highly intelligent travel agent called 'Meller-AI'. Your primary goal is to analyze user input, classify it into a structured format, and respond accordingly as a knowledgeable travel assistant.

      ### Tasks:
      1. **Input Analysis**:
        - Classify the user's input into one of two modes:
          - "Advice": For general travel-related queries or advice.
          - "Trip-Building": For requests requiring a detailed travel plan.
        - Determine if the input provides complete information or if additional details are required.
        - Return a structured JSON object with the analyzed input details.

      2. **Responding to User**:
        - If the mode is "Advice":
          - Provide detailed and relevant travel advice.
          - Ask clarifying questions if the input is incomplete.
        - If the mode is "Trip-Building":
          - Use the structured data to create or continue a personalized travel plan.
          - If data is incomplete, ask targeted questions to fill in missing information.

      ### Response Format:
      Return a JSON object structured as follows:
      \`\`\`json
      {
        "mode": "Advice" or "Trip-Building",
        "status": "Complete" or "Incomplete",
        "response": "Your detailed response here if clarification is needed",
        "data": {
          "vacation_location": "string",
          "duration": "integer",
          "constraints": {
            "travel_type": "string",
            "preferred_activity": "string",
            "budget": "string",
            "special_requirements": [
              "Eco-Friendly",
              "Accessible for Disabilities",
              "Kid-Friendly",
              "Pet-Friendly",
              "Avoid long walks",
              "Close to transportation",
              "Vegetarian/Vegan dining"
            ]
          },
          "preferences": {
            "hotel_preferences": "string",
            "dining_preferences": "string",
            "transportation_mode": "string"
          },
          "notes": "string"
        }
      }
      \`\`\`

      ### Guidelines:
      - Always maintain context based on the conversation history.
      - Respond in a professional, concise, and friendly manner.
      - Use user-provided constraints and preferences to enhance responses.
    `,
    });
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    };
    //responseMimeType: "application/json" חשובבבב
    //{ role: "user", parts: [{ text: "Updated context based on the latest analysis." }] },
    //{ role: "model", parts: [{ text: userOBJ?.response || "Awaiting user input." }] },
    const chat = model.startChat({
      generationConfig,
      history: [
          ...(data?.history?.map(({ role, parts }) => ({
              role,
              parts: [{ text: parts[0].text }],
          })) || []), // התוצאה המתקבלת תהיה מערך ריק במקרה ש-data או data.history אינם קיימים

      ],
      
    });

  
    const endRef= useRef(null);
    const formRef= useRef(null);
    useEffect(() => {
      const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior:'smooth' });
      };
      scrollToBottom();
    },[data,question,answer,img.dbData]);

    const queryClient = useQueryClient();

  
    const mutation = useMutation({
      mutationFn: async() =>{
        return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`,{
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({question: question.length ? question : undefined,
            answer,
            img: img.dbData?.filePath || undefined,
          }),
        }).then((res)=>res.json())
      },
      onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["chat",data._id] }).then(()=>{
          console.log("on success");
          formRef.current.reset();
          setQuestion("");
          setAnswer("");
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
      },
      onError: (err) => {
        console.log(err);
      },
    });
    



    //////////////////////test func 1
    // model_2
    //analyze the user promt and extract the relevant data variables and then send in generic structure for ai genrate trip  
    const anlayze_UserPrompt1 = async (UserPrompt) => {
      //setloading(true);
      //the ideal is to start chat with history and in the systeminsruction att we can present that he will act like a smart trip planner

      console.log("IN ANALAYZR varPROMT1 FUNC");
      console.log("The User Prompt: \n"+ UserPrompt);

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
      const modela = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `
        You are a smart travel agent called 'Meller-AI model 2'. Analyze the user's input and classify it into a structured format to prepare for detailed trip planning.

        Return a JSON object with the following structure:
        {
          "mode": "Advice" or "Trip-Building", // Determines if the user needs advice or a detailed travel plan
          "status": "Complete" or "Incomplete", // Whether enough information has been provided
          "response": "Your detailed response here if clarification is needed", // Suggestion or clarification message
          "data": {
            "vacation_location": "string", // Destination specified by the user
            "duration": "integer", // Number of days for the trip
            "constraints": {
              "travel_type": "string", // e.g., Couple, Family, Solo Traveler, Adventure
              "preferred_activity": "string", // Specific activity preference, e.g., Nature, Museums, Shopping
              "budget": "string", // Budget level: Cheap, Moderate, Luxury
              "special_requirements": [ // List of special requirements (new addition)
                "Eco-Friendly",
                "Accessible for Disabilities",
                "Kid-Friendly",
                "Pet-Friendly",
                "Avoid long walks",
                "Close to transportation",
                "Vegetarian/Vegan dining"
              ]
            },
            "preferences": { // Additional preferences for detailed planning (new section)
              "hotel_preferences": "string", // e.g., '5-star hotels', 'Budget-friendly', 'Near city center'
              "dining_preferences": "string", // e.g., 'Vegan', 'Local cuisine'
              "transportation_mode": "string" // e.g., 'Public transport', 'Car rental'
            },
            "notes": "string" // Any free-text notes from the user (new field)
          }
        }`,
      });

      try {
        setloading(true);
        const result = await modela.generateContentStream(UserPrompt);
        let FINAL_TEXT_ANS="";
        // Print text as it comes in.
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          FINAL_TEXT_ANS+=chunkText;
        }
        console.log("TEXT_ANS1: \n"+ FINAL_TEXT_ANS);

        console.log("result: \n"+ result.stream.toString());

        //setAnswer(FINAL_TEXT_ANS);

        ///NEED TO THINK ABOUT SAVING STATE WHEN WE HAVE ALL THE DATA WE CAN MOVE ON TO DISPLAY TRIPdata-

        try {
          /// need to check if there is full data trip(like destination)
          // Try parsing the text response to JSON
          console.log("Try parsing the text response to JSON IN ANALAYZR varPROMT1 FUNC: \n");
          
          console.log(typeof FINAL_TEXT_ANS);

         // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
          const jsonMatch = FINAL_TEXT_ANS.match(/{[\s\S]*}/);

          console.log("after match on text: \n" + jsonMatch +"\n"+ typeof jsonMatch);//object
          console.log("Vacation location: "+ jsonMatch?.vacation_location);
          

          // if statement that indicates if jsonMatch is null -> it means that we get {}==that means all trip data
          if (jsonMatch){
            console.log("in jsonmatch if statement:\n");

            const jsonString = jsonMatch[0]; // מציאת חלק ה-JSON בלבד
            console.log("jsonMatch[0]: \n" + jsonString +"\n"+ typeof jsonString);//string
            
            try {
              console.log("before parsing\n");

              const jsonObject = JSON.parse(jsonString); // המרה לאובייקט JSON
              console.log("before parsing\n"+ jsonObject);
              console.log("Mode chat: "+ jsonObject?.mode);
              console.log("vacation_location: "+ jsonObject?.data?.vacation_location);
              //EditText_toGenericPrompt(jsonObject);
              setloading(false);

              return jsonObject;

            } catch (error) {
              console.error("Failed to parse JSON:", error.message);
              return null;
            }
          }

          //else ---> we dont get back json format(jsonmatch==null) and that means we didnt fully data trip so we need to ask again
          console.log("in jsonmatch else statement:\n");//object
          //EditText_toGenericPrompt(parsedData);
          
        } catch (error) {
          console.error("Invalid JSON format:", error);
          return null;
        }
          
      } catch (error) {
        console.log("Error: " + error);
      }





    };
    

    // displays in the info secction
    //new trick to get same data
    const { setTripDetails , setallTripData } = useContext(TripContext);

    
    
    /////////////test func 2!!
    const generatePromptFromObject = (tripDetails) => {
      // בדיקה אם האובייקט מכיל מידע
      if (!tripDetails || typeof tripDetails !== "object") {
        return "No valid trip details provided.";
      }
    
      const {
        vacation_location,
        duration,
        constraints = {},
        preferences = {},
        notes,
      } = tripDetails;
    
      // שליפת מידע מתוך constraints
      const {
        travel_type = "Not specified",
        preferred_activity = "Not specified",
        budget = "Not specified",
        special_requirements = [],
      } = constraints;
    
      // שליפת מידע מתוך preferences
      const {
        hotel_preferences = "Not specified",
        dining_preferences = "Not specified",
        transportation_mode = "Not specified",
      } = preferences;
    
      // טיפול בדרישות מיוחדות
      const specialRequirementsText =
        special_requirements.length > 0
          ? special_requirements.join(", ")
          : "No specific requirements provided.";
    
      // יצירת המחרוזת הסופית
      let result = `Generate a detailed travel plan for the following trip:\n`;
    
      if (vacation_location) {
        result += `- **Location**: ${vacation_location}\n`;
      }
    
      if (duration) {
        result += `- **Duration**: ${duration} days\n`;
      }
    
      if (travel_type !== "Not specified") {
        result += `- **Travel Type**: ${travel_type}\n`;
      }
    
      if (preferred_activity !== "Not specified") {
        result += `- **Preferred Activity**: ${preferred_activity}\n`;
      }
    
      if (budget !== "Not specified") {
        result += `- **Budget**: ${budget}\n`;
      }
    
      if (hotel_preferences !== "Not specified") {
        result += `- **Hotel Preferences**: ${hotel_preferences}\n`;
      }
    
      if (dining_preferences !== "Not specified") {
        result += `- **Dining Preferences**: ${dining_preferences}\n`;
      }
    
      if (transportation_mode !== "Not specified") {
        result += `- **Transportation Mode**: ${transportation_mode}\n`;
      }
    
      if (specialRequirementsText !== "No specific requirements provided.") {
        result += `- **Special Requirements**: ${specialRequirementsText}\n`;
      }
    
      if (notes) {
        result += `- **Additional Notes**: ${notes}\n`;
      }
    
      return result.trim();
    };
    
    
    
    const [isLoading, setIsLoading] = useState(false);

    /////my test build plan ai  func 3!!! my new builder function
    const BuildPlanAI_2= async(finalPromt_str,parsedData)=>{
      console.log("BuildPlanAI_2 FUNCTION");


      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
      const model_3 = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "\nYou are a highly skilled travel planner specializing in creating personalized travel itineraries. Your goal is to generate a detailed and structured travel plan based on user input, focusing exclusively on activities and user constraints.\n\n### Instructions:\n\n1. **User Preferences**:\n   Always prioritize the user's preferences and constraints when generating the plan. Key inputs include:\n   - **Location**: The travel destination.\n   - **Duration**: The number of days for the trip.\n   - **Travel Type**: (e.g., Couple, Family, Solo Traveler, Adventure, etc.).\n   - **Budget**: (e.g., Cheap, Moderate, Luxury).\n   - **Special Constraints**: \n     - Eco-friendly options (e.g., walking routes, green transportation).\n     - Accessibility for disabilities (e.g., wheelchair-friendly routes).\n     - Kid-friendly activities (e.g., amusement parks, playgrounds).\n   - **Specific Requests**:\n     - Avoiding certain activities (e.g., \"Avoid long walking distances\").\n     - Cultural experiences (e.g., local workshops, festivals).\n     - Active vs. Relaxing activities based on user preferences.\n\n2. **Structure of the Travel Plan**:\n   For each day in the trip, create a detailed itinerary divided into **morning**, **afternoon**, and **evening**. Provide the following details for each activity:\n   - **Activity Name**: The name of the location or event.\n   - **Description**: A short description of what the activity includes.\n   - **Geo Coordinates**: Latitude and longitude of the activity location.\n   - **Start Time**: Recommended starting time.\n   - **Duration**: Expected duration of the activity.\n   - **Image URL**: A link to an image representing the activity.\n   - **Ticket Pricing**: Costs associated with the activity, if applicable.\n   - **Rating**: User ratings or popularity score (out of 5).\n\n3. **Additional Details**:\n   Include supporting information to enhance the itinerary and assist with navigation:\n   - **Estimated Travel Time**: Time to travel between activities (walking, car, or public transport).\n   - **Best Time to Visit**: Season-specific recommendations for each location.\n   - **Special Tips**: Suggestions to enhance the experience (e.g., \"Arrive early to avoid crowds\").\n   - **Accessibility Options**: Notes on wheelchair/stroller-friendly paths or activities.\n\n4. **Dynamic Handling**:\n   - If user constraints or preferences are incomplete, suggest follow-up questions to gather more details.\n   - If conflicting preferences exist (e.g., eco-friendly but luxury travel), prioritize user preferences and explain compromises if necessary.\n   - Assume popular trends and budget-friendly options if no constraints are provided.\n\n5. **Return Format**:\n   Return all information in the following JSON structure:\n```json\n{\n  \"itinerary\": [\n    {\n      \"day\": 1,\n      \"morning\": [\n        {\n          \"activity_name\": \"string\",\n          \"description\": \"string\",\n          \"geo_coordinates\": \"string\",\n          \"start_time\": \"string\",\n          \"duration\": \"string\",\n          \"image_url\": \"string\",\n          \"ticket_pricing\": \"string\",\n          \"rating\": \"float\",\n           \"notes\": \"לא לשכוח לבדוק את המונה ליזה\",\n        }\n      ],\n      \"afternoon\": [\n        // same structure as morning\n      ],\n      \"evening\": [\n        // same structure as morning\n      ]\n    }\n  ],\n  \"additional_details\": {\n    \"best_time_to_visit\": \"string\",\n    \"estimated_travel_times\": [\n      {\n        \"from\": \"string\",\n        \"to\": \"string\",\n        \"time\": \"string\"\n      }\n    ],\n    \"accessibility_options\": \"string\",\n    \"eco_friendly_options\": \"string\"\n  }\n}\n",
      });

      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };

      const chatSession = model_3.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {text: "Generate a detailed travel plan for the following trip:\n\n-Location: Kyoto, Japan.\n\n-Duration: 3 Days.\n\n-Travel Type: Family.\n\n-Budget: Moderate.\n\n-Mode (Trip Type): Kid-Friendly.\n\n-Special Constraints:\nInclude stroller-friendly attractions.\n\nPrioritize destinations with short walking distances.\n\nAccommodations close to train stations.\n\nAdditional Requests:\nInclude activities suitable for children, such as parks and museums with interactive exhibits.\n\nRecommend family-friendly dining options with kid-friendly menus.\n\nHighlight cultural experiences, such as tea ceremonies or traditional crafts workshops."},
              {text: " "},
            ],
          },
          {
            role: "model",
            parts: [
              {text: "```json\n{\n  \"itinerary\": [\n    {\n      \"day\": 1,\n      \"morning\": [\n        {\n          \"activity_name\": \"Kyoto Railway Museum\",\n          \"description\": \"Explore Japan's railway history with interactive exhibits perfect for kids.\",\n          \"geo_coordinates\": \"35.0215° N, 135.7564° E\",\n          \"start_time\": \"9:00 AM\",\n          \"duration\": \"3 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kyoto_Railway_Museum_exterior.jpg/1280px-Kyoto_Railway_Museum_exterior.jpg\",\n          \"ticket_pricing\": \"Adult: ¥1200, Child: ¥600\",\n          \"rating\": 4.5,\n          \"notes\": \"Stroller-friendly.  Allow ample time to explore all exhibits.\"\n        }\n      ],\n      \"afternoon\": [\n        {\n          \"activity_name\": \"Nijo Castle\",\n          \"description\": \"Explore the stunning castle grounds.  While some areas may have stairs, the main courtyards are stroller-accessible.\",\n          \"geo_coordinates\": \"35.0298° N, 135.7353° E\",\n          \"start_time\": \"12:30 PM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Nijo-jo_castle.jpg/1280px-Nijo-jo_castle.jpg\",\n          \"ticket_pricing\": \"Adult: ¥600, Child: ¥300\",\n          \"rating\": 4.2,\n          \"notes\": \"Check for stroller accessibility on specific routes within the castle beforehand.\"\n        }\n      ],\n      \"evening\": [\n        {\n          \"activity_name\": \"Dinner at %ARASHI%\",\n          \"description\": \"Family-friendly restaurant with a kid's menu and traditional Japanese dishes. \",\n          \"geo_coordinates\": \"35.0110° N, 135.7685° E\",\n          \"start_time\": \"6:00 PM\",\n          \"duration\": \"1.5 hours\",\n          \"image_url\": \"https://example.com/arashi_restaurant.jpg\",  // Replace with actual image URL\n          \"ticket_pricing\": \"Moderate\",\n          \"rating\": 4.0,\n          \"notes\": \"Reservations recommended.\"\n        }\n      ]\n    },\n    {\n      \"day\": 2,\n      \"morning\": [\n        {\n          \"activity_name\": \"Kyoto Botanical Garden\",\n          \"description\": \"Beautiful gardens with stroller-friendly paths, perfect for a relaxing morning.\",\n          \"geo_coordinates\": \"35.0022° N, 135.7649° E\",\n          \"start_time\": \"9:00 AM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Kyoto_Botanical_Garden.jpg/1280px-Kyoto_Botanical_Garden.jpg\",\n          \"ticket_pricing\": \"Adult: ¥500, Child: ¥250\",\n          \"rating\": 4.6,\n          \"notes\": \"Plenty of space for kids to run around.\"\n        }\n      ],\n      \"afternoon\": [\n        {\n          \"activity_name\": \"Fushimi Inari Shrine\",\n          \"description\": \"Iconic shrine with thousands of red gates.  While some paths are steep, the initial area near the entrance is stroller-friendly.\",\n          \"geo_coordinates\": \"34.9687° N, 135.7682° E\",\n          \"start_time\": \"11:30 AM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Fushimiinari_december_2016_2.jpg/1280px-Fushimiinari_december_2016_2.jpg\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.8,\n          \"notes\": \"Limited stroller accessibility beyond the initial area.  Consider a carrier for more extensive exploration.\"\n        }\n      ],\n      \"evening\": [\n        {\n          \"activity_name\": \"Traditional Tea Ceremony\",\n          \"description\": \"Experience a traditional Japanese tea ceremony, a unique cultural experience suitable for kids.\",\n          \"geo_coordinates\": \"35.0110° N, 135.7685° E\", //  Place holder, needs specific location based on booking\n          \"start_time\": \"6:00 PM\",\n          \"duration\": \"1 hour\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Traditional_Japanese_Tea_Ceremony.jpg/1280px-Traditional_Japanese_Tea_Ceremony.jpg\",\n          \"ticket_pricing\": \"Varies depending on location\",\n          \"rating\": 4.5,\n          \"notes\": \"Book in advance.\"\n        }\n      ]\n    },\n    {\n      \"day\": 3,\n      \"morning\": [\n        {\n          \"activity_name\": \"Kyoto National Museum\",\n          \"description\": \"While not entirely interactive, the museum has sections that will appeal to children, and the grounds are mostly stroller-friendly.\",\n          \"geo_coordinates\": \"35.0244° N, 135.7704° E\",\n          \"start_time\": \"9:00 AM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Kyoto_National_Museum_exterior.jpg/1280px-Kyoto_National_Museum_exterior.jpg\",\n          \"ticket_pricing\": \"Adult: ¥620, Child: Free\",\n          \"rating\": 4.0,\n          \"notes\": \"Focus on sections with visually appealing exhibits.\"\n        }\n      ],\n      \"afternoon\": [\n        {\n          \"activity_name\": \"Maruyama Park\",\n          \"description\": \"Large park with plenty of space for children to play.  Stroller-friendly paths are available.\",\n          \"geo_coordinates\": \"34.9999° N, 135.7796° E\",\n          \"start_time\": \"11:30 AM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Maruyama_Park_in_Kyoto%2C_Japan.jpg/1280px-Maruyama_Park_in_Kyoto%2C_Japan.jpg\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.4,\n          \"notes\": \"Enjoy the beautiful scenery and relaxing atmosphere.\"\n        }\n      ],\n      \"evening\": [\n        {\n          \"activity_name\": \"Dinner at %Gonpachi Nishiki%\",\n          \"description\": \"Family-friendly restaurant with a casual atmosphere and a varied menu.\",\n          \"geo_coordinates\": \"35.0099° N, 135.7603° E\",\n          \"start_time\": \"6:00 PM\",\n          \"duration\": \"1.5 hours\",\n          \"image_url\": \"https://example.com/gonpachi.jpg\", // Replace with actual image URL\n          \"ticket_pricing\": \"Moderate\",\n          \"rating\": 4.2,\n          \"notes\": \"Check for kid-friendly options on their menu.\"\n        }\n      ]\n    }\n  ],\n  \"additional_details\": {\n    \"best_time_to_visit\": \"Spring (cherry blossoms) or Autumn (foliage)\",\n    \"estimated_travel_times\": [\n      {\n        \"from\": \"Kyoto Railway Museum\",\n        \"to\": \"Nijo Castle\",\n        \"time\": \"30 minutes (taxi or train)\"\n      },\n      {\n        \"from\": \"Nijo Castle\",\n        \"to\": \"ARASHI Restaurant\",\n        \"time\": \"20 minutes (taxi)\"\n      },\n      {\n        \"from\": \"Kyoto Botanical Garden\",\n        \"to\": \"Fushimi Inari Shrine\",\n        \"time\": \"45 minutes (train)\"\n      },\n       {\n        \"from\": \"Fushimi Inari Shrine\",\n        \"to\": \"Tea Ceremony Location\",\n        \"time\": \"30 minutes (taxi/train)\"\n      },\n      {\n        \"from\": \"Kyoto National Museum\",\n        \"to\": \"Maruyama Park\",\n        \"time\": \"20 minutes (taxi/bus)\"\n      }\n    ],\n    \"accessibility_options\": \"Most locations are largely stroller-friendly, but check specific accessibility details for each location beforehand.  Some areas may have stairs or uneven terrain.\",\n    \"eco_friendly_options\": \"Utilize public transport (trains and buses) for travel between locations.  Consider walking in areas with stroller-friendly paths.\"\n  }\n}\n```"},
            ],
          },
        ],
      });
      console.log("Creating chatSession for Trip promt");
      //const [isLoading, setIsLoading] = useState(false);
      /// the text is sending in parts and we can fix it here when we can wait to get the all ans from the api

      try {
        setIsLoading(true); // התחל טעינה
        const result = await chatSession.sendMessage(finalPromt_str);
        
        console.log("Message sent successfully:", result.response.text());
  
        console.log(typeof result.response.text());
        // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
        const jsonMatch = result.response.text().match(/{[\s\S]*}/);
        const jsonString = jsonMatch[0]; // מציאת חלק ה-JSON בלבד
        const jsonTripObject = JSON.parse(jsonString); // המרה לאובייקט JSON
        if(jsonTripObject){
          console.log("after parsing testttt\n"+ jsonTripObject);
          setIsLoading(false); // סיים טעינה
          console.log("in  try after finished the mess:\n");
        }


        // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
        //const jsonMatch = result.response.text().match(/{[\s\S]*}/);
        //const jsonString = jsonMatch[0]; // מציאת חלק ה-JSON בלבד
    
        //const jsonTripObject = JSON.parse(jsonString); // המרה לאובייקט JSON
        //console.log("after parsing testttt\n"+ jsonTripObject);

        ///my newwwwwwwww test
        //setallTripData(jsonTripObject);
                //test
        // עדכון ה-Context עם פרטי הטיול testtttt!!!
        //setTripDetails(parsedData);

        //console.log("after parsing in try\n"+ jsonTripObject);
        //i can return the jsonObject according to the response of the model_3 
       
      } catch (error) {
        console.error("Failed to send message:", error);
      }finally {
        //setIsLoading(false); // סיים טעינה
                // פעולה לאחר סיום שליחת ההודעה
 
        console.log("in  finally buildFUNC 3:\n");



      }

      //console.log("before save function called");
      //SaveTrips(parsedData,result?.response?.text());
      //console.log("after save function called");
    };

    
    const add = async (text,isInitial) => {
      console.log("IN ADD FUNC");
      //maybe to remove this setquest
      if (!isInitial) setQuestion(text);

      try {
      console.log("User Input:", text);
      //console.log("Analysis Result:", analysisResultOBJ);
      //my main model
      const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData,text] : [text]);
      let accuumltedtext="";
      for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accuumltedtext+=chunkText;
          //setAnswer(accuumltedtext);
      }
      console.log("Model Response: \n", accuumltedtext);

      const jsonMatch = accuumltedtext.match(/{[\s\S]*}/);
      
      if(jsonMatch){
        const jsonString = jsonMatch[0]; // מציאת חלק ה-JSON בלבד
        console.log("jsonMatch[0]: \n" + jsonString +"\n"+ typeof jsonString);//string
        const jsonObject = JSON.parse(jsonString); // המרה לאובייקט JSON
        console.log("after parsing\n", jsonObject);


        // טיפול במצב ייעוץ או בניית טיול
        if (jsonObject.mode === "Advice") {
          console.log("Advcie mode detected..  \n", jsonObject.mode);
          setAnswer(jsonObject.response);
          //mutation.mutate();
          return jsonObject;
        }
        
        else if (jsonObject.mode === "Trip-Building") {
          if(jsonObject.status === "Incomplete"){
            console.log("Trip-Building mode detected..  \n", jsonObject.mode);
            console.log(jsonObject?.data); 


            ///my newwwwwwwww test

            //setallTripData(jsonObject?.data);

            setTripDetails(jsonObject?.data);
            
            //console.log("set trip", tripDetails);
            //console.log("set trip", allTripData);
            //console.log("setallTripData\n", allTripData);
            
            setAnswer(jsonObject.response); // שאלות להשלמת פרטים

            const promtTRIP= generatePromptFromObject(jsonObject?.data);
            console.log("promtTRIP:", promtTRIP);
            //BuildPlanAI_2(promtTRIP,jsonObject?.data);
            //console.log("TripItenrary:", TripItenrary);
          }
          else {
            console.log("Trip Details Complete. Proceed to build trip plan...");
          }
          return jsonObject;
        }
        else {
          console.error("Failed to parse model response.");
        }


      }
      
      /*

      
      // הכנת ההודעה שתשלח למודל 1
      const chatInput = `
      User Input: ${text}.
      Context:
      Mode: ${analysisResultOBJ?.mode || "Unknown"}.
      Status: ${analysisResultOBJ?.status || "Unknown"}.
      System Response: ${analysisResultOBJ?.response || "No additional information."}
      Data: ${JSON.stringify(analysisResultOBJ?.data || {}, null, 2)} 
     `;

     console.log("My chatInput: " + chatInput);
      ////here i can send my extracted trip data and do present them to the user AND add to DB
      //const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData,chatInput] : [chatInput]);
      //console.log(result.response.text);
      let accuumltedtext="";
      for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accuumltedtext+=chunkText;
          //setAnswer(accuumltedtext);
      }
      
      console.log("Final ans from model 1: " + accuumltedtext);
      console.log("Try parsing my test: \n");
      */

      //mutation.mutate();
      
    } catch (error) {
      console.error(error);   
    } 
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      console.log("IN HANDLE SUBMIT FUNC");
      const text= e.target.text.value;
      if(!text) return;



      const addOBJ = await add(text, false);

      if (!addOBJ) {
        console.error("Failed to analyze input.");
        return;
      }
      console.log("ADD object:", addOBJ);


      //setallTripData(addOBJ);

      //setTripDetails(addOBJ);
      
      //console.log("setallTripData\n", tripDetails);
      //console.log("setallTripData\n", allTripData);
      //add(text, false); // הוסף את הקלט למודל הראשי וענה תשובה
    
  
      // use of model_2 in anlayze_UserPrompt1 function for analyzing the user request
      /*
      const analysisResult = await anlayze_UserPrompt1(text);
      if (!analysisResult) {
        console.error("Failed to analyze input.");
        return;
      }
      console.log("Analysis Result:", analysisResult);
      
      /// need to add object trip with use state hook to keep track of dynamic trip object
      // need to to build manganon for retry and 503 error
      
      // set the response from model_2 in useState hook for model 1 instructions
      //setUserOBJ(analysisResult)
      if (analysisResult.mode === "Advice") {

        console.log("Advice mode detected");

        const addOBJ = await add(text, false,analysisResult);
        if (!addOBJ) {
          console.error("Failed to analyze input.");
          return;
        }
        console.log("ADD object:", addOBJ);
        console.log("data: ", addOBJ?.data);

        console.log("advice: ", addOBJ?.advice);
        console.log("system_response: ", addOBJ?.system_response);

      } else if (analysisResult.mode === "Trip-Building") {

        console.log("Trip-Building mode detected");
        //test -change func name

        // דוגמה לאובייקט שמייצג את פרטי הטיול
        const tripDetails = {
          destination: "Barcelona",
          duration: 5,
          travelType: "Couple",
          budget: "Luxury",
          mode: "Eco-Friendly",
          constraints: "- Use public transportation\n- Stay in green-certified hotels",
          requests: "- Include vegan-friendly restaurants\n- Prefer cultural activities",
        };
        
        const addOBJ = await add(text, false,analysisResult);
        // use of model_3 in generatePromptFromObject function for generating trip plan 
        const UserPromt= generatePromptFromObject(analysisResult);
        if (analysisResult.status === "Incomplete") {
          console.log("Trip details are incomplete, asking for more info...");
          // שלח שאלה נוספת למשתמש
          //add(`Please provide additional details: ${analysisResult.response}`, false);
        } else {
          console.log("Trip details are complete, generating trip...");
          //anlayze_varPROMT(chat, text); // עיבוד נוסף ליצירת הטיול
        }
        
      }
      

      //add22(text, false);
      //add(text, false);
      
      */
      
    };


    const hasRun = useRef(false);
    useEffect(() => {
      if (!hasRun.current) {
        if (data?.history?.length === 1) {
          add(data.history[0].parts[0].text, true);
        }
      }
      hasRun.current = true;
    }, []);

    return(
      <>
          <div className="newpPromt">
            {/*ADD NEW CHAT*/}
            {img.isLoading && <div className=''>Loading...</div>}

            {img.dbData?.filePath && (
                <IKImage
                urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                path={img.dbData?.filePath}
                width="380"
                transformationPosition={[{width:360}]}
                />  
            )}

            {question && <div className="message user">{question}</div>}
            {answer && <div className="message"><Markdown>{answer}</Markdown></div>}
            
          {/*MY TEST BUTTON onClick={anlayze_varPROMT}>
          <>
            <Button
            disabled={loading}
            onClick={anlayze_varPROMT}>
            {loading?
            <AiOutlineLoading3Quarters className="h-7 w-7 animate-spin" /> :'Generate Trip'}
            </Button>
          </>
          */}
            
          <div className="endChat" ref={endRef}></div>


            <form className="newform" onSubmit={handleSubmit} ref={formRef}>
                <Upload setImg={setImg}/>
                <input id="file" type="file" multiple={false} hidden/>
                <input type="text" name="text" placeholder="Ask Anything boy..."/>
                <button>
                    <img src="/arrow.png" alt="" />
                </button>
            </form>
        </div>

      </>
      

    );
};

export default NewPromt;