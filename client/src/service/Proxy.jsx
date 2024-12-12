import express from "express";
import axios from "axios";

const app = express();

app.get("/places", async (req, res) => {
  const { location, radius, type, key } = req.query;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${key}`;
  
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching places:", error);
    res.status(500).send("Error fetching places");
  }
});

app.listen(3001, () => console.log("Proxy server running on http://localhost:3001"));
