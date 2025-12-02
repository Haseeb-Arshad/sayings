const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Replace with your actual Hume AI API key
const apiKey = 'elPx1hSG1cTDronfvuW3GmYn64pdpXWoUuw6jAZnkmGS5KLG';

// Path to the local audio file you want to analyze
const audioFilePath = path.join(__dirname, 'newaudio.wav');

// Function to analyze the audio file
async function analyzeAudio() {
  try {
    // Check if the audio file exists
    if (!fs.existsSync(audioFilePath)) {
      console.error('Audio file not found:', audioFilePath);
      return;
    }

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('json', JSON.stringify({ models: { prosody: {} } }));

    // Start an inference job
    const response = await axios.post(
      'https://api.hume.ai/v0/batch/jobs',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-Hume-Api-Key': apiKey,
        },
      }
    );

    const jobId = response.data.job_id;
    console.log('Job started with ID:', jobId);

    // Poll for job completion with a timeout
    const timeout = 300000; // 5 minutes
    const interval = 5000; // 5 seconds
    const maxAttempts = timeout / interval;
    let attempts = 0;
    let jobStatus = 'IN_PROGRESS';

    while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, interval)); // Wait for 5 seconds
      const jobResponse = await axios.get(
        `https://api.hume.ai/v0/batch/jobs/${jobId}`,
        {
          headers: {
            'X-Hume-Api-Key': apiKey,
          },
        }
      );
      jobStatus = jobResponse.data.state.status;
      console.log('Job status:', jobStatus);
      attempts++;
    }

    if (jobStatus === 'COMPLETED') {
      // Retrieve the predictions
      const predictionsResponse = await axios.get(
        `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
        {
          headers: {
            'X-Hume-Api-Key': apiKey,
          },
        }
      );

      console.log('Predictions Response:', JSON.stringify(predictionsResponse.data, null, 2));

      // Access the predictions correctly
      const predictions = predictionsResponse.data;

      if (predictions && Array.isArray(predictions)) {
        predictions.forEach((predictionItem) => {
          console.log(`\nPredictions for file: ${predictionItem.source.filename}`);
          
          const models = predictionItem.results.predictions[0]?.models;
          if (models && models.prosody && models.prosody.grouped_predictions) {
            models.prosody.grouped_predictions.forEach((group) => {
              group.predictions.forEach((prediction) => {
                console.log('Predicted Emotions:');
                if (prediction.emotions && Array.isArray(prediction.emotions)) {
                  prediction.emotions.forEach((emotion) => {
                    console.log(`- ${emotion.name}: ${emotion.score}`);
                  });
                } else {
                  console.error('Emotions not found in the prediction:', prediction);
                }
              });
            });
          } else {
            console.error('Prosody models or grouped predictions not found:', predictionItem.results.predictions);
          }
        });
      } else {
        console.error('Unexpected predictions response structure:', predictionsResponse.data);
      }
    } else if (jobStatus === 'FAILED') {
      console.error('Job failed to complete.');
    } else {
      console.error('Job did not complete within the expected time frame.');
    }
  } catch (error) {
    console.error('Error analyzing audio:', error.response?.data || error.message);
  }
}

// Execute the analysis
analyzeAudio();
