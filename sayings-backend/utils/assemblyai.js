// // utils/assemblyAI.js

// const axios = require('axios');
// const dotenv = require('dotenv');

// dotenv.config();

// const ASSEMBLYAI_API_KEY = "0a764bc61ee543449f5bf9b9bd2837d6";
// utils/assemblyai.js

const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const ASSEMBLYAI_API_KEY = "0a764bc61ee543449f5bf9b9bd2837d6";

/**
 * Uploads audio to AssemblyAI.
 * @param {Buffer} buffer - The audio file buffer.
 * @param {string} mimeType - The MIME type of the audio file.
 * @returns {Promise<string>} - The upload URL from AssemblyAI.
 */
const uploadAudio = async (buffer, mimeType) => {
  const maxRetries = 3;
  const delayBetweenRetries = 3000; // 3 seconds
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post('https://api.assemblyai.com/v2/upload', buffer, {
        headers: {
          authorization: ASSEMBLYAI_API_KEY, // Use environment variable for security
          'Content-Type': mimeType,
          // 'Transfer-Encoding': 'chunked', // Remove if not necessary
        },
        timeout: 10000, // 10 seconds timeout
      });
      return response.data.upload_url;
    } catch (error) {
      attempt++;
      // Log detailed error information
      if (error.response) {
        console.error(`Upload attempt ${attempt} failed:`, error.response.status, error.response.data);
      } else {
        console.error(`Upload attempt ${attempt} failed:`, error.message);
      }

      if (attempt >= maxRetries) {
        throw new Error('Failed to upload audio after 3 attempts.');
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRetries));
    }
  }
};

/**
 * Requests transcription from AssemblyAI.
 * @param {string} audioUrl - The URL of the uploaded audio.
 * @returns {Promise<Object>} - The transcription response.
 */
const requestTranscription = async (audioUrl) => {
  const response = await axios.post(
    'https://api.assemblyai.com/v2/transcript',
    {
      audio_url: audioUrl,
      iab_categories: true,
      dual_channel: true,
      filter_profanity: true,
      sentiment_analysis: true,
      entity_detection: true,
      summarization: true,
      auto_highlights: true,
      content_safety: true,
      custom_topics: true,
      language_detection: true,
      language_model: 'assemblyai_default',
    },
    {
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

/**
 * Retrieves the transcription result from AssemblyAI.
 * @param {string} transcriptId - The transcription ID.
 * @returns {Promise<Object>} - The transcription result.
 */
const getTranscriptionResult = async (transcriptId) => {
  const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
    },
  });
  return response.data;
};

module.exports = {
  uploadAudio,
  requestTranscription,
  getTranscriptionResult,
};
