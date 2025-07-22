import api from '@/utils/api';

/**
 * Service for itinerary operations
 */
const itineraryService = {
  /**
   * Save a new itinerary
   * @param {Object} itineraryData - The itinerary data
   * @returns {Promise} Response from API
   */
  async saveItinerary(itineraryData) {
    try {
      const response = await api.post('/api/itineraries', itineraryData);
      return response.data;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      throw error;
    }
  },

  /**
   * Get all user's itineraries
   * @returns {Promise} Response from API with list of itineraries
   */
  async getUserItineraries() {
    try {
      const response = await api.get('/api/itineraries');
      return response.data.itineraries;
    } catch (error) {
      console.error('Error fetching user itineraries:', error);
      throw error;
    }
  },

  /**
   * Get a specific itinerary by ID
   * @param {string} id - Itinerary ID
   * @returns {Promise} Response from API with itinerary details
   */
  async getItineraryById(id) {
    try {
      const response = await api.get(`/api/itineraries/${id}`);
      return response.data.itinerary;
    } catch (error) {
      console.error(`Error fetching itinerary with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing itinerary
   * @param {string} id - Itinerary ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} Response from API
   */
  async updateItinerary(id, updateData) {
    try {
      const response = await api.put(`/api/itineraries/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating itinerary with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an itinerary
   * @param {string} id - Itinerary ID
   * @returns {Promise} Response from API
   */
  async deleteItinerary(id) {
    try {
      const response = await api.delete(`/api/itineraries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting itinerary with ID ${id}:`, error);
      throw error;
    }
  }
};

export default itineraryService; 