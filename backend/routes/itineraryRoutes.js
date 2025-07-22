import express from 'express';
import Itinerary from '../models/itinerary.js';
import * as itineraryParser from '../utils/itineraryParser.js';

const router = express.Router();

// Middleware to check if user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.user && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

/**
 * Save a new itinerary
 * POST /api/itineraries
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { rawContent, chatId, title, destination, duration, dates, budget } = req.body;
    
    if (!rawContent) {
      return res.status(400).json({ success: false, message: 'Raw content is required' });
    }
    
    // Use userId from auth middleware or development placeholder
    const userId = req.user?.id || process.env.DEV_USER_ID || 'dev-user';
    
    // Parse the raw content into structured data
    const structuredData = itineraryParser.parseRawContent(rawContent);
    
    // Create a new itinerary with combined data from request and parsed content
    const newItinerary = new Itinerary({
      userId,
      rawContent,
      chatId,
      title: title || `יומן מסע - ${structuredData.destination}`,
      destination: destination || structuredData.destination,
      duration: duration || structuredData.duration,
      dates,
      budget: budget ? {
        amount: budget.amount,
        currency: budget.currency || 'USD',
        level: budget.level
      } : undefined,
      summary: structuredData.summary,
      days: structuredData.days,
      additionalInfo: structuredData.additionalInfo,
      highlights: structuredData.highlights,
      // Generate nicely processed content
      processedContent: itineraryParser.processRawContent(rawContent),
      type: 'itinerary'
    });
    
    // Save the itinerary to the database
    await newItinerary.save();
    
    res.status(201).json({
      success: true,
      message: 'Itinerary saved successfully',
      itineraryId: newItinerary._id,
      itinerary: {
        id: newItinerary._id,
        title: newItinerary.title,
        destination: newItinerary.destination,
        duration: newItinerary.duration
      }
    });
  } catch (error) {
    console.error('Error saving itinerary:', error);
    res.status(500).json({ success: false, message: 'Error saving itinerary', error: error.message });
  }
});

/**
 * Get all user's itineraries
 * GET /api/itineraries
 */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || process.env.DEV_USER_ID || 'dev-user';
    
    // Retrieve only essential data for listing
    const itineraries = await Itinerary.find({ userId })
      .select('title destination duration dates createdAt updatedAt type image highlights activityCounts')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      itineraries: itineraries.map(itinerary => ({
        id: itinerary._id,
        title: itinerary.title,
        destination: itinerary.destination,
        duration: itinerary.duration,
        dates: itinerary.dates,
        createdAt: itinerary.createdAt,
        updatedAt: itinerary.updatedAt,
        type: itinerary.type,
        image: itinerary.image,
        highlights: itinerary.highlights,
        activityCounts: itinerary.activityCounts
      }))
    });
  } catch (error) {
    console.error('Error retrieving itineraries:', error);
    res.status(500).json({ success: false, message: 'Error retrieving itineraries', error: error.message });
  }
});

/**
 * Get a specific itinerary by ID
 * GET /api/itineraries/:id
 */
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || process.env.DEV_USER_ID || 'dev-user';
    
    const itinerary = await Itinerary.findOne({ _id: id, userId });
    
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    
    res.json({
      success: true,
      itinerary: {
        id: itinerary._id,
        title: itinerary.title,
        destination: itinerary.destination,
        duration: itinerary.duration,
        dates: itinerary.dates,
        budget: itinerary.budget,
        summary: itinerary.summary,
        days: itinerary.days,
        additionalInfo: itinerary.additionalInfo,
        highlights: itinerary.highlights,
        chatId: itinerary.chatId,
        rawContent: itinerary.rawContent,
        processedContent: itinerary.processedContent,
        createdAt: itinerary.createdAt,
        updatedAt: itinerary.updatedAt,
        type: itinerary.type,
        activityCounts: itinerary.activityCounts
      }
    });
  } catch (error) {
    console.error('Error retrieving itinerary:', error);
    res.status(500).json({ success: false, message: 'Error retrieving itinerary', error: error.message });
  }
});

/**
 * Update an existing itinerary
 * PUT /api/itineraries/:id
 */
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || process.env.DEV_USER_ID || 'dev-user';
    const updateData = req.body;
    
    // Find the itinerary first
    const itinerary = await Itinerary.findOne({ _id: id, userId });
    
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    
    // If rawContent is being updated, reprocess it
    if (updateData.rawContent) {
      const structuredData = itineraryParser.parseRawContent(updateData.rawContent);
      
      // Update with parsed data if not explicitly provided
      if (!updateData.destination) updateData.destination = structuredData.destination;
      if (!updateData.duration) updateData.duration = structuredData.duration;
      if (!updateData.summary) updateData.summary = structuredData.summary;
      if (!updateData.days) updateData.days = structuredData.days;
      if (!updateData.additionalInfo) updateData.additionalInfo = structuredData.additionalInfo;
      if (!updateData.highlights) updateData.highlights = structuredData.highlights;
      
      // Always regenerate processed content
      updateData.processedContent = itineraryParser.processRawContent(updateData.rawContent);
    }
    
    // Update the itinerary
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Itinerary updated successfully',
      itinerary: {
        id: updatedItinerary._id,
        title: updatedItinerary.title,
        destination: updatedItinerary.destination,
        duration: updatedItinerary.duration,
        updatedAt: updatedItinerary.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(500).json({ success: false, message: 'Error updating itinerary', error: error.message });
  }
});

/**
 * Delete an itinerary
 * DELETE /api/itineraries/:id
 */
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || process.env.DEV_USER_ID || 'dev-user';
    
    const result = await Itinerary.deleteOne({ _id: id, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    
    res.json({
      success: true,
      message: 'Itinerary deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    res.status(500).json({ success: false, message: 'Error deleting itinerary', error: error.message });
  }
});

export default router; 