// controllers/transcriptionController.js

const { uploadAudio, requestTranscription, getTranscriptionResult } = require('../utils/assemblyai');
const Post = require('../models/Posts'); // Corrected path to singular
const Topic = require('../models/Topic');
const User = require('../models/User'); // Importing User model
const { uploadToPinata } = require('../utils/pinata');
const { analyzeEmotions } = require('../utils/humeai'); // Ensure this path is correct
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const {
  computeGeneralSentiment,
  mapSentimentToTraits,
  mapEmotionsToTraits,
  mapTopicsToTraits,
  updatePersonalityProfile,
  updateUserGeneralEmotions,
  generateProfileReview,
} = require('../utils/personality');

/**
 * Helper function to extract the last part of the category
 * Example: "Entertainment > Music" => "Music"
 * @param {string} category - The category string
 * @returns {string} - The extracted topic name
 */
const extractTopicName = (category) => {
  if (typeof category !== 'string') return '';
  const parts = category.split('>');
  return parts[parts.length - 1].trim();
};

/**
 * Validates the uploaded audio file.
 * @param {Buffer} buffer - The audio file buffer.
 * @param {string} mimeType - The MIME type of the audio file.
 */
const validateAudio = (buffer, mimeType) => {
  const supportedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/mp4',
    'audio/m4a',
    'audio/webm',
    'audio/x-m4a',
  ];

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  if (!buffer) {
    throw new Error('Audio buffer is empty.');
  }
  if (!mimeType) {
    throw new Error('MIME type is missing.');
  }
  if (!supportedMimeTypes.includes(mimeType)) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of 100MB. File size: ${buffer.length}`);
  }
};

/**
 * Polls AssemblyAI for transcription completion.
 * @param {string} transcriptId - The transcription ID.
 * @returns {Promise<Object>} - The completed transcription data.
 */
const pollTranscription = async (transcriptId) => {
  let transcriptionCompleted = false;
  let transcriptionData = {};

  while (!transcriptionCompleted) {
    const pollingResponse = await getTranscriptionResult(transcriptId);
    const status = pollingResponse.status;
    console.log(`Transcription Status: ${status}`);

    if (status === 'completed') {
      transcriptionCompleted = true;
      transcriptionData = pollingResponse;
      // console.log('Transcription Data:', transcriptionData);
    } else if (status === 'error') {
      console.error('Transcription failed:', pollingResponse.error || 'Unknown error.');
      throw new Error('Transcription failed. Please try again later.');
    } else {
      // Wait for 3 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  return transcriptionData;
};

/**
 * Controller to handle audio transcription.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */

// controllers/transcriptionController.js

exports.transcribeAudio = async (req, res) => {
  try {
    console.log('Request User:', req.user);
    console.log('File received:', req.file);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log('File buffer length:', file.buffer.length);
    if (file.buffer.length === 0) {
      console.error('Received empty file buffer.');
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    }

    // Validate audio file
    validateAudio(file.buffer, file.mimetype);

    // Start parallel tasks with error handling
    const uploadTask = (async () => {
      try {
        return await uploadAudio(file.buffer, file.mimetype);
      } catch (error) {
        console.error('Error uploading audio to AssemblyAI:', error);
        throw error;
      }
    })();

    const emotionAnalysisTask = (async () => {
      try {
        return await analyzeEmotions(file.buffer, file.mimetype);
      } catch (error) {
        console.error('Error analyzing emotions with Hume AI:', error);
        throw error;
      }
    })();

    const pinataUploadTask = (async () => {
      try {
        return await uploadToPinata(file.buffer, file.originalname);
      } catch (error) {
        console.error('Error uploading to Pinata:', error);
        throw error;
      }
    })();

    // Await AssemblyAI upload to get the audio URL
    const audioUrl = await uploadTask;
    console.log('Audio URL:', audioUrl);

    // Request transcription
    const transcriptResponse = await requestTranscription(audioUrl);
    const transcriptId = transcriptResponse.id;
    console.log('Transcript ID:', transcriptId);

    // Start polling for transcription completion
    const transcriptionTask = pollTranscription(transcriptId);

    // Await all parallel tasks
    const [transcriptionData, emotionResult, ipfsHash] = await Promise.all([
      transcriptionTask,
      emotionAnalysisTask,
      pinataUploadTask,
    ]);

    const { emotionsData, topEmotions } = emotionResult;

    // Log emotionResult to verify structure
    // console.log('Emotion Result:', emotionResult);

    // Process transcription data
    const responseData = {
      transcript: transcriptionData.text || '',
      sentiment_analysis_results: transcriptionData.sentiment_analysis_results || [],
      summary: transcriptionData.summary || '',
      entities: transcriptionData.entities || [],
      iab_categories_result: transcriptionData.iab_categories_result || {},
      auto_highlights_result: transcriptionData.auto_highlights_result || {},
      utterances: transcriptionData.utterances || [],
      words: transcriptionData.words || [],
      language_code: transcriptionData.language_code || 'und',
      language_confidence: transcriptionData.language_confidence || 0,

      topics: transcriptionData.topics || [],
      audioURL: transcriptionData.audio_url || audioUrl,
      emotions: topEmotions || [], // Assign aggregated emotions
      overallEmotions: topEmotions || [], // Assign aggregated emotions (if needed)
    };

    /**
     * Validate and assign emotions and overallEmotions
     */
    const validateEmotionsArray = (emotionsArray, arrayName) => {
      if (!Array.isArray(emotionsArray)) {
        console.warn(`${arrayName} is not an array. Setting it to an empty array.`);
        return [];
      }
      const validEmotions = emotionsArray
        .filter(
          (emotion) =>
            emotion &&
            typeof emotion.name === 'string' &&
            emotion.name.trim() !== '' &&
            typeof emotion.score === 'number'
        )
        .map((emotion) => ({
          name: emotion.name.trim(),
          score: emotion.score,
        }));

      if (validEmotions.length === 0) {
        console.warn(`${arrayName} has no valid emotions.`);
      } else {
        // console.log(`Validated ${arrayName}:`, validEmotions);
      }

      return validEmotions;
    };

    // Validate 'emotions' and 'overallEmotions'
    const validatedOverallEmotions = validateEmotionsArray(responseData.emotions, 'topEmotions');

    // Assign validated emotions to responseData.emotions
    responseData.emotions = validatedOverallEmotions;

    // Assign validated overall emotions to responseData.overallEmotions (if needed)
    responseData.overallEmotions = validatedOverallEmotions;

    /**
     * Assign detailedEmotions only if valid
     */
    responseData.detailedEmotions = (emotionsData || [])
      .filter(
        (segment) =>
          Array.isArray(segment.emotions) &&
          segment.emotions.every(
            (emotion) =>
              emotion &&
              typeof emotion.name === 'string' &&
              emotion.name.trim() !== '' &&
              typeof emotion.score === 'number'
          )
      )
      .map((segment) => ({
        ...segment,
        emotions: segment.emotions.map((emotion) => ({
          name: emotion.name.trim(),
          score: emotion.score,
        })),
      }));

    // console.log('Detailed Emotions:', responseData.detailedEmotions);

    /**
     * Process IAB Categories Summary to extract topics
     */
    const iabSummary = Array.isArray(responseData.iab_categories_result.summary)
      ? responseData.iab_categories_result.summary.map((cat, index) => {
          if (
            cat &&
            typeof cat.category === 'string' &&
            cat.category.trim() !== '' &&
            typeof cat.confidence === 'number'
          ) {
            return {
              category: cat.category.trim(),
              confidence: cat.confidence,
            };
          } else {
            console.warn(`Invalid IAB category at index ${index}:`, cat);
            return {
              category: 'Unknown',
              confidence: 0,
            };
          }
        })
      : [];

    console.log('IAB Summary:', iabSummary);

    const extractedTopics = iabSummary.map(({ category, confidence }) => ({
      topic: extractTopicName(category),
      confidence,
    }));

    console.log('Extracted Topics:', extractedTopics);

    /**
     * Update the Topic collection and prepare topics for Post document
     */
    const topicsForPost = [];

    for (const { topic, confidence } of extractedTopics) {
      if (!topic) continue; // Skip if topic name is undefined or empty

      // Check if the topic already exists
      let existingTopic = await Topic.findOne({ name: topic });

      if (existingTopic) {
        // Update the popularity score
        existingTopic.popularity += confidence;
        await existingTopic.save();
      } else {
        // Create a new Topic document
        const newTopic = new Topic({
          name: topic,
          popularity: confidence,
        });
        await newTopic.save();
      }

      // Prepare topics for Post document
      topicsForPost.push({
        topic,
        confidence,
      });
    }

    /**
     * Filter topics based on a confidence threshold (e.g., confidence >= 0.2)
     */
    const filteredTopics = topicsForPost.filter((topic) => topic.confidence >= 0.2);

    console.log('Filtered Topics:', filteredTopics);

    // Update responseData with the extracted topics
    responseData.topics = filteredTopics;

    /**
     * Process IAB Categories Results (if needed)
     */
    const iabResults = Array.isArray(responseData.iab_categories_result.results)
      ? responseData.iab_categories_result.results.map((result, index) => {
          if (
            result &&
            typeof result.category === 'string' &&
            result.category.trim() !== '' &&
            typeof result.confidence === 'number'
          ) {
            return {
              category: result.category.trim(),
              confidence: result.confidence,
            };
          } else {
            console.warn(`Invalid IAB result at index ${index}:`, result);
            return {
              category: 'Unknown',
              confidence: 0,
            };
          }
        })
      : [];

    responseData.iab_categories_result.results = iabResults;

    console.log('IAB Results:', iabResults);

    /**
     * Compute General Sentiment
     */
    const generalSentiment = computeGeneralSentiment(responseData.sentiment_analysis_results);
    responseData.generalSentiment = generalSentiment;

    /**
     * Map General Sentiment to Trait Adjustments
     */
    const sentimentTraitAdjustments = mapSentimentToTraits(generalSentiment);

    /**
     * Map Emotions to Traits
     */
    const emotionTraitScores = mapEmotionsToTraits(responseData.emotions);
    // console.log('\nTrait Scores from Emotions:', emotionTraitScores);

    /**
     * Map Topics to Traits
     */
    const topicTraitScores = mapTopicsToTraits(responseData.topics);
    // console.log('\nTrait Scores from Topics:', topicTraitScores);

    /**
     * Combine Trait Scores from Emotions and Topics
     */
    const combinedTraitScores = {
      Openness: emotionTraitScores.Openness + topicTraitScores.Openness,
      Conscientiousness: emotionTraitScores.Conscientiousness + topicTraitScores.Conscientiousness,
      Extraversion: emotionTraitScores.Extraversion + topicTraitScores.Extraversion,
      Agreeableness: emotionTraitScores.Agreeableness + topicTraitScores.Agreeableness,
      Neuroticism: emotionTraitScores.Neuroticism + topicTraitScores.Neuroticism,
    };

    // console.log('\nCombined Trait Scores from Emotions and Topics:', combinedTraitScores);

    /**
     * Apply Sentiment Trait Adjustments
     */
    for (let trait in sentimentTraitAdjustments) {
      if (sentimentTraitAdjustments.hasOwnProperty(trait)) {
        combinedTraitScores[trait] += sentimentTraitAdjustments[trait];
      }
    }

    // console.log('\nTrait Scores after Applying Sentiment Adjustments:', combinedTraitScores);

    /**
     * Assign combinedTraitScores to the post's personalityScores
     */
    const personalityScoresForPost = { ...combinedTraitScores };

    /**
     * Update User's General Emotions and Generate Profile Review
     */
    let user = null;
    let profileReview = '';
    if (req.user) {
      user = await User.findById(req.user.id);
      if (user) {
        await updateUserGeneralEmotions(user, combinedTraitScores);
        console.log('\nUser General Emotions Updated Successfully.');

        // Generate Profile Review
        profileReview = await generateProfileReview(user);
        user.profileReview = profileReview;
        user.profileReviewLogs.push({
          review: profileReview,
          timestamp: new Date(),
        });
        await user.save();
        console.log('\nUser Profile Review Generated and Saved Successfully.');
      }
    }

    /**
     * Save the Post to the Database with Personality Scores and General Sentiment
     */
    const newPost = new Post({
      user: req.user?.id || null,
      audioURL: responseData.audioURL,
      ipfsHash: ipfsHash,
      audioPinataURL: ipfsHash,

      transcript: responseData.transcript,
      topics: responseData.topics,

      sentiment_analysis_results: responseData.sentiment_analysis_results,
      summary: responseData.summary,
      entities: responseData.entities,
      iab_categories_result: {
        summary: iabSummary, // Use the processed IAB summary
        results: iabResults,
      },
      auto_highlights_result: responseData.auto_highlights_result,
      utterances: responseData.utterances,
      words: responseData.words,
      language_code: responseData.language_code,
      language_confidence: responseData.language_confidence,

      // Emotions
      emotions: responseData.emotions, // Aggregated emotions
      overallEmotions: responseData.overallEmotions, // Aggregated emotions (if needed)
      detailedEmotions: responseData.detailedEmotions, // Per-segment emotions

      // General Sentiment
      generalSentiment: responseData.generalSentiment,

      // Personality Scores from this post
      personalityScores: personalityScoresForPost,
    });

    // Additional Logging before saving Post
    // console.log('Post data to be saved:', newPost);

    await newPost.save();
    console.log('New Post saved successfully.');

    /**
     * Populate 'user.posts' Virtual Field
     */
    const populatedPost = await newPost.populate({
      path: 'user',
      select: 'username avatar bio personality generalEmotions profileReview',
      populate: {
        path: 'posts',
        select: 'summary createdAt', // Select fields as needed
        options: { sort: { createdAt: -1 }, limit: 5 }, // Fetch recent 5 posts
      },
    });

    /**
     * Update User's Personality Profile
     */
    if (req.user && user) {
      await updatePersonalityProfile(user, combinedTraitScores);
      console.log('\nUser Personality Profile Updated Successfully.');
    }

    /**
     * Send Response
     */
    res.status(200).json({
      post: populatedPost,
      profileReview: profileReview || 'No review available.',
    });
  } catch (error) {
    console.error('Error processing transcription:', error);

    /**
     * Handle Specific Errors for Better Feedback
     */
    if (error.message.includes('Transcription failed')) {
      return res.status(502).json({ error: 'Transcription service failed. Please try again later.' });
    } else if (error.message.includes('Unsupported MIME type')) {
      return res.status(415).json({ error: 'Unsupported file type. Please upload a valid audio file.' });
    } else if (error.message.includes('File size exceeds')) {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 100MB.' });
    } else if (error.message.includes('Audio buffer is empty')) {
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    } else if (error.name === 'ValidationError') {
      // Handle Mongoose validation errors
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }

    /**
     * General Error Response
     */
    res.status(500).json({ error: 'Internal Server Error. Please try again later.' });
  }
};
