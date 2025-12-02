// utils/personality.js

const { emotionToTraitsMap, topicToTraitsMap } = require('./mappings');
const { getGrokResponse } = require('./groktest'); // Ensure correct path
const Post = require('../models/Posts'); // Importing the Post model

/**
 * Compute overall sentiment score from sentiment analysis results.
 * Assign +1 for POSITIVE, -1 for NEGATIVE, 0 for NEUTRAL.
 * The score is weighted by confidence.
 * @param {Array} sentimentResults - Array of sentiment analysis results.
 * @returns {Number} - Weighted sentiment score between -1 and 1.
 */
function computeWeightedSentiment(sentimentResults) {
  if (!Array.isArray(sentimentResults) || sentimentResults.length === 0) {
    console.log('No sentiment analysis results provided.');
    return 0;
  }

  let totalScore = 0;
  let totalConfidence = 0;

  sentimentResults.forEach((result, index) => {
    if (!result || typeof result.sentiment !== 'string' || typeof result.confidence !== 'number') {
      console.warn(`Invalid sentiment result at index ${index}:`, result);
      return;
    }

    let sentimentValue = 0;
    if (result.sentiment === 'POSITIVE') sentimentValue = 1;
    else if (result.sentiment === 'NEGATIVE') sentimentValue = -1;
    // NEUTRAL contributes 0

    totalScore += sentimentValue * result.confidence;
    totalConfidence += result.confidence;
  });

  const weightedSentiment = totalConfidence > 0 ? totalScore / totalConfidence : 0;
  console.log(`Computed Weighted Sentiment: ${weightedSentiment.toFixed(4)}`);
  return weightedSentiment; // Range between -1 and 1
}

/**
 * Convert weighted sentiment score to sentiment category.
 * @param {Number} weightedSentiment - Weighted sentiment score between -1 and 1.
 * @param {Number} threshold - Threshold to categorize sentiment.
 * @returns {String} - 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
 */
function categorizeSentiment(weightedSentiment, threshold = 0.1) {
  if (weightedSentiment > threshold) return 'POSITIVE';
  if (weightedSentiment < -threshold) return 'NEGATIVE';
  return 'NEUTRAL';
}

/**
 * Compute general sentiment category ('POSITIVE', 'NEGATIVE', 'NEUTRAL') from sentiment analysis results.
 * @param {Array} sentimentResults - Array of sentiment analysis results.
 * @returns {String} - 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
 */
function computeGeneralSentiment(sentimentResults) {
  const weightedSentiment = computeWeightedSentiment(sentimentResults);
  const sentimentCategory = categorizeSentiment(weightedSentiment);
  // console.log(`General Sentiment Category: ${sentimentCategory}`);
  return sentimentCategory;
}

/**
 * Map emotions to personality traits.
 * @param {Array} emotions - Array of emotion objects with name and score.
 * @returns {Object} - Trait scores.
 */
function mapEmotionsToTraits(emotions) {
  const traitScores = {
    Openness: 0,
    Conscientiousness: 0,
    Extraversion: 0,
    Agreeableness: 0,
    Neuroticism: 0,
  };

  if (!Array.isArray(emotions)) {
    console.log('No emotions data provided.');
    return traitScores;
  }

  emotions.forEach((emotionObj, index) => {
    if (!emotionObj || typeof emotionObj.name !== 'string' || typeof emotionObj.score !== 'number') {
      console.warn(`Invalid emotion object at index ${index}:`, emotionObj);
      return;
    }

    const emotionName = emotionObj.name.toLowerCase(); // Ensure case-insensitive matching
    const emotionScore = emotionObj.score;

    const traits = emotionToTraitsMap[emotionName];
    if (!traits || traits.length === 0) {
      console.warn(`No trait mapping found for emotion: '${emotionObj.name}'`);
      return;
    }

    traits.forEach((trait) => {
      let traitName = trait;
      let score = emotionScore;

      // Handle 'Low' traits by subtracting the score
      if (trait.startsWith('Low ')) {
        traitName = trait.replace('Low ', '');
        score = -emotionScore; // Negative contribution for low traits
      }

      if (traitScores.hasOwnProperty(traitName)) {
        traitScores[traitName] += score;
      } else {
        console.warn(`Unknown trait '${traitName}' encountered while mapping emotion '${emotionObj.name}'`);
      }
    });
  });

  // console.log('Mapped Trait Scores from Emotions:', traitScores);
  return traitScores;
}

