// // utils/pinata.js

// const axios = require('axios');

// /**
//  * Uploads a file buffer to Pinata and returns the IPFS hash (CID).
//  * @param {Buffer} fileBuffer - The audio file buffer.
//  * @param {string} fileName - The name of the file.
//  * @returns {Promise<string>} - The IPFS hash.
//  */
// const uploadToPinata = async (fileBuffer, fileName) => {
//   const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

//   const formData = new FormData();
//   formData.append('file', fileBuffer, fileName);

//   try {
//     const response = await axios.post(url, formData, {
//       maxContentLength: 'Infinity', // Required for large files
//       headers: {
//         'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
//         pinata_api_key: "0edf729458f4d98a84b7",
//         pinata_secret_api_key: "b46f6f0762fb0e08dcbb1cd2238ecee420b9e3be5a8e3a0e377a6e00ba333cb0",
//       },
//     });

//     return response.data.IpfsHash; // This is the CID
//   } catch (error) {
//     console.error('Error uploading to Pinata:', error.response?.data || error.message);
//     throw new Error('Pinata upload failed');
//   }
// };

// module.exports = { uploadToPinata };





// utils/pinata.js

const FormData = require('form-data');
const axios = require('axios');

/**
 * Uploads a file to Pinata and returns the IPFS hash.
 * @param {Buffer} fileBuffer - The buffer of the file to upload.
 * @param {string} fileName - The original name of the file.
 * @returns {Promise<string>} - The IPFS hash returned by Pinata.
 */
const uploadToPinata = async (fileBuffer, fileName) => {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'audio/mpeg', // Adjust the MIME type as needed
        });

        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxContentLength: 'Infinity', // This is needed to prevent axios from limiting the file size
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: "0edf729458f4d98a84b7",
                pinata_secret_api_key: "b46f6f0762fb0e08dcbb1cd2238ecee420b9e3be5a8e3a0e377a6e00ba333cb0",
            },
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new Error(`Pinata upload failed with status ${response.status}: ${response.statusText}`);
        }

        return response.data.IpfsHash;
    } catch (error) {
        console.error('Error uploading to Pinata:', error.response ? error.response.data : error.message);
        throw new Error('Failed to upload file to Pinata');
    }
};

module.exports = { uploadToPinata };
