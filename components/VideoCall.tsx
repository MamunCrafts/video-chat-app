import { useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { Avatar } from './Avatar'

interface VideoCallProps {
    stream: MediaStream | null
    callAccepted: boolean
    callEnded: boolean
    userVideo: React.RefObject<HTMLVideoElement | null>
    myVideo: React.RefObject<HTMLVideoElement | null>
    callerName: string
    onLeave: () => void
    isMuted: boolean
    toggleMute: () => void
    isVideoOff: boolean
    toggleVideo: () => void
}

export function VideoCall({
    stream,
    callAccepted,
    callEnded,
    userVideo,
    myVideo,
    callerName,
    onLeave,
    isMuted,
    toggleMute,
    isVideoOff,
    toggleVideo,
}: VideoCallProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900">
            {/* Remote Video (Full Screen) */}
            {callAccepted && !callEnded && userVideo.current?.srcObject ? (
                <video
                    playsInline
                    ref={userVideo}
                    autoPlay
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center justify-center text-white">
                    <Avatar name={callerName} size="xl" className="mb-4 bg-gray-700 text-white" />
                    <p className="text-xl">{callAccepted ? 'Audio Call' : `Calling ${callerName}...`}</p>
                </div>
            )}

            {/* Local Video (PIP) */}
            {stream && (
                <div className="absolute bottom-20 right-4 h-48 w-32 overflow-hidden rounded-lg border-2 border-gray-800 bg-black shadow-lg sm:bottom-8 sm:right-8 sm:h-60 sm:w-40">
                    <video
                        playsInline
                        muted
                        ref={myVideo}
                        autoPlay
                        className="h-full w-full object-cover mirror"
                    />
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 transform space-x-6 rounded-full bg-gray-800/80 px-8 py-4 backdrop-blur-sm">
                <button
                    onClick={toggleMute}
                    className={`rounded-full p-4 transition ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
                        }`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`rounded-full p-4 transition ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'
                        }`}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                <button
                    onClick={onLeave}
                    className="rounded-full bg-red-600 p-4 text-white hover:bg-red-700 transition"
                >
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    )
}