/**
 * Map topics to personality traits.
 * @param {Array} topics - Array of topic objects with name and confidence.
 * @returns {Object} - Trait scores.
 */
function mapTopicsToTraits(topics) {
  const traitScores = {
    Openness: 0,
    Conscientiousness: 0,
    Extraversion: 0,
    Agreeableness: 0,
    Neuroticism: 0,
  };

  if (!Array.isArray(topics)) {
    console.log('No topics data provided.');
    return traitScores;
  }

  topics.forEach((topicObj, index) => {
    if (!topicObj || typeof topicObj.topic !== 'string' || typeof topicObj.confidence !== 'number') {
      console.warn(`Invalid topic object at index ${index}:`, topicObj);
      return;
    }

    const topicName = topicObj.topic;
    const confidence = topicObj.confidence;

    const traits = topicToTraitsMap[topicName];
    if (!traits || traits.length === 0) {
      console.warn(`No trait mapping found for topic: '${topicName}'`);
      return;
    }

    traits.forEach((trait) => {
      if (traitScores.hasOwnProperty(trait)) {
        traitScores[trait] += confidence;
      } else {
        console.warn(`Unknown trait '${trait}' encountered while mapping topic '${topicName}'`);
      }
    });
  });

  // console.log('Mapped Trait Scores from Topics:', traitScores);
  return traitScores;
}

/**
 * Map general sentiment to personality trait adjustments.
 * @param {String} generalSentiment - 'POSITIVE', 'NEGATIVE', 'NEUTRAL'.
 * @returns {Object} - Trait adjustments.
 */
function mapSentimentToTraits(generalSentiment) {
  const adjustments = {
    Openness: 0,
    Conscientiousness: 0,
    Extraversion: 0,
    Agreeableness: 0,
    Neuroticism: 0,
  };

  switch (generalSentiment) {
    case 'POSITIVE':
      adjustments.Extraversion += 0.2; // Example value
      adjustments.Agreeableness += 0.1; // Example value
      break;
    case 'NEGATIVE':
      adjustments.Neuroticism += 0.2; // Example value
      break;
    case 'NEUTRAL':
      // No adjustments
      break;
    default:
      console.warn(`Unknown general sentiment: '${generalSentiment}'`);
  }

  // console.log('Mapped Trait Adjustments from General Sentiment:', adjustments);
  return adjustments;
}

/**
 * Update user's personality profile based on new trait scores.
 * Uses an exponential moving average approach for smoother updates.
 * @param {Object} user - Mongoose user document.
 * @param {Object} newTraitScores - Object with trait scores.
 * @param {Number} alpha - Smoothing factor between 0 and 1.
 */
async function updatePersonalityProfile(user, newTraitScores, alpha = 0.5) {
  // Initialize personality if not present
  if (!user.personality) {
    user.personality = {
      Openness: 0,
      Conscientiousness: 0,
      Extraversion: 0,
      Agreeableness: 0,
      Neuroticism: 0,
    };
    console.log('Initialized user personality profile.');
  }

  // Update each trait using exponential moving average
  for (let trait in newTraitScores) {
    if (newTraitScores.hasOwnProperty(trait)) {
      const previousScore = user.personality[trait] || 0;
      const newScore = newTraitScores[trait];

      // Exponential moving average
      user.personality[trait] = alpha * newScore + (1 - alpha) * previousScore;
      // console.log(`Updated ${trait}: Previous=${previousScore.toFixed(4)}, New=${newScore.toFixed(4)}, Updated=${user.personality[trait].toFixed(4)}`);
    }
  }

  // Save the updated user document
  await user.save();
  console.log('User personality profile updated and saved.');
}

/**
 * Update user's general emotions with time decay.
 * @param {Object} user - Mongoose user document.
 * @param {Object} newTraitScores - Object with trait scores from the latest post.
 * @param {Number} alpha - Smoothing factor between 0 and 1.
 */
