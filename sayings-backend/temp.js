// controllers/transcriptionController.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

exports.transcribeAudio = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log("FILE: ", file);

    // Upload the file to AssemblyAI
    const assemblyUploadResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        authorization: "0a764bc61ee543449f5bf9b9bd2837d6", // Use environment variable for security
        'content-type': 'application/octet-stream',
      },
      data: file.buffer,
    });

    const audioUrl = assemblyUploadResponse.data.upload_url;
    console.log("Audio URL: ", audioUrl);

    // Request transcription with additional analysis options
    const transcriptResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: {
        authorization: "0a764bc61ee543449f5bf9b9bd2837d6", // Use environment variable for security
        'content-type': 'application/json',
      },
      data: {
        audio_url: "https://cdn.assemblyai.com/upload/ba8cc4a1-0b39-466c-a766-b213f60f07b5", // Use the uploaded audio URL
        iab_categories:true,
        dual_channel: true,
        filter_profanity: true,
        sentiment_analysis: true,
        entity_detection: true,
        summarization: true,
        auto_highlights: true,
        custom_topics: true, // Ensure this is the correct parameter for topic detection
        language_detection: true,
        language_model: "assemblyai_default",
        // topic_detection: true, // Enable topic detection
        // Add any other desired parameters here
      },
    });

    const transcriptId = transcriptResponse.data.id;
    console.log("Transcript ID: ", transcriptId);

    // Poll for transcription completion
    let transcriptionCompleted = false;
    let transcriptionData = {};

    while (!transcriptionCompleted) {
      const pollingResponse = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: {
          authorization: "0a764bc61ee543449f5bf9b9bd2837d6", // Use environment variable for security
        },
      });

      const status = pollingResponse.data.status;
      console.log(`Transcription Status: ${status}`);

      if (status === 'completed') {
        transcriptionCompleted = true;
        console.log("POLLING RESPONSE: ", pollingResponse)
        transcriptionData = pollingResponse.data;

        // Debugging logs
        console.log("IAB Categories: ", transcriptionData.iab_categories);
        console.log("IAB Categories Results: ", transcriptionData.iab_categories.labels);
      } else if (status === 'error') {
        console.error("Transcription failed.");
        return res.status(500).json({ error: 'Transcription failed.' });
      } else {
        // Wait for 3 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Extract desired fields from the transcription data
    const responseData = {
      transcript: transcriptionData.text || '',
      sentiment_analysis_results: transcriptionData.sentiment_analysis_results || [],
      entity_detection_results: transcriptionData.entity_detection_results || [],
      summarization: transcriptionData.summary || '',
      auto_highlights_result: transcriptionData.auto_highlights_result || [],
      emotion_detection_results: transcriptionData.emotion_detection_results || [],
      language_detection_results: transcriptionData.language_detection_results || {},
      language_confidence: transcriptionData.language_confidence || 0,
      iab_categories: transcriptionData.iab_categories_result["results"] || [], // Extract labels for iab_categories
      topic_detection_results: transcriptionData.topic_detection || [], // Extract topic detection results
      // Add other fields if necessary
    };

    // Optionally, save the audio and transcription to a database here.

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error processing transcription:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
