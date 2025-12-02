// utils/humeai.js

const axios = require('axios');
const FormData = require('form-data');

// Ensure environment variables are loaded
require('dotenv').config();

const HUME_API_KEY = process.env.HUME_API_KEY || "elPx1hSG1cTDronfvuW3GmYn64pdpXWoUuw6jAZnkmGS5KLG"; // For testing purposes

if (!HUME_API_KEY) {
  throw new Error('HUME_API_KEY is not defined in environment variables.');
}

/**
 * Analyzes emotions using Hume AI.
 * @param {Buffer} audioBuffer - The audio file buffer.
 * @param {string} mimeType - The MIME type of the audio file.
 * @returns {Promise<Object>} - An object containing emotionsData and topEmotions.
 */
const analyzeEmotions = async (audioBuffer, mimeType) => {
  try {
    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: 'audiofile',
      contentType: mimeType,
    });
    form.append('json', JSON.stringify({ models: { prosody: {} } }));

    const response = await axios.post('https://api.hume.ai/v0/batch/jobs', form, {
      headers: {
        ...form.getHeaders(),
        'X-Hume-Api-Key': HUME_API_KEY,
      },
    });

    const jobId = response.data.job_id;
    console.log('Hume AI Job started with ID:', jobId);

    // Poll for job completion with a timeout
    const timeout = 300000; // 5 minutes
    const interval = 5000; // 5 seconds
    const maxAttempts = timeout / interval;
    let attempts = 0;
    let jobStatus = 'IN_PROGRESS';
    let emotionsData = [];

    while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      const jobResponse = await axios.get(`https://api.hume.ai/v0/batch/jobs/${jobId}`, {
        headers: {
          'X-Hume-Api-Key': HUME_API_KEY,
        },
      });
      jobStatus = jobResponse.data.state.status;
      console.log('Hume AI Job status:', jobStatus);
      attempts++;
    }

    if (jobStatus === 'COMPLETED') {
      const predictionsResponse = await axios.get(`https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`, {
        headers: {
          'X-Hume-Api-Key': HUME_API_KEY,
        },
      });

      const predictions = predictionsResponse.data;

      // console.log("Predictions: ", predictions);

      if (predictions && Array.isArray(predictions)) {
        predictions.forEach((predictionItem) => {
          const models = predictionItem.results.predictions[0]?.models;
          if (models && models.prosody && models.prosody.grouped_predictions) {
            models.prosody.grouped_predictions.forEach((group) => {
              group.predictions.forEach((prediction) => {
                if (prediction.emotions && Array.isArray(prediction.emotions)) {
                  emotionsData.push({
                    text: prediction.text,
                    begin: prediction.time.begin,
                    end: prediction.time.end,
                    confidence: prediction.confidence,
                    emotions: prediction.emotions,
                  });
                }
              });
            });
          }
        });

        // console.log("EMOTIONSSS : ", emotionsData);
      } else {
        console.error('Unexpected Hume AI predictions response structure:', predictionsResponse.data);
      }
    } else if (jobStatus === 'FAILED') {
      console.error('Hume AI Job failed to complete.');
      // Optionally handle the failure, e.g., return an empty emotions array
    } else {
      console.error('Hume AI Job did not complete within the expected time frame.');
      // Optionally handle the timeout, e.g., return an empty emotions array
    }

    // Aggregate emotions
    const topEmotions = aggregateEmotions(emotionsData);
    return { emotionsData, topEmotions }; // Return both emotionsData and topEmotions
  } catch (error) {
    console.error('Error analyzing emotions with Hume AI:', error.response?.data || error.message);
    return { emotionsData: [], topEmotions: [] }; // Return empty arrays if there's an error
  }
};

/**
 * Aggregates emotions from multiple text segments.
 * @param {Array} emotionsData - Array of emotion data from each text segment.
 * @returns {Array} - Array of aggregated emotions sorted by score descending.
 */
const aggregateEmotions = (emotionsData) => {
  const emotionMap = {};

  emotionsData.forEach((segment) => {
    const { confidence, emotions } = segment;
    const segmentConfidence = (typeof confidence === 'number' && !isNaN(confidence)) ? confidence : 1;

    emotions.forEach((emotion) => {
      const { name, score } = emotion;
      const emotionScore = (typeof score === 'number' && !isNaN(score)) ? score : 0;

      if (emotionMap[name]) {
        // Weighted sum: emotion score multiplied by segment confidence
        emotionMap[name].totalScore += emotionScore * segmentConfidence;
        emotionMap[name].count += 1;
      } else {
        emotionMap[name] = {
          name,
          totalScore: emotionScore * segmentConfidence,
          count: 1,
        };
      }
    });
  });

  // Calculate average scores
  const aggregatedEmotions = Object.values(emotionMap).map((emotion) => ({
    name: emotion.name,
    score: emotion.totalScore / emotion.count,
  }));

  // Sort by score descending and limit to top 15
  aggregatedEmotions.sort((a, b) => b.score - a.score);
  return aggregatedEmotions.slice(0, 15);
};

module.exports = { analyzeEmotions };