async function updateUserGeneralEmotions(user, newTraitScores, alpha = 0.3) { // Lower alpha for general emotions
  // Initialize generalEmotions if not present
  if (!user.generalEmotions) {
    user.generalEmotions = {
      Openness: 0,
      Conscientiousness: 0,
      Extraversion: 0,
      Agreeableness: 0,
      Neuroticism: 0,
    };
    console.log('Initialized user general emotions.');
  }

  // Update each trait using exponential moving average
  for (let trait in newTraitScores) {
    if (newTraitScores.hasOwnProperty(trait)) {
      const previousScore = user.generalEmotions[trait] || 0;
      const newScore = newTraitScores[trait];

      // Exponential moving average with lower alpha for smoother, less abrupt changes
      user.generalEmotions[trait] = alpha * newScore + (1 - alpha) * previousScore;
      // console.log(`Updated General Emotion ${trait}: Previous=${previousScore.toFixed(4)}, New=${newScore.toFixed(4)}, Updated=${user.generalEmotions[trait].toFixed(4)}`);
    }
  }

  // Log the emotion update
  user.emotionLogs.push({
    emotions: { ...user.generalEmotions },
    timestamp: new Date(),
  });

  // Save the updated user document
  await user.save();
  console.log('User general emotions updated and saved.');
}

/**
 * Generate a profile review using the Grok AI model.
 * @param {Object} user - Mongoose user document.
 * @returns {String} - Generated profile review.
 */
async function generateProfileReview(user) {
  // Fetch recent posts summaries
  const recentPosts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('summary -_id'); // Fetch only summaries

  const recentSummaries = recentPosts.map(post => post.summary).join('\n');

  const messages = [
    { role: 'system', content: 'You are a thoughtful and slightly sarcastic assistant who provides insightful reviews of user profiles in 100 words or less. It should sound more like a human tone. You start with just providing results in the Brackets and not other saying: e.g. [Result] instead of "Result:". Do not include any other text or explanations.' },
    {
      role: 'user',
      content: `
        Deeply analyze the following user profile, considering the user's emotions, personality traits, bio, and summaries of their recent posts. Without explicitly mentioning any percentages or scores, infer the user's characteristics and interests based on the provided information. Craft a brief and thoughtful review that encapsulates your insights, incorporating a bit of sarcasm. Write as if you are a thinker or an actor giving a critique, aiming to engage users on a social platform.


        Bio: ${user.bio || 'No bio provided.'}

        Personality Traits:
        Openness: ${user.personality.Openness.toFixed(2)}
        Conscientiousness: ${user.personality.Conscientiousness.toFixed(2)}
        Extraversion: ${user.personality.Extraversion.toFixed(2)}
        Agreeableness: ${user.personality.Agreeableness.toFixed(2)}
        Neuroticism: ${user.personality.Neuroticism.toFixed(2)}

        General Emotions:
        Openness: ${user.generalEmotions.Openness.toFixed(2)}
        Conscientiousness: ${user.generalEmotions.Conscientiousness.toFixed(2)}
        Extraversion: ${user.generalEmotions.Extraversion.toFixed(2)}
        Agreeableness: ${user.generalEmotions.Agreeableness.toFixed(2)}
        Neuroticism: ${user.generalEmotions.Neuroticism.toFixed(2)}

        Recent Posts Summary:
        ${recentSummaries || 'No recent posts available.'}
        You start with just providing results in the Brackets and not other saying: e.g. [Result] instead of "Result:". Do not include any other text or explanations.
        [Provide your concise review here.]

      `,
    },
  ];

  try {
    const response = await getGrokResponse(messages);
    let review = response.choices[0].message.content.trim();

    // Remove any brackets at the start and end
    review = review.replace(/^\[|\]$/g, '').trim();
    

    console.log('Generated Profile Review:', review);
    return review;
  } catch (error) {
    console.error('Error generating profile review:', error.message);
    return 'Unable to generate profile review at this time.';
  }
}

module.exports = {
  computeWeightedSentiment,
  computeGeneralSentiment,
  mapEmotionsToTraits,
  mapTopicsToTraits,
  mapSentimentToTraits,
  updatePersonalityProfile,
  updateUserGeneralEmotions,
  generateProfileReview,
};
