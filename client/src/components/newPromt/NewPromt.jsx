import { useContext, useState } from 'react';
import './newPromt.css'
import { useRef, useEffect} from 'react';
import  Upload from '../upload/Upload';
import { IKImage } from 'imagekitio-react';
//import model from '../../lib/gemini';
import Markdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Button } from '../ui/button';
//import { Button } from "@/components/ui/button";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { doc, setDoc } from "firebase/firestore";
import { db } from '@/service/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import InfoSection from '@/routes/view-trip/compo/InfoSelection2';
import { TripContext } from '../tripcontext/TripProvider';
import { sendTunedRequest } from '../tunemodel/TuneModel';

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

    const [loading,setloading] = useState(false);
    const navigate = useNavigate();

    //this is the main model (model_1)
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are a knowledgeable and friendly travel agent called 'Meller-AI' and named it at the begininng,im specializing in planning customized trips.
        Your task is to assist the user with any travel-related questions, whether it's about a destination, 
        activity, local culture, or recommendations for hotels, attractions, and dining options.
 
        Please analyze the user's input and return a JSON object with the following structure:
        {
          "mode": "Advice" or "Trip-Building",
          "status": "Complete" or "Incomplete",
          "response": "Your detailed response here",
          "data": {
            "vacation_location": "string",
            "duration": "integer",
            "constraints": {
              "travel_type": "string",
              "preferred_activity": "string",
              "budget": "string"
            }
          }
        }
        `,
    });

    const chat = model.startChat({
      history: [
          ...(data?.history?.map(({ role, parts }) => ({
              role,
              parts: [{ text: parts[0].text }],
          })) || []) // התוצאה המתקבלת תהיה מערך ריק במקרה ש-data או data.history אינם קיימים
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
    


    ///not in use!!!
    //////////////////////test func 1
    //analyze the user promt and extract the relevant data variables and then send in generic structure for ai genrate trip  
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
        You are a smart travel agent called 'Meller-AI'. Analyze the user's input and classify it into a structured format to prepare for detailed trip planning.

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
      /*
       systemInstruction: `
          You are smart travel agent called 'Meller-AI' . so Please analyze the user's input and return a JSON object with the following structure:
          {
            "mode": "Advice" or "Trip-Building",
            "status": "Complete" or "Incomplete",
            "response": "Your detailed response here",
            "data": {
              "vacation_location": "string",
              "duration": "integer",
              "constraints": {
                "travel_type": "string",
                "preferred_activity": "string",
                "budget": "string"
              }
            }
          } ` */

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

        setAnswer(FINAL_TEXT_ANS);

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

          
          //console.log("Cleaned Response Text: \n", cleanedResponseText);
          //console.log(typeof parsedResponseText);
          // Use parsed data as a structured JSON object

            //const parsedData = JSON.parse(cleanedResponseText);
    
            // Use parsed data as a structured JSON object
            //console.log("Parsed JSON Data: \n", parsedData);
            //console.log(typeof parsedData);
    
    
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
    const { setTripDetails , setallTripData} = useContext(TripContext);


    
    /////////////test func 2!!
    const generatePromptFromObject = async(tripDetails) => {
      
      ////i need to add use affect maybe when action ON SERVER change
      //need to sync the tripDATA that return from the analayzed model
      console.log("In generatePromptFromObject function: \n");
      // מגדירים ברירות מחדל עבור השדות במקרה שהם חסרים באובייקט
      const {
        destination = "Unknown Destination",
        duration = 1,
        travelType = "General",
        budget = "Moderate",
        mode = "Regular",
        constraints = "",
        requests = ""
      } = tripDetails;
      try {
        return `
        Generate a detailed travel plan for the following trip:

        - **Location**: ${destination}.
        - **Duration**: ${duration} Days.
        - **Travel Type**: ${travelType}.
        - **Budget**: ${budget}.
        - **Mode (Trip Type)**: ${mode}.

        ### Special Constraints:
        ${constraints ? constraints : "No specific constraints provided."}

        ### Additional Requests:
        ${requests ? requests : "No additional requests provided."}
          `;

        //const GenericPrompt = "Generate Travel Plan for Location: {location}, for {duration} days, for {travel_type} with a {budget} budget. Give me the Hotels options list with Hotel Name, Hotel address, Price, hotel image Url, Geo Coordinates, Rating, description and suggest itinerary with place Name, place Details, place Image Url , Geo Coordinates ,ticket Pricing, Rating, Time travel each of the location for {duration} days with each day plan with best time to visit in JSON format.";
        //here i can create a self object with defult null (phone)

        /*
        const vacation_location = parsedData?.data?.vacation_location || "destination not specified";
        const duration = parsedData?.duration || "duration not specified";
        const travel_type = parsedData.constraints?.travel_type || "not specified";
        const preferred_activity = parsedData.constraints?.preferred_activity || "not specified";
        const budget = parsedData.constraints?.budget || "not specified";
        //if vacation_location =="destination not specified: enter locationwhile"
        if(parsedData?.vacation_location=="destination not specified"){
          console.log("Please enter location while generating the Travel Plan.");
          return "Please enter location while generating the Travel Plan boyy";
        }

        if(parsedData?.duration=="duration not specified"){
          console.log("Please enter duration while generating the Travel Plan.");
          return "Please enter duration while generating the Travel Plan boyy";
        }

        //console.log("Destenation: " + vacation_location);
        //console.log("Duration: " + duration);
        //console.log("Travel Type: " + travel_type);
        //console.log("Preferred Activity: " + preferred_activity);
        //console.log("Budget: " + budget);
        */
        //const finalPromt=GenericPrompt.replace(`{location}`,parsedData?.data?.vacation_location).replace(`{duration}`,parsedData?.data?.duration).replace(`{travel_type}`,parsedData?.data?.constraints?.travel_type).replace(`{budget}`,parsedData?.data?.constraints?.budget).replace(`{duration}`,parsedData?.data?.duration);

        


        //console.log(finalPromt);
        ///////////

        //BuildPlanAI(finalPromt,parsedData);
        //return finalPromt
        //const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
        //const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        //setAnswer(finalPromt);
        //maybe to add mutaion to here 

        
        
      } catch (error) {
        console.log(error);
      }


    };
    const [isLoading, setIsLoading] = useState(false);
    /////Original build plan ai  func 3!!!
    const BuildPlanAI_1= async(finalPromt_str,parsedData)=>{
      console.log("IN textTOgeneric FUNCTION");
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });
      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {text: "Generate Travel Plan for Location: Las Vegas, for 3 Days for Couple with a Cheap budget,first give me the Hotels options list with Hotel Name, Hotel address, Price, hotel image Url, Geo Coordinates, Rating, description and suggest itinerary with place Name, place Details, place Image Url , Geo Coordinates ,ticket Pricing, Rating, Time travel each of the location for 3 days with each day plan with best time to visit in JSON format."},
            ],
          },
          {
            role: "model",
            parts: [
              {text: "```json\n{\n  \"hotels\": [\n    {\n      \"name\": \"The D Las Vegas\",\n      \"address\": \"301 Fremont Street, Las Vegas, NV 89101\",\n      \"price\": \"$50 - $100 per night\",\n      \"image_url\": \"https://images.trvl-media.com/media/content/hotels/2000000/1968000/1967600/1967649/1967649_1200x900.jpg\",\n      \"geo_coordinates\": \"36.1699,-115.1422\",\n      \"rating\": 4.0,\n      \"description\": \"A historic hotel on Fremont Street with a retro vibe, offering affordable rooms, a casino, and live entertainment.\"\n    },\n    {\n      \"name\": \"Golden Gate Hotel & Casino\",\n      \"address\": \"1 Fremont Street, Las Vegas, NV 89101\",\n      \"price\": \"$60 - $120 per night\",\n      \"image_url\": \"https://images.trvl-media.com/media/content/hotels/2000000/1968000/1967600/1967651/1967651_1200x900.jpg\",\n      \"geo_coordinates\": \"36.1696,-115.1428\",\n      \"rating\": 4.0,\n      \"description\": \"A historic hotel with a classic casino and a convenient location in downtown Las Vegas.\"\n    },\n    {\n      \"name\": \"Circus Circus Hotel & Casino\",\n      \"address\": \"2880 Las Vegas Blvd S, Las Vegas, NV 89109\",\n      \"price\": \"$40 - $80 per night\",\n      \"image_url\": \"https://images.trvl-media.com/media/content/hotels/2000000/1970000/1969300/1969394/1969394_1200x900.jpg\",\n      \"geo_coordinates\": \"36.1143,-115.1711\",\n      \"rating\": 3.5,\n      \"description\": \"A family-friendly hotel known for its circus acts, amusement park, and affordable rates.\"\n    },\n    {\n      \"name\": \"The Strat Hotel, Casino & SkyPod\",\n      \"address\": \"2000 S Las Vegas Blvd, Las Vegas, NV 89104\",\n      \"price\": \"$60 - $120 per night\",\n      \"image_url\": \"https://images.trvl-media.com/media/content/hotels/2000000/1969000/1968600/1968664/1968664_1200x900.jpg\",\n      \"geo_coordinates\": \"36.1104,-115.1646\",\n      \"rating\": 4.0,\n      \"description\": \"A high-rise hotel with a casino, an observation deck, and a variety of dining options.\"\n    }\n  ],\n  \"itinerary\": [\n    {\n      \"day\": 1,\n      \"title\": \"Downtown Delights & Fremont Street\",\n      \"plan\": [\n        {\n          \"time\": \"10:00 AM\",\n          \"place\": \"Fremont Street Experience\",\n          \"details\": \"Walk under the iconic canopy, check out the street performers, and enjoy the free light shows.\",\n          \"image_url\": \"https://www.vegasexperience.com/sites/default/files/styles/slideshow_large/public/slideshows/freemont-street-experience-9.jpg?itok=tD1G0F4u\",\n          \"geo_coordinates\": \"36.1699,-115.1422\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"2 hours\"\n        },\n        {\n          \"time\": \"12:00 PM\",\n          \"place\": \"Heart Attack Grill\",\n          \"details\": \"Enjoy a fun and unique dining experience at this quirky burger joint, known for its 'calorie-laden' meals.\",\n          \"image_url\": \"https://www.heartattackgrill.com/images/heart-attack-grill-downtown-las-vegas-las-vegas-nv.jpg\",\n          \"geo_coordinates\": \"36.1683,-115.1429\",\n          \"ticket_pricing\": \"Varies\",\n          \"rating\": 3.5,\n          \"time_to_spend\": \"1.5 hours\"\n        },\n        {\n          \"time\": \"2:00 PM\",\n          \"place\": \"Neon Museum\",\n          \"details\": \"Explore the history of Las Vegas through its iconic neon signs.\",\n          \"image_url\": \"https://cdn.vox-cdn.com/thumbor/V0l8K69Nq_2iH_kO90ZqC2T53s=/0x0:2000x1333/1200x800/filters:focal(840x502:1160x822)/cdn.vox-cdn.com/uploads/chorus_image/image/67096548/neon_museum_neon_signs.0.jpg\",\n          \"geo_coordinates\": \"36.1748,-115.1453\",\n          \"ticket_pricing\": \"$25 - $35\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"2 hours\"\n        },\n        {\n          \"time\": \"6:00 PM\",\n          \"place\": \"El Cortez Hotel & Casino\",\n          \"details\": \"Enjoy happy hour drinks and snacks in the classic casino atmosphere.\",\n          \"image_url\": \"https://www.elcortezhotelcasino.com/images/hotel/hotel-gallery/el-cortez-hotel-casino-las-vegas-exterior.jpg\",\n          \"geo_coordinates\": \"36.1678,-115.1433\",\n          \"ticket_pricing\": \"Varies\",\n          \"rating\": 4.0,\n          \"time_to_spend\": \"2 hours\"\n        }\n      ]\n    },\n    {\n      \"day\": 2,\n      \"title\": \"Strip Exploration & Free Entertainment\",\n      \"plan\": [\n        {\n          \"time\": \"10:00 AM\",\n          \"place\": \"Bellagio Conservatory & Botanical Garden\",\n          \"details\": \"Admire the beautiful floral displays and take stunning photos.\",\n          \"image_url\": \"https://www.bellagio.com/content/dam/mgmresorts/bellagio/images/hotel/things-to-do/conservatory/conservatory-home.jpg\",\n          \"geo_coordinates\": \"36.1049,-115.1736\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"1 hour\"\n        },\n        {\n          \"time\": \"11:00 AM\",\n          \"place\": \"The LINQ Promenade\",\n          \"details\": \"Stroll along the outdoor shopping and dining area with a unique atmosphere.\",\n          \"image_url\": \"https://www.caesars.com/content/dam/caesars/linq/images/linq-promenade-home.jpg\",\n          \"geo_coordinates\": \"36.1082,-115.1706\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.0,\n          \"time_to_spend\": \"2 hours\"\n        },\n        {\n          \"time\": \"1:00 PM\",\n          \"place\": \"Fountains of Bellagio\",\n          \"details\": \"Enjoy the spectacular water and music show at the Bellagio.\",\n          \"image_url\": \"https://www.bellagio.com/content/dam/mgmresorts/bellagio/images/hotel/things-to-do/fountains/fountains-home.jpg\",\n          \"geo_coordinates\": \"36.1049,-115.1736\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"1 hour\"\n        },\n        {\n          \"time\": \"2:00 PM\",\n          \"place\": \"The Venetian and The Palazzo\",\n          \"details\": \"Walk through the Grand Canal Shoppes and admire the replica of Venice.\",\n          \"image_url\": \"https://www.venetian.com/content/dam/mgmresorts/venetian/images/hotel/venetian-home.jpg\",\n          \"geo_coordinates\": \"36.1005,-115.1742\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"2 hours\"\n        },\n        {\n          \"time\": \"6:00 PM\",\n          \"place\": \"Caesars Palace\",\n          \"details\": \"Watch the free \"The Colosseum\" show featuring a variety of entertainers.\",\n          \"image_url\": \"https://www.caesars.com/content/dam/caesars/caesars-palace/images/caesars-palace-home.jpg\",\n          \"geo_coordinates\": \"36.1079,-115.1725\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.0,\n          \"time_to_spend\": \"1 hour\"\n        }\n      ]\n    },\n    {\n      \"day\": 3,\n      \"title\": \"Red Rock Canyon & Local Delights\",\n      \"plan\": [\n        {\n          \"time\": \"9:00 AM\",\n          \"place\": \"Red Rock Canyon National Conservation Area\",\n          \"details\": \"Drive through the scenic canyon, hike to the iconic Calico Tanks, and admire the rock formations.\",\n          \"image_url\": \"https://www.nps.gov/redr/learn/nature/images/red-rock-canyon-2-724.jpg\",\n          \"geo_coordinates\": \"36.1844,-115.2678\",\n          \"ticket_pricing\": \"$15 per vehicle\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"3 hours\"\n        },\n        {\n          \"time\": \"12:00 PM\",\n          \"place\": \"In-N-Out Burger\",\n          \"details\": \"Enjoy a classic American burger and fries for lunch.\",\n          \"image_url\": \"https://www.in-n-out.com/assets/images/header-images/in-n-out-burger.jpg\",\n          \"geo_coordinates\": \"36.1225,-115.1759\",\n          \"ticket_pricing\": \"Varies\",\n          \"rating\": 4.0,\n          \"time_to_spend\": \"1 hour\"\n        },\n        {\n          \"time\": \"2:00 PM\",\n          \"place\": \"Downtown Container Park\",\n          \"details\": \"Explore unique shops and restaurants housed in repurposed shipping containers.\",\n          \"image_url\": \"https://www.downtowncontainerpark.com/wp-content/uploads/2019/09/hero-banner.jpg\",\n          \"geo_coordinates\": \"36.1680,-115.1467\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.0,\n          \"time_to_spend\": \"2 hours\"\n        },\n        {\n          \"time\": \"6:00 PM\",\n          \"place\": \"The Peppermill Restaurant\",\n          \"details\": \"Enjoy a delicious dinner and cocktails in the iconic retro dining spot.\",\n          \"image_url\": \"https://www.thepeppermill.com/wp-content/uploads/2021/12/Peppermill-Exterior-Night.jpg\",\n          \"geo_coordinates\": \"36.1304,-115.1686\",\n          \"ticket_pricing\": \"Varies\",\n          \"rating\": 4.5,\n          \"time_to_spend\": \"2 hours\"\n        }\n      ]\n    }\n  ]\n}\n```\n\n**Explanation:**\n\nThis JSON file provides a 3-day budget-friendly travel plan for a couple visiting Las Vegas. It includes a list of hotel options with details like price, images, ratings, and descriptions. The itinerary is divided into daily plans with specific times, places to visit, descriptions, image URLs, ticket pricing, ratings, and estimated time to spend at each location.\n\n**Key Features:**\n\n* **Hotel Options:** Presents affordable hotel choices with diverse styles and features.\n* **Itinerary:** Organizes a 3-day schedule for exploring various attractions in Las Vegas.\n* **Place Details:** Provides information about each attraction, including its location, image, pricing, and rating.\n* **Time Management:** Suggests a realistic time allocation for each activity.\n* **Cheap Budget Focus:** Emphasizes free or budget-friendly options for activities and dining.\n\n**Note:** Prices and opening hours may vary. It's recommended to check for the most up-to-date information before your trip. \n"},
            ],
          },
        ],
      });
      console.log("Creating chatSession for final promt");
      //const [isLoading, setIsLoading] = useState(false);
      /// the text is sending in parts and we can fix it here when we can wait to get the all ans from the api
      
      try {
        setIsLoading(true); // התחל טעינה
        const result = await chatSession.sendMessage(finalPromt_str);
        
        // פעולה לאחר סיום שליחת ההודעה
        console.log("Message sent successfully:", result.response.text());
        //console.log(result.response.text());
        //console.log(typeof result.response.text());

        setIsLoading(false); // סיים טעינה
        console.log("in  try after finished the mess:\n");

        // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
        const jsonMatch = result.response.text().match(/{[\s\S]*}/);
        const jsonString = jsonMatch[0]; // מציאת חלק ה-JSON בלבד
    
        const jsonTripObject = JSON.parse(jsonString); // המרה לאובייקט JSON
        console.log("after parsing testttt\n"+ jsonTripObject);

        ///my newwwwwwwww test
        //setallTripData(jsonTripObject);
                //test
        // עדכון ה-Context עם פרטי הטיול testtttt!!!
        //setTripDetails(parsedData);

        console.log("after parsing in try\n"+ jsonTripObject);
        //console.log("Vacation location:);
      } catch (error) {
        console.error("Failed to send message:", error);
      }finally {
        //setIsLoading(false); // סיים טעינה
        
        //console.log("in (finally) try after finished the mess");



        //cleanedText = result.response.text().replace(/```json|```/g, "").trim();
        //if (!cleanedText.startsWith("{") || !cleanedText.endsWith("}")) {
          //console.error("Invalid JSON format: Missing curly braces.");
          
        //}
        //console.log("in finally after cleanedText replacement");
        //console.log(cleanedText);

        //console.log("before parsing data\n");
       // const jsonObject = JSON.parse(cleanedText);
       // console.log("after parsing data");
        //console.log(jsonObject);
        //console.log(typeof jsonObject);
      }

      //console.log("before save function called");
      //SaveTrips(parsedData,result?.response?.text());
      console.log("after save function called");
    };
    /////my test build plan ai  func 3!!!
    const BuildPlanAI_2= async(finalPromt_str,parsedData)=>{
      console.log("BuildPlanAI_2 FUNCTION");


      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
      const model_3 = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are a highly skilled travel planner specializing in creating personalized travel itineraries. Your goal is to generate a structured travel plan based on user input, including dynamic constraints and preferences.\n\n### Instructions:\n1. Always prioritize the user's preferences and constraints when generating the plan. These may include:\n   - **Location**: The travel destination.\n   - **Duration**: The number of days for the trip.\n   - **Travel Type**: (e.g., Couple, Family, Solo Traveler, Adventure, etc.).\n   - **Budget**: (e.g., Cheap, Moderate, Luxury).\n   - **Special Constraints**: \n     - Eco-friendly options (e.g., walking routes, green hotels).\n     - Accessibility for disabilities (e.g., wheelchair-friendly routes).\n     - Kid-friendly activities (e.g., amusement parks, playgrounds).\n   - **Specific User Requests**:\n     - Dining preferences (e.g., vegetarian/vegan options).\n     - Avoiding certain activities (e.g., \"Avoid long walking distances\").\n     - Hotel preferences (e.g., \"Close to city center\").\n\n2. **Structure the Travel Plan**:\n   - **Hotels**:\n     - Provide a list of 5-8 recommended hotels with the following details:\n       - Hotel_Name\n       - Hotel_Address\n       - Price_range\n       - Hotel_Image URL\n       - Geo_Coordinates\n       - Hotel_Rating (out of 5)\n       - Short description (e.g., unique features or benefits)\n   - **Daily Itinerary**:\n     - Divide each day into **morning**, **afternoon**, and **evening** activities.\n     - For each activity, include:\n       - Name of the activity or attraction\n       - Detailed description\n       - Recommended start time and duration\n       - Image URL\n       - Geo Coordinates\n       - Ticket pricing (if applicable)\n       - Rating (out of 5)\n     - Include dining recommendations for lunch and dinner with:\n       - Restaurant Name\n       - Address\n       - Cuisine Type\n       - Price Range (e.g., Cheap, Moderate, Expensive)\n   - **Additional Details**:\n     - Best time to visit each location (if season-specific).\n     - Estimated travel time between activities (by car, public transport, or walking).\n     - Special tips for the user (e.g., \"Arrive early to avoid crowds\").\n\n3. **Dynamic Handling**:\n   - If user constraints or preferences are incomplete, provide a follow-up question to clarify missing details.\n   - If no constraints are provided, assume standard recommendations based on popular trends and budget.\n   - If conflicts exist between constraints (e.g., eco-friendly but luxury travel), prioritize the user’s stated **preferences**.\n\n4. **Return Format**:\nReturn all information in the following **JSON structure**:\n```json\n{\n  \"hotels\": [\n    {\n      \"Hotel_Name\": \"string\",\n      \"Hotel_address\": \"string\",\n      \"price_range\": \"string\",\n      \"image_url\": \"string\",\n      \"geo_coordinates\": \"string\",\n      \"Hotel_rating\": \"float\",\n      \"Hotel_description\": \"string\"\n    }\n  ],\n  \"itinerary\": [\n    {\n      \"day\": 1,\n      \"morning\": [\n        {\n          \"activity_name\": \"string\",\n          \"description\": \"string\",\n          \"start_time\": \"string\",\n          \"duration\": \"string\",\n          \"image_url\": \"string\",\n          \"geo_coordinates\": \"string\",\n          \"ticket_pricing\": \"string\",\n          \"rating\": \"float\"\n        }\n      ],\n      \"afternoon\": [\n        // same structure as morning\n      ],\n      \"evening\": [\n        // same structure as morning\n      ]\n    }\n  ],\n  \"additional_details\": {\n    \"best_time_to_visit\": \"string\",\n    \"estimated_travel_times\": \"string\",\n    \"accessibility_options\": \"string\",\n    \"eco_friendly_options\": \"string\"\n  }\n}\n",
      });

      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {text: "Generate a detailed travel plan for the following trip:\n\n-Location: Kyoto, Japan.\n\n-Duration: 7 Days.\n\n-Travel Type: Family.\n\n-Budget: Moderate.\n\n-Mode (Trip Type): Kid-Friendly.\n\n-Special Constraints:\nInclude stroller-friendly attractions.\n\nPrioritize destinations with short walking distances.\n\nAccommodations close to train stations.\n\nAdditional Requests:\nInclude activities suitable for children, such as parks and museums with interactive exhibits.\n\nRecommend family-friendly dining options with kid-friendly menus.\n\nHighlight cultural experiences, such as tea ceremonies or traditional crafts workshops."},
            ],
          },
          {
            role: "model",
            parts: [
              {text: "```json\n{\n  \"hotels\": [\n    {\n      \"Hotel_Name\": \"Kyoto Granbell Hotel\",\n      \"Hotel_address\": \"Shiokoji-sagaru, Kawaramachi-dori, Nakagyo-ku, Kyoto, 604-8191, Japan\",\n      \"price_range\": \"Moderate\",\n      \"image_url\": \"https://www.kyotogranbell.com/images/top/top_img.jpg\",\n      \"geo_coordinates\": \"35.0117° N, 135.7690° E\",\n      \"Hotel_rating\": 4.2,\n      \"Hotel_description\": \"Family-friendly hotel near Kyoto Station with excellent transport links.\"\n    },\n    {\n      \"Hotel_Name\": \"Hotel Gracery Kyoto Sanjo\",\n      \"Hotel_address\": \"525 Sanjo-dori, Nakagyo-ku, Kyoto 604-0922, Japan\",\n      \"price_range\": \"Moderate\",\n      \"image_url\": \"https://expedia.mediacdn.com/media/a6d96514/63a82784/f6819957/7a018583/e4669e04/5b16b2a9/130832793.jpg?impolicy=fcrop&w=1200&h=630&q=80\",\n      \"geo_coordinates\": \"35.0207° N, 135.7665° E\",\n      \"Hotel_rating\": 4.0,\n      \"Hotel_description\": \"Modern hotel near Sanjo Station, offering comfortable rooms and family-friendly amenities.\"\n    },\n    {\n      \"Hotel_Name\": \"Richmond Hotel Premier Kyoto Shijo-Karasuma\",\n      \"Hotel_address\": \"494-1, Shimogyo-ku, Karasuma-dori, Gojo-sagaru, Kyoto, 600-8216, Japan\",\n      \"price_range\": \"Moderate\",\n      \"image_url\": \"https://www.richmondhotels.jp/premier-kyoto-shijo-karasuma/img/top/top_kv_pc_sp.jpg\",\n      \"geo_coordinates\": \"34.9889° N, 135.7551° E\",\n      \"Hotel_rating\": 4.3,\n      \"Hotel_description\": \"Convenient location near Karasuma Station, featuring spacious rooms and family plans.\"\n    }\n    // Add 3 more hotels with similar details.\n  ],\n  \"itinerary\": [\n    {\n      \"day\": 1,\n      \"morning\": [\n        {\n          \"activity_name\": \"Arrival in Kyoto & Check-in\",\n          \"description\": \"Settle into your hotel and leave your luggage.\",\n          \"start_time\": \"10:00 AM\",\n          \"duration\": \"1 hour\",\n          \"image_url\": null,\n          \"geo_coordinates\": null,\n          \"ticket_pricing\": null,\n          \"rating\": null\n        }\n      ],\n      \"afternoon\": [\n        {\n          \"activity_name\": \"Kyoto Railway Museum\",\n          \"description\": \"Interactive exhibits and real train cars, perfect for kids!\",\n          \"start_time\": \"1:00 PM\",\n          \"duration\": \"3 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Kyoto_Railway_Museum.jpg/1280px-Kyoto_Railway_Museum.jpg\",\n          \"geo_coordinates\": \"35.0339° N, 135.7676° E\",\n          \"ticket_pricing\": \"Adult: ¥1200, Child: ¥600\",\n          \"rating\": 4.5\n        }\n      ],\n      \"evening\": [\n        {\n          \"activity_name\": \"Dinner at Musashi Sushi\",\n          \"description\": \"Family-friendly sushi restaurant with a kid's menu.\",\n          \"start_time\": \"6:00 PM\",\n          \"duration\": \"1.5 hours\",\n          \"image_url\": null,\n          \"geo_coordinates\": null,\n          \"ticket_pricing\": \"Moderate\",\n          \"rating\": 4.0\n        }\n      ]\n    },\n    {\n      \"day\": 2,\n      \"morning\": [\n        {\n          \"activity_name\": \"Maruyama Park\",\n          \"description\": \"Stroller-friendly park with a pond and beautiful scenery.\",\n          \"start_time\": \"9:00 AM\",\n          \"duration\": \"2 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Maruyama-park-kyoto-cherry-blossom.jpg/1280px-Maruyama-park-kyoto-cherry-blossom.jpg\",\n          \"geo_coordinates\": \"34.9983° N, 135.7828° E\",\n          \"ticket_pricing\": \"Free\",\n          \"rating\": 4.5\n        }\n      ],\n      \"afternoon\": [\n        {\n          \"activity_name\": \"Kyoto National Museum\",\n          \"description\": \"Explore Japanese art and history; some interactive exhibits for kids.\",\n          \"start_time\": \"1:00 PM\",\n          \"duration\": \"3 hours\",\n          \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kyoto_National_Museum_%281%29.jpg/1280px-Kyoto_National_Museum_%281%29.jpg\",\n          \"geo_coordinates\": \"35.0180° N, 135.7604° E\",\n          \"ticket_pricing\": \"Adult: ¥620, Child: ¥310\",\n          \"rating\": 4.2\n        }\n      ],\n      \"evening\": [\n        // Add dinner and other activities.\n      ]\n    }\n    // Add days 3-7 with similar structure.  Include Arashiyama Bamboo Grove (stroller friendly paths available),  Fushimi Inari Shrine (many steps, might not be fully stroller-friendly, but parts are accessible),  and a traditional tea ceremony.\n  ],\n  \"additional_details\": {\n    \"best_time_to_visit\": \"Spring (cherry blossoms) or Autumn (fall foliage)\",\n    \"estimated_travel_times\": \"Mostly short distances, easily accessible by public transport.\",\n    \"accessibility_options\": \"Many attractions are stroller-friendly, but check individual websites for details.\",\n    \"eco_friendly_options\": \"Utilize public transport; consider walking or cycling for shorter distances.\"\n  }\n}\n```\n"},
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
        
        // פעולה לאחר סיום שליחת ההודעה
        console.log("Message sent successfully:", result.response.text());
        console.log(result.response.text());
        console.log(typeof result.response.text());

        setIsLoading(false); // סיים טעינה
        console.log("in  try after finished the mess:\n");

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
        //return jsonObject
      } catch (error) {
        console.error("Failed to send message:", error);
      }finally {
        //setIsLoading(false); // סיים טעינה
        
        //console.log("in (finally) try after finished the mess");


      }

      //console.log("before save function called");
      //SaveTrips(parsedData,result?.response?.text());
      //console.log("after save function called");
    };




    /////test func 4!!
    const SaveTrips = async (parsedData,tripData)=>{
      console.log("try to save trip data packs:");
      
      console.log(parsedData);
      console.log(tripData);
     
      console.log(data._id);

      const docID=Date.now().toString();
      console.log(docID);
      try {
        await setDoc(doc(db, "AiTrips", docID), {
          userSelection: parsedData,
          tripData: JSON.parse(tripData),
          userID: data._id,
          id:docID,
        });
        setloading(false);
        navigate('/createTrip/view-trip/'+ docID);
        
        
      } catch (error) {
        console.log(error);
      }


    };





    const add = async (text,isInitial) => {
      console.log("IN ADD FUNC");
      //maybe to remove this setquest
      if (!isInitial) setQuestion(text);

    try {
      console.log(text);
      ////here i can send my extracted trip data and do present them to the user AND add to DB
      const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData,text] : [text]);
      //console.log(result.response.text);
      let accuumltedtext="";
      for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accuumltedtext+=chunkText;
          setAnswer(accuumltedtext);
      }
      
      console.log(accuumltedtext);
      console.log("Try parsing my test: \n");
          

     // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
      const jsonMatch = accuumltedtext.match(/{[\s\S]*}/);

      console.log("after match on text: \n" + jsonMatch +"\n"+ typeof jsonMatch);//object
      console.log("Vacation location: "+ jsonMatch?.mode);



      //mutation.mutate();
        
    } catch (error) {
      console.error(error);   
    } 
    };

    const sendMessageWithRetry = async (chat, text, retries = 3, delay = 2000) => {
      for (let attempt = 0; attempt < retries; attempt++) {
          try {
              const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData, text] : [text]);
              return result; // Success: return the result
          } catch (error) {
              console.error(`Error on attempt ${attempt + 1}:`, error.message);
  
              // Check if the error is a 503 and retryable
              if (attempt < retries - 1 && error.message.includes("503")) {
                  console.warn(`Retrying in ${delay}ms...`);
                  await new Promise((resolve) => setTimeout(resolve, delay)); // Delay before retrying
              } else {
                  throw error; // If not retryable or last attempt, rethrow the error
              }
          }
      }
  };

    const add22 = async (text,isInitial) => {
      console.log("IN ADD22 FUNC");
      //maybe to remove this setquest
      if (!isInitial) setQuestion(text);

    try {
      console.log(text);

      // שימוש במנגנון ה-Retry
      const result22 = await sendMessageWithRetry(chat, text);
      ////here i can send my extracted trip data and do present them to the user AND add to DB
      //const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData,text] : [text]);
      //console.log(result.response.text);
      let accuumltedtext="";
      for await (const chunk of result22.stream) {
          const chunkText = chunk.text();
          accuumltedtext+=chunkText;
          setAnswer(accuumltedtext);
      }
      console.log(accuumltedtext);
      //console.log("Try parsing my test: \n");
          

     // חפש את התוכן שבין הסוגריים המסולסלים הראשונים והאחרונים
      //const jsonMatch = accuumltedtext.match(/{[\s\S]*}/);

      //console.log("after match on text: \n" + jsonMatch +"\n"+ typeof jsonMatch);//object
      //console.log("Vacation location: "+ jsonMatch?.mode);



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

      //anlayze_varPROMT(text);
      // use of model_2 in anlayze_UserPrompt1 function for analyzing the user request
      const analysisResult = await anlayze_UserPrompt1(text);
      if (!analysisResult) {
        console.error("Failed to analyze input.");
        return;
      }
      
      
      console.log("Analysis Result:", analysisResult);
      /// need to add object trip with use state hook to keep track of dynamic trip object
      // need to to build manganon for retry and 503 error

      
      if (analysisResult.mode === "Advice") {
        console.log("Advice mode detected");
        //add(text, false); // הוסף את הקלט למודל הראשי וענה תשובה
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
      
      // try tune model + tunemodel.jsx file
      try {
        //const result = await sendTunedRequest(text);


      } catch (error) {
        console.log(error.message);
      }
      //anlayze_varPROMT(chat,text);

      //add22(text, false);
      //add(text, false);
      
      
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