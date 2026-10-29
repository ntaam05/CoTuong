'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, PhoneCall, Camera } from 'lucide-react';
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

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  // Clean up media streams
  const stopMediaTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
  };

  // Synchronize local stream to local video element whenever either changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch((err) => {
        console.warn('Local video play error:', err);
      });
    }
  }, [localStream, inCall]);

  // Synchronize remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch((err) => {
        console.warn('Remote video play error:', err);
      });
    }
  }, [remoteStream, inCall]);

  useEffect(() => {
    if (!socket) return;

    // Receive incoming call request
    const handleIncomingCall = () => {
      setIncomingCall(true);
    };

    // Receive WebRTC Offer
    const handleOfferReceived = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        const stream = await startMedia();
        const pc = createPeerConnection(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', { roomCode, answer });
        setInCall(true);
        setIncomingCall(false);
      } catch (err: any) {
        console.error('Error handling offer:', err);
        setErrorMsg('Không thể kết nối video: ' + (err.message || 'Lỗi thiết bị'));
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

  // Request camera and microphone access with automatic fallback
  const startMedia = async (): Promise<MediaStream> => {
    try {
      if (localStreamRef.current && localStreamRef.current.active) {
        return localStreamRef.current;
      }

      setErrorMsg(null);
      let stream: MediaStream;

      try {
        // Attempt both video and audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: true,
        });
      } catch (audioErr) {
        console.warn('Microphone failed or blocked, falling back to video-only:', audioErr);
        // Fallback to video only if audio is unavailable
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      return stream;
    } catch (err: any) {
      console.error('Error accessing camera/mic:', err);
      let msg = 'Không thể mở Camera/Micro: Vui lòng cho phép quyền truy cập thiết bị.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Bạn đã chặn quyền Camera/Micro. Vui lòng bấm vào biểu tượng Camera trên thanh địa chỉ để cấp quyền.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy thiết bị Camera trên máy tính của bạn.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera đang bị ứng dụng khác sử dụng (Zoom, Teams, v.v.). Vui lòng tắt các app đó rồi thử lại.';
      }
      setErrorMsg(msg);
      throw err;
    }
  };

  // Create RTCPeerConnection and wire up streams
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnRef.current = pc;

    // Send local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Receive remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
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
      setInCall(true);

      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('webrtc-call-request', { roomCode });
      socket?.emit('webrtc-offer', { roomCode, offer });
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
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">Video Call Trực Tiếp</h3>
        </div>

        {!inCall && !incomingCall && (
          <div className="flex items-center gap-2">
            {!localStream ? (
              <button
                type="button"
                onClick={() => startMedia().catch(() => {})}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition active:scale-95"
                title="Bật thử camera xem trước hình ảnh"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Thử camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopMediaTracks}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                Tắt xem thử
              </button>
            )}

            <button
              type="button"
              onClick={startCall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Gọi video</span>
            </button>
          </div>
        )}
      </div>

      {/* Error notification if permissions missing */}
      {errorMsg && (
        <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center justify-between gap-2">
          <p className="leading-tight">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
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

      {/* Active Call Video Screens */}
      {inCall ? (
        <div className="space-y-3">
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
            {/* Remote Video (Opponent) */}
            <video
              ref={(el) => {
                remoteVideoRef.current = el;
                if (el && remoteStream && el.srcObject !== remoteStream) {
                  el.srcObject = remoteStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                remoteStream ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Waiting for Opponent Overlay */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/85 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2.5 animate-pulse">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white mb-0.5">{opponentName}</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Đang kết nối... Chờ đối thủ bấm đồng ý nhận cuộc gọi video
                </p>
              </div>
            )}

            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-slate-200">
              {opponentName}
            </div>

            {/* Local Video Picture-in-Picture (Self) */}
            <div className="absolute bottom-2 right-2 w-24 sm:w-28 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-amber-500/50 shadow-lg">
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  if (el && localStream && el.srcObject !== localStream) {
                    el.srcObject = localStream;
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
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
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
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
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              }`}
              title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>

            <button
              onClick={endCall}
              className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : localStream ? (
        /* Preview Camera Window before starting Call */
        <div className="space-y-3">
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-emerald-500/50 shadow-inner">
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.muted = true;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/80 backdrop-blur-sm rounded text-[10px] text-white font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Camera đang hoạt động
            </div>
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
