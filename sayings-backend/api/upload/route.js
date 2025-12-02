import nextConnect from 'next-connect';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
});

const handler = nextConnect();

handler.use(upload.single('file'));

handler.post(async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Upload the file to AssemblyAI
    const assemblyResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
      },
      data: file.buffer,
    });

    const audioUrl = assemblyResponse.data.upload_url;

    // Request transcription
    const transcriptResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      data: {
        audio_url: audioUrl,
      },
    });

    const transcriptId = transcriptResponse.data.id;

    // Poll for transcription completion
    let transcriptionCompleted = false;
    let transcriptionText = '';

    while (!transcriptionCompleted) {
      const pollingResponse = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      });

      if (pollingResponse.data.status === 'completed') {
        transcriptionCompleted = true;
        transcriptionText = pollingResponse.data.text;
      } else if (pollingResponse.data.status === 'error') {
        return res.status(500).json({ error: 'Transcription failed.' });
      } else {
        // Wait for 3 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Optionally, you can save the audio and transcription to a database here.

    return res.status(200).json({ transcript: transcriptionText });
  } catch (error) {
    console.error('Error processing transcription:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};

export default handler;
