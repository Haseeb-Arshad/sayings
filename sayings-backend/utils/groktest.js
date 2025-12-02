// utils/groktest.js

const axios = require('axios');
require('dotenv').config();

const xaiApiKey = process.env.XAI_API_KEY; // Get from environment variables
const xaiApiUrl = 'https://api.x.ai/v1/chat/completions';

/**
 * Function to get response from Grok AI model.
 * @param {Array} messages - Array of message objects for the chat.
 * @returns {Object} - Response data from the AI model.
 */
const getGrokResponse = async (messages) => {
  try {
    const response = await axios.post(
      xaiApiUrl,
      {
        model: 'grok-beta',
        messages: messages,
        stream: false,
        temperature: 0.7, // Adjust temperature for desired creativity
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${xaiApiKey}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error communicating with xAI API:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { getGrokResponse };
