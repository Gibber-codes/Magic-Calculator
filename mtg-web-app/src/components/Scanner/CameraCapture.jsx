import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, AlertCircle, RefreshCcw } from 'lucide-react';

export default function CameraCapture({ onCapture }) {
    const webcamRef = useRef(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [deviceId, setDeviceId] = useState(null);
    const [devices, setDevices] = useState([]);

    const handleDevices = useCallback(
        (mediaDevices) => {
            const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
            setDevices(videoDevices);

            if (videoDevices.length > 0 && videoDevices[0].label === "") {
                return;
            }

            const backCameras = videoDevices.filter(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('environment') ||
                device.label.toLowerCase().includes('rear')
            );

            if (backCameras.length > 0) {
                const scoredCameras = backCameras.map(device => {
                    const label = device.label.toLowerCase();
                    let score = 5;

                    if (label.includes('telephoto') || label.includes('zoom')) score = 10;
                    if (label.includes('main') || label.includes('primary')) score = 8;
                    if (label.includes('camera 0')) score = 9;
                    if (label.includes('camera 2')) score = 1;
                    if (label.includes('camera 1')) score = 7;
                    if (label.includes('ultra wide') || label.includes('0.6x') || label.includes('0.5x') || label.includes('wide-angle')) score = 0;

                    return { device, score };
                });

                scoredCameras.sort((a, b) => b.score - a.score);
                const bestDevice = scoredCameras[0].device;

                // Check what's currently running
                const currentTrack = webcamRef.current?.video?.srcObject?.getVideoTracks()[0];
                const currentDeviceId = currentTrack?.getSettings()?.deviceId;

                if (bestDevice.deviceId !== currentDeviceId) {
                    console.log('Switching to better lens:', bestDevice.label);
                    setDeviceId(bestDevice.deviceId);
                } else {
                    console.log('Already on best lens:', bestDevice.label);
                }
            }
        },
        [setDevices, webcamRef]
    );

    const onUserMedia = useCallback(() => {
        // Once we have a successful stream, we have permissions to see labels
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    React.useEffect(() => {
        // Just establish names if we already have them, but don't force a deviceId yet
        // to avoid race conditions with react-webcam mount
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoDevices = devices.filter(({ kind }) => kind === "videoinput");
            setDevices(videoDevices);
        });
    }, []);

    const videoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: deviceId ? undefined : facingMode, // if deviceId is set, facingMode can interfere on some browsers
        deviceId: deviceId ? deviceId : undefined
    };

    const capturePhoto = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            onCapture(imageSrc);
        }
    }, [webcamRef, onCapture]);

    const handleUserMediaError = useCallback((err) => {
        console.error('Camera error:', err);
        setError('Camera access denied or not available.');
    }, []);

    const toggleCamera = () => {
        if (facingMode === 'user') {
            setFacingMode('environment');
            const backCameras = devices.filter(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear')
            );
            if (backCameras.length > 0) setDeviceId(backCameras[0].deviceId);
        } else {
            // If already in environment mode, try to cycle to the next back camera
            const backCameras = devices.filter(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear')
            );

            if (backCameras.length > 1) {
                const currentIndex = backCameras.findIndex(d => d.deviceId === deviceId);
                const nextIndex = (currentIndex + 1) % backCameras.length;
                setDeviceId(backCameras[nextIndex].deviceId);
            } else {
                setFacingMode('user');
                setDeviceId(null);
            }
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white p-8 space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <p className="text-center">{error}</p>
                <button
                    onClick={() => { setError(null); setDeviceId(null); }}
                    className="px-6 py-2 bg-blue-600 rounded-lg"
                >
                    Retry Camera
                </button>
            </div>
        );
    }

    return (
        <div className="relative h-full flex flex-col bg-black">
            {/* Webcam Feed */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    imageSmoothing={true}
                    screenshotQuality={0.92}
                    videoConstraints={videoConstraints}
                    onUserMedia={onUserMedia}
                    onUserMediaError={handleUserMediaError}
                    className="w-full h-full object-cover"
                />

                {/* Simple Alignment Guide */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center">
                    {/* Centered OCR guide: Matches ocrEngine.js y: 0.40, height: 0.20 */}
                    <div className="absolute top-[50%] w-full flex flex-col items-center">
                        <div className="w-full border-b-2 border-yellow-400 border-dotted opacity-60" />
                        <p className="mt-1 text-yellow-400 text-[10px] font-bold uppercase tracking-widest opacity-80">
                            Align Card Name Here
                        </p>
                    </div>

                    <p className="absolute bottom-10 text-white/40 text-xs text-center px-4">
                        Center the card name on the line for best scan
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-900 p-6 pb-8 flex justify-center items-center gap-12">
                {/* Spacer to balance layout */}
                <div className="w-12" />

                {/* Main Capture Button */}
                <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-white/10"
                >
                    <div className="w-16 h-16 rounded-full bg-white" />
                </button>

                {/* Flip Camera */}
                <button
                    onClick={toggleCamera}
                    className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full text-white shadow-lg active:scale-95 transition-all"
                    title="Flip Camera"
                >
                    <RefreshCcw className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
