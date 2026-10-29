'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, PhoneCall } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomCode: string;
  isHost: boolean;
  opponentName: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  roomCode,
  isHost,
  opponentName,
}) => {
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  // Clean up media streams
  const stopMediaTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Receive incoming call request
    const handleIncomingCall = () => {
      setIncomingCall(true);
    };

    // Receive WebRTC Offer
    const handleOfferReceived = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        await startMedia();
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', { roomCode, answer });
        setInCall(true);
        setIncomingCall(false);
      } catch (err: any) {
        console.error('Error handling offer:', err);
        setErrorMsg('Không thể kết nối video: ' + err.message);
      }
    };

    // Receive WebRTC Answer
    const handleAnswerReceived = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnRef.current) {
          await peerConnRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setInCall(true);
        }
      } catch (err: any) {
        console.error('Error handling answer:', err);
      }
    };

    // Receive ICE candidate
    const handleCandidateReceived = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnRef.current && candidate) {
          await peerConnRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err: any) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    // Call ended by peer
    const handleCallEnded = () => {
      stopMediaTracks();
      setInCall(false);
      setIncomingCall(false);
    };

    socket.on('webrtc-incoming-call', handleIncomingCall);
    socket.on('webrtc-offer-received', handleOfferReceived);
    socket.on('webrtc-answer-received', handleAnswerReceived);
    socket.on('webrtc-ice-candidate-received', handleCandidateReceived);
    socket.on('webrtc-call-ended', handleCallEnded);

    return () => {
      socket.off('webrtc-incoming-call', handleIncomingCall);
      socket.off('webrtc-offer-received', handleOfferReceived);
      socket.off('webrtc-answer-received', handleAnswerReceived);
      socket.off('webrtc-ice-candidate-received', handleCandidateReceived);
      socket.off('webrtc-call-ended', handleCallEnded);
      stopMediaTracks();
    };
  }, [socket, roomCode]);

  // Request camera and microphone access
  const startMedia = async (): Promise<MediaStream> => {
    try {
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error('Error accessing camera/mic:', err);
      setErrorMsg('Không thể mở Camera/Micro: Vui lòng cho phép quyền truy cập');
      throw err;
    }
  };

  // Create RTCPeerConnection and wire up streams
  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnRef.current = pc;

    // Send local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          roomCode,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // Start outgoing call
  const startCall = async () => {
    try {
      setErrorMsg(null);
      const stream = await startMedia();
      const pc = createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('webrtc-offer', { roomCode, offer });
      setInCall(true);
    } catch (err: any) {
      console.error('Start call error:', err);
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    setIncomingCall(false);
    try {
      await startCall();
    } catch (err: any) {
      console.error('Accept call error:', err);
    }
  };

  // Decline or End call
  const endCall = () => {
    stopMediaTracks();
    socket?.emit('webrtc-end-call', { roomCode });
    setInCall(false);
    setIncomingCall(false);
  };

  // Toggle microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="bg-[#121824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">Video Call Trực Tiếp</h3>
        </div>
        {!inCall && !incomingCall && (
          <button
            onClick={startCall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Gọi video
          </button>
        )}
      </div>

      {/* Error notification if permissions missing */}
      {errorMsg && (
        <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Incoming Call Alert Modal */}
      {incomingCall && (
        <div className="mb-3 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-amber-300">{opponentName}</p>
              <p className="text-[11px] text-slate-300">Đang gọi video cho bạn...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={acceptCall}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
            >
              Nghe
            </button>
            <button
              onClick={() => setIncomingCall(false)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Video Screens View */}
      {inCall ? (
        <div className="space-y-3">
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
            {/* Remote Video (Opponent) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-slate-200">
              {opponentName}
            </div>

            {/* Local Video Picture-in-Picture (Self) */}
            <div className="absolute bottom-2 right-2 w-24 sm:w-28 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-amber-500/40 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[9px] text-slate-300">
                Bạn
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-full transition-all ${
                micEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
              title={micEnabled ? 'Tắt mic' : 'Bật mic'}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-2.5 rounded-full transition-all ${
                videoEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
              title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              onClick={endCall}
              className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
          <Video className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-400">
            Trò chuyện trực tiếp qua webcam và micro cùng đối thủ
          </p>
        </div>
      )}
    </div>
  );
};
