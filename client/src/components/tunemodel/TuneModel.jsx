import axios from "axios";

const API_KEY = import.meta.env.REACT_APP_GEMINI_API_KEY;
const TUNED_MODEL_ID = import.meta.env.REACT_APP_TUNED_MODEL_ID;

const geminiAPI = axios.create({
  baseURL: "https://generativelanguage.googleapis.com/v1beta",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
});

export const sendTunedRequest = async (userInput) => {
  try {
    const response = await geminiAPI.post(`/models/${TUNED_MODEL_ID}:generate`, {
      prompt: userInput,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      max_output_tokens: 512,
    });

    console.log("Response from tuned model:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error with Gemini tuned model:", error.response || error.message);
    throw error;
  }
};
