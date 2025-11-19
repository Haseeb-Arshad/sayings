import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from '../../utils/axiosInstance';

// Placeholder for the robot image since generation failed
const RobotPlaceholder = () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-300"></div>
        <div className="relative z-10 text-gray-400 flex flex-col items-center">
            <div className="w-32 h-40 bg-gray-300 rounded-full mb-4 shadow-inner flex items-center justify-center">
                <div className="flex gap-8">
                    <div className="w-4 h-4 bg-black rounded-full opacity-50"></div>
                    <div className="w-4 h-4 bg-black rounded-full opacity-50"></div>
                </div>
            </div>
            <span className="text-sm font-medium">NEO Robot</span>
        </div>
    </div>
);

const VoiceCard = ({ onNewPost }) => {
    const [recording, setRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const animationFrameRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const startRecording = async () => {
        if (!navigator.mediaDevices) {
            alert('Your browser does not support audio recording.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyserRef.current = analyser;
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateAudioLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                setAudioLevel(average);
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };

            updateAudioLevel();

            mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            mediaRecorder.start();
            setRecording(true);
            setTranscript(''); // Clear previous transcript

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Error accessing microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (analyserRef.current) analyserRef.current.disconnect();
            if (audioContextRef.current) audioContextRef.current.close();

            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

            setIsProcessing(true);

            const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
            chunksRef.current = []; // Reset chunks

            uploadAudio(blob).then((postData) => {
                setIsProcessing(false);
                if (postData) {
                    setTranscript(postData.transcript || 'Audio processed successfully.');
                    if (onNewPost) onNewPost(postData);
                }
            });
        }
    };

    const uploadAudio = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'recording.wav');

        try {
            const response = await axios.post('/transcribe', formData);
            return response.data;
        } catch (error) {
            console.error('Error uploading audio:', error);
            alert('Error uploading audio.');
            return null;
        }
    };

    return (
        <div className="col-span-2 row-span-2 bg-surface rounded-3xl p-6 shadow-sm border border-border relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-primary">NEO</h3>
                        <p className="text-sm text-secondary">Home Robot</p>
                    </div>
                    {/* Visualizer / Status Indicator */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${recording ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                        {recording ? (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-3 h-3 bg-red-500 rounded-full"
                            />
                        ) : (
                            <div className="w-3 h-3 bg-gray-400 rounded-full" />
                        )}
                    </div>
                </div>

                <div className="flex justify-center my-4">
                    <RobotPlaceholder />
                </div>
            </div>

            <div className="relative z-10 flex items-center justify-between mt-4">
                <div>
                    <p className="text-lg font-semibold text-primary">Available soon</p>
                    <p className="text-sm text-secondary">Get notified</p>
                </div>

                <div className="flex gap-2">
                    {transcript && !recording && !isProcessing && (
                        <div className="absolute bottom-16 left-0 right-0 bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg text-xs text-gray-700 border border-gray-100">
                            <p className="line-clamp-2">"{transcript}"</p>
                        </div>
                    )}

                    <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${recording
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : isProcessing
                                    ? 'bg-gray-100 text-gray-500 cursor-wait'
                                    : 'bg-white border border-gray-200 text-primary hover:bg-gray-50 shadow-sm'
                            }`}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : recording ? 'Stop Listening' : 'Notify me'}
                        {/* Note: Changed "Notify me" to act as the record button for this demo/task context, or we can add a separate mic button. 
                        Let's make "Notify me" the main CTA but maybe add a specific mic icon for the voice feature requested. 
                        Actually, the user wants "better voice listening part". Let's make a dedicated button.
                    */}
                    </button>
                    <button
                        onClick={recording ? stopRecording : startRecording}
                        className={`p-3 rounded-full transition-all shadow-sm ${recording ? 'bg-red-500 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        {recording ? <FaStop /> : <FaMicrophone />}
                    </button>
                </div>
            </div>

            {/* Background Gradient Animation when recording */}
            {recording && (
                <motion.div
                    className="absolute inset-0 bg-blue-50/50 pointer-events-none"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                />
            )}
        </div>
    );
};

export default VoiceCard;
