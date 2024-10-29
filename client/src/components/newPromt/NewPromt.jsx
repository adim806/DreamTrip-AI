import { useState } from 'react';
import './newPromt.css'
import { useRef, useEffect} from 'react';
import  Upload from '../upload/Upload';
import { IKImage } from 'imagekitio-react';
import model from '../../lib/gemini';
import Markdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const chat = model.startChat({
      history: [
          ...(data?.history?.map(({ role, parts }) => ({
              role,
              parts: [{ text: parts[0].text }],
          })) || []) // התוצאה המתקבלת תהיה מערך ריק במקרה ש-data או data.history אינם קיימים
      ],
      generationConfig: {},
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
    

    //analyze the user promt and extract the relevant data variables and then send in generic structure for ai genrate trip  
    const anlayze_varPROMT = async () => {

      //the ideal is to start chat with history and in the systeminsruction att we can present that he will act like a smart trip planner

      console.log("IN ANALAYZR varPROMT FUNC");
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash",systemInstruction: `Please analyze the following text and extract the following information from it: 1. The vacation location. 2. Duration of vacation (in days). 3. Additional constraints, if any (preferred vacation type, budget, or specific places).you will return a fixed general structure in JSON format.Take this one just for a example:
         {"vacation_location": "Thailand" || "destination not specified",
          "duration": 4 || "duration not specified",
          "constraints": {
          "travel_type": "Solo" || "not specified",
          "preferred_activity": "Extreme" || "not specified",
          "budget": "none" || "Avarage budget" }
          } `,
        });

      //exm for user promt
      const USERprompt = "help me a vacation for 4 days to thailand for solo trip and i want a good extereme";//i can prevent a case if there is not all the details(if he doesn't enter location and more)

      const result = await model.generateContentStream(USERprompt);
      let test="";
      // Print text as it comes in.
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        test+=chunkText;
      }
      console.log("The prompt: \n"+ USERprompt);

      // ניקוי התגובה מכל סימון "```json" או "`"
      const cleanedResponseText = test.replace(/```json|```/g, "").trim();
      console.log("Cleaned Response Text: \n", cleanedResponseText);
      try {
        
        // Try parsing the text response to JSON
        const parsedData = JSON.parse(cleanedResponseText);

        // Use parsed data as a structured JSON object
        console.log("Parsed JSON Data: \n", parsedData);
        console.log(typeof parsedData);


        console.log("result:\n" +typeof result);
        //textTOgeneric(cleanedResponseText);
        EditText_toGenericPrompt(parsedData);

      } catch (error) {
        console.error("Invalid JSON format:", error);
        return null;
      }

    };
    
    const EditText_toGenericPrompt = async(parsedData) => {

      ////i need to add use affect maybe when action 

      console.log("In EditText_toGenericPrompt function: \n");


      try {
        const GenericPrompt = "Generate Travel Plan for Location: {location}, for {duration} days, for {travel_type} with a {budget} budget. Give me the Hotels options list with Hotel Name, Hotel address, Price, hotel image Url, Geo Coordinates, Rating, description and suggest itinerary with place Name, place Details, place Image Url , Geo Coordinates ,ticket Pricing, Rating, Time travel each of the location for {duration} days with each day plan with best time to visit in JSON format.";

        const vacation_location = parsedData?.vacation_location || "destination not specified";
        const duration = parsedData?.duration || "duration not specified";
        const travel_type = parsedData.constraints?.travel_type || "not specified";
        const preferred_activity = parsedData.constraints?.preferred_activity || "not specified";
        const budget = parsedData.constraints?.budget || "not specified";

        //if vacation_location =="destination not specified: enter locationwhile"

        console.log("Destenation: " + vacation_location);
        console.log("Duration: " + duration);
        console.log("Travel Type: " + travel_type);
        console.log("Preferred Activity: " + preferred_activity);
        console.log("Budget: " + budget);

        const finalPromt=GenericPrompt.replace(`{location}`,parsedData?.vacation_location).replace(`{duration}`,parsedData?.duration).replace(`{travel_type}`,parsedData.constraints?.travel_type).replace(`{budget}`,parsedData.constraints?.budget).replace(`{duration}`,parsedData?.duration);

        console.log(finalPromt);
        textTOgeneric(finalPromt);
        //const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY);
        //const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
        // לחשוב על רעיון איך לקבל את המחרוזת או הגייסון ולשאוב משם מידע עבור הפרומט הגנרי
        //const result = await model.generateContent(`Based of this generic prompt: ${GenericPrompt}. Replace and fit the variables X from the generic promt from this var: ${test}`);
        //console.log(result.response.text());
        
      } catch (error) {
        console.log(error);
      }


    };

    const textTOgeneric= async(jsonTEST)=>{
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
      const result = await chatSession.sendMessage(jsonTEST);

      //console.log(jsonTEST);
      //console.log(typeof jsonTEST);
      //const extractedData = JSON.parse(jsonTEST);
      //console.log("Extracted Data:", extractedData);
      console.log(result);
      console.log(typeof result);

      console.log(result.response.text());
      console.log(typeof result.response.text());


    };





    const add = async (text,isInitial) => {
      console.log("IN ADD FUNC");
      if (!isInitial) setQuestion(text);

    try {
      console.log(text);
      const result = await chat.sendMessageStream(Object.entries(img.aiData).length ? [img.aiData,text] : [text]);
      //console.log(result.response.text);
      let accuumltedtext="";
      for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accuumltedtext+=chunkText;
          setAnswer(accuumltedtext);
      }
      console.log(accuumltedtext);
      mutation.mutate();
        
    } catch (error) {
      console.error(error);   
    } 
    };


    const handleSubmit = async (e) => {
      e.preventDefault();
      console.log("IN HANDLE SUBMIT FUNC");
      const text= e.target.text.value;
      if(!text) return;
      add(text, false);
      
    };


  // IN PRODUCTION WE DON'T NEED IT
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

            <button onClick={anlayze_varPROMT}>Start test</button>

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
    );
};

export default NewPromt;