# Sayings: Bringing Social Media to Life Through Voice

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Optional: Add other badges if applicable -->
[![Status: Under Development](https://img.shields.io/badge/Status-Under%20Development-orange.svg)](.)


**Sayings is a social media application designed to make online interactions more personal and expressive by centering around voice messages instead of text.**

[**Try the Live Demo**](https://sayings.me) <!-- Update if the URL changes -->

---

## The Problem: Text Lacks Nuance

In the digital age, social media connects us, but text-based communication often falls short. It lacks the tone, emotion, and subtle cues present in human speech, leading to misunderstandings and a less personal experience.

## Our Solution: Voice-Centric Social Interaction

Sayings bridges this gap by bringing the power of voice to social media. Users share their thoughts and feelings by recording voice messages. Our platform then leverages AI to transcribe the audio, detect underlying emotions, and identify key topics, fostering deeper understanding and connection. The goal is to create a space where hearing someone's voice—their tone, emotion, and expression—is central to the interaction.

## Key Features ✨

*   **🎤 Voice Posting:** Easily record and share voice messages as posts.
*   **📜 Accurate Transcription:** Leverages AssemblyAI's Universal-2 model for high-quality speech-to-text conversion, including punctuation and formatting.
*   **😊 Emotion Detection:** Analyzes audio using Hume AI to identify and display the emotions conveyed in voice posts.
*   **🏷️ Topic Extraction:** Automatically identifies key topics discussed in posts for categorization and discovery.
*   **🧠 Personality Insights:** Utilizes Grok's API to generate personality insights and profile reviews based on user activity and voice posts.
*   **🔒 Secure Authentication:** Uses JWT and bcrypt for secure user registration and login.
*   **👤 User Profiles:** Personalized profiles showcasing user posts, personality traits, and activity.
*   **💬 Standard Social Interactions:** Like, comment on, and share voice posts.
*   **🌐 Decentralized Storage:** Audio files are securely stored using Pinata's IPFS API.
*   **📈 Trending Topics:** Sidebar displaying currently popular topics based on post analysis.
*   **🛡️ Security Measures:** Implemented rate limiting, CORS, and input validation.

## How It Works (Architecture Overview)

1.  **Recording:** Users record voice messages via the frontend (Next.js/React).
2.  **Upload & Storage:** The audio file is sent to the backend (Node.js/Express) and securely stored on IPFS via Pinata.
3.  **AI Processing:**
    *   The audio is sent to **AssemblyAI** for accurate transcription and timestamp generation.
    *   The audio/text is analyzed by **Hume AI** to detect emotions.
    *   User data and interactions are processed by **Grok** to generate personality insights.
4.  **Data Storage:** Transcriptions, emotion data, topics, user info, and post metadata are stored in MongoDB (via Mongoose).
5.  **Display:** The frontend retrieves and displays the voice posts, transcriptions, emotions, topics, and user profiles.

## Technology Stack 🛠️

*   **Frontend:** Next.js, React
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB, Mongoose ORM
*   **Authentication:** JSON Web Tokens (JWT), bcrypt
*   **Speech-to-Text:** AssemblyAI (Universal-2 Model)
*   **Emotion Detection:** Hume AI API
*   **Personality Insights:** Grok API
*   **File Storage:** Pinata IPFS API
*   **Security:** Rate limiting, CORS, Input Validation

## Getting Started

These instructions will help you get a copy of the project up and running on your local machine for development purposes.

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm or yarn
*   MongoDB instance (local or cloud-based like MongoDB Atlas)
*   API Keys for:
    *   AssemblyAI
    *   Hume AI
    *   Grok API
    *   Pinata (API Key + Secret)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd sayings-repo-name
    ```
2.  **Install dependencies (Backend & Frontend - adjust if separate repos):**
    ```bash
    # Navigate to backend directory if separate
    # cd backend
    npm install
    # or
    # yarn install

    # Navigate to frontend directory if separate
    # cd ../frontend
    npm install
    # or
    # yarn install
    ```
3.  **Set up Environment Variables:**
    Create a `.env` file in the root (or relevant backend/frontend directories). Add the necessary environment variables:
    ```plaintext
    # Backend .env example
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ASSEMBLYAI_API_KEY=your_assemblyai_api_key
    HUME_API_KEY=your_hume_ai_api_key
    GROK_API_KEY=your_grok_api_key
    PINATA_API_KEY=your_pinata_api_key
    PINATA_SECRET_API_KEY=your_pinata_secret

    # Frontend .env.local example (if needed, e.g., for backend URL)
    NEXT_PUBLIC_API_BASE_URL=http://localhost:PORT # Your backend server URL
    ```
    *Make sure to replace placeholders with your actual keys and connection strings.*

4.  **Run the application:**
    ```bash
    # Start the backend server (from backend directory if separate)
    npm run start # or npm run dev for development mode if configured

    # Start the frontend development server (from frontend directory if separate)
    npm run dev
    ```
    Open your browser to the frontend URL (typically `http://localhost:3000`).

## Project Status

Sayings is currently in its early phases. While functional, backend optimizations and further user experience enhancements are planned. This project was built solely by Haseeb Arshad.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests if you have suggestions or improvements.
(You can add more detailed contribution guidelines if desired).

## License

Distributed under the MIT License. See `LICENSE` file for more information.

## Contact

Haseeb - haseebarshad992@gmail.com

Project Link: https://github.com/Haseeb-Arshad/sayings.git
