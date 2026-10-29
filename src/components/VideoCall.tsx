'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Camera,
  Volume2,
  VolumeX,
  PhoneForwarded,
} from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomCode: string;
  isHost: boolean;
  opponentName: string;
}

// STUN + TURN relay servers for NAT traversal across Cloudflare tunnels & mobile/home networks
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

type CallState = 'idle' | 'calling' | 'ringing' | 'connected';

export const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  roomCode,
  isHost,
  opponentName,
}) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  // Queue candidates that arrive before setRemoteDescription completes
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  // Keep track of callState in ref to avoid stale closures in socket callbacks
  const callStateRef = useRef<CallState>('idle');
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Synchronize local preview video element
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.muted = true; // Always muted locally to prevent echo
      el.play().catch(() => {});
    }
  }, [localStream, callState]);

  // Synchronize remote video element & unmuted audio playback
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.muted = false; // Remote MUST be unmuted to hear opponent
      el.play()
        .then(() => setAudioBlocked(false))
        .catch((err) => {
          console.warn('Remote video autoplay blocked by browser:', err);
          // If browser policy blocks unmuted autoplay, offer click-to-unmute
          setAudioBlocked(true);
        });
    }
  }, [remoteStream, callState]);

  // Clean up all media tracks and WebRTC peer connection
  const cleanupCall = useCallback(() => {
    if (peerConnRef.current) {
      try {
        peerConnRef.current.ontrack = null;
        peerConnRef.current.onicecandidate = null;
        peerConnRef.current.onconnectionstatechange = null;
        peerConnRef.current.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      peerConnRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('');
    setCallState('idle');
    setAudioBlocked(false);
  }, []);

  // Request camera and microphone access with echo cancellation & noise suppression
  const startMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current?.active) {
      return localStreamRef.current;
    }

    setErrorMsg(null);
    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      try {
        console.warn('Audio/Video combo failed, trying video only');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (vidErr: any) {
        let msg = 'Không thể mở Camera/Micro: Vui lòng cho phép quyền truy cập thiết bị.';
        if (vidErr.name === 'NotAllowedError' || vidErr.name === 'PermissionDeniedError') {
          msg = 'Bạn đã từ chối quyền Camera/Micro. Vui lòng bấm biểu tượng ổ khóa cạnh URL để cho phép.';
        } else if (vidErr.name === 'NotFoundError') {
          msg = 'Không tìm thấy thiết bị Camera/Micro trên máy tính này.';
        } else if (vidErr.name === 'NotReadableError') {
          msg = 'Camera/Micro đang được dùng bởi ứng dụng khác (Zoom, Teams...).';
        }
        setErrorMsg(msg);
        throw vidErr;
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // Flush queued candidates
  const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const list = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const c of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn('Error adding buffered ICE candidate:', e);
      }
    }
  }, []);

  // Create RTCPeerConnection and attach tracks & event listeners
  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      // Close previous connection if any
      if (peerConnRef.current) {
        try {
          peerConnRef.current.close();
        } catch {}
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnRef.current = pc;
      pendingCandidatesRef.current = [];
      remoteDescSetRef.current = false;
      remoteStreamRef.current = new MediaStream();

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote tracks (audio and video)
      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        // Clone into a new MediaStream instance so React state updates and video element refreshes
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      };

      // Send local ICE candidates to opponent via Socket.IO
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc-ice-candidate', {
            roomCode,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'connected') {
          setErrorMsg(null);
        } else if (pc.connectionState === 'failed') {
          setErrorMsg('Kết nối WebRTC bị ngắt (NAT/Firewall). Đang thử kết nối lại...');
        } else if (pc.connectionState === 'disconnected') {
          setErrorMsg('Mất kết nối tạm thời với đối thủ...');
        }
      };

      return pc;
    },
    [socket, roomCode]
  );

  // Set up WebRTC socket signaling event listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Callee receives incoming call request
    const handleIncomingCall = () => {
      if (callStateRef.current === 'connected') return;
      setCallState('ringing');
    };

    // 2. Callee accepted call -> Caller prepares local media & creates offer
    const handleCallAccepted = async () => {
      try {
        setCallState('connected');
        const stream = await startMedia();
        const pc = createPeerConnection(stream);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit('webrtc-offer', { roomCode, offer });
      } catch (err: any) {
        console.error('Error starting call after accept:', err);
        setErrorMsg('Không thể khởi tạo cuộc gọi: ' + (err.message || 'Lỗi thiết bị'));
        cleanupCall();
      }
    };

    // 3. Callee declined call -> Caller resets state
    const handleCallDeclined = () => {
      setErrorMsg('Đối thủ đã từ chối cuộc gọi video.');
      cleanupCall();
    };

    // 4. Callee receives offer -> sets remote offer, creates answer, sends back
    const handleOfferReceived = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        setCallState('connected');
        const stream = await startMedia();
        const pc = createPeerConnection(stream);

        if (pc.signalingState !== 'stable') {
          console.warn('Signaling state not stable on offer received:', pc.signalingState);
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' } as any),
            pc.setRemoteDescription(new RTCSessionDescription(offer)),
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        }

        remoteDescSetRef.current = true;
        await drainPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', { roomCode, answer });
      } catch (err: any) {
        console.error('Error handling WebRTC offer:', err);
        setErrorMsg('Lỗi đàm phán cuộc gọi: ' + (err.message || 'Lỗi kết nối'));
        cleanupCall();
      }
    };

    // 5. Caller receives answer -> sets remote description
    const handleAnswerReceived = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnRef.current;
        if (!pc) return;

        // CRITICAL GUARD: Only set answer if peer connection is waiting for answer (have-local-offer)
        if (pc.signalingState !== 'have-local-offer') {
          console.warn(
            `Ignoring duplicate/out-of-order WebRTC answer because state is: ${pc.signalingState}`
          );
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSetRef.current = true;
        await drainPendingCandidates(pc);
      } catch (err: any) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    // 6. Handle incoming ICE candidates
    const handleCandidateReceived = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      const pc = peerConnRef.current;
      if (!pc || !remoteDescSetRef.current) {
        // Queue candidates until remote description is set
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    };

    // 7. Call ended by either peer
    const handleCallEnded = () => {
      cleanupCall();
    };

    socket.on('webrtc-incoming-call', handleIncomingCall);
    socket.on('webrtc-call-accepted', handleCallAccepted);
    socket.on('webrtc-call-declined', handleCallDeclined);
    socket.on('webrtc-offer-received', handleOfferReceived);
    socket.on('webrtc-answer-received', handleAnswerReceived);
    socket.on('webrtc-ice-candidate-received', handleCandidateReceived);
    socket.on('webrtc-call-ended', handleCallEnded);

    return () => {
      socket.off('webrtc-incoming-call', handleIncomingCall);
      socket.off('webrtc-call-accepted', handleCallAccepted);
      socket.off('webrtc-call-declined', handleCallDeclined);
      socket.off('webrtc-offer-received', handleOfferReceived);
      socket.off('webrtc-answer-received', handleAnswerReceived);
      socket.off('webrtc-ice-candidate-received', handleCandidateReceived);
      socket.off('webrtc-call-ended', handleCallEnded);
    };
  }, [
    socket,
    roomCode,
    startMedia,
    createPeerConnection,
    drainPendingCandidates,
    cleanupCall,
  ]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // User A initiates call
  const startCall = useCallback(async () => {
    try {
      setErrorMsg(null);
      // Turn on local camera preview immediately
      await startMedia();
      setCallState('calling');
      // Send call request to opponent
      socket?.emit('webrtc-call-request', { roomCode });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      cleanupCall();
    }
  }, [socket, roomCode, startMedia, cleanupCall]);

  // User A cancels outgoing call
  const cancelCall = useCallback(() => {
    socket?.emit('webrtc-end-call', { roomCode });
    cleanupCall();
  }, [socket, roomCode, cleanupCall]);

  // User B accepts incoming call
  const acceptCall = useCallback(async () => {
    try {
      setErrorMsg(null);
      await startMedia();
      setCallState('connected');
      socket?.emit('webrtc-call-accepted', { roomCode });
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      setErrorMsg('Không thể mở Camera/Mic để nghe: ' + (err.message || 'Lỗi thiết bị'));
      cleanupCall();
    }
  }, [socket, roomCode, startMedia, cleanupCall]);

  // User B declines incoming call
  const declineCall = useCallback(() => {
    socket?.emit('webrtc-call-declined', { roomCode });
    cleanupCall();
  }, [socket, roomCode, cleanupCall]);

  // Either user hangs up active call
  const endCall = useCallback(() => {
    socket?.emit('webrtc-end-call', { roomCode });
    cleanupCall();
  }, [socket, roomCode, cleanupCall]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle camera
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Unlock audio if browser blocked unmuted autoplay
  const handleUnlockAudio = useCallback(() => {
    const el = remoteVideoRef.current;
    if (el) {
      el.muted = false;
      el.play()
        .then(() => setAudioBlocked(false))
        .catch((e) => console.warn('Still cannot play audio:', e));
    }
  }, []);

  const inCall = callState === 'connected';

  return (
    <div className="bg-[#121824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              inCall && connectionState === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : inCall
                ? 'bg-amber-500 animate-pulse'
                : callState === 'calling' || callState === 'ringing'
                ? 'bg-sky-400 animate-ping'
                : 'bg-slate-600'
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-200">Video Call Trực Tiếp</h3>
          {inCall && connectionState && connectionState !== 'connected' && (
            <span className="text-[10px] text-amber-400 font-medium">({connectionState})</span>
          )}
        </div>

        {callState === 'idle' && (
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
                onClick={cleanupCall}
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

      {/* Error notification */}
      {errorMsg && (
        <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center justify-between gap-2">
          <p className="leading-tight">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-xs px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Outgoing Call Waiting Screen */}
      {callState === 'calling' && (
        <div className="mb-3 p-3.5 bg-sky-500/15 border border-sky-500/40 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <PhoneForwarded className="w-5 h-5 text-sky-400 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-sky-300">Đang gọi cho {opponentName}...</p>
              <p className="text-[11px] text-slate-300">Đang chờ đối thủ bấm Nhận cuộc gọi</p>
            </div>
          </div>
          <button
            onClick={cancelCall}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition active:scale-95"
          >
            Hủy gọi
          </button>
        </div>
      )}

      {/* Incoming Call Alert (Ringing) */}
      {callState === 'ringing' && (
        <div className="mb-3 p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-amber-300">{opponentName}</p>
              <p className="text-[11px] text-slate-200">Đang gọi video cho bạn...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={acceptCall}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95 animate-pulse"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Nghe</span>
            </button>
            <button
              onClick={declineCall}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition active:scale-95"
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Autoplay Audio Blocked Banner */}
      {audioBlocked && inCall && (
        <div className="mb-3 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <VolumeX className="w-4 h-4 text-amber-400" />
            <span>Trình duyệt đang chặn tiếng đối thủ. Bấm để bật tiếng:</span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Bật tiếng</span>
          </button>
        </div>
      )}

      {/* Active Call Video Screens */}
      {inCall ? (
        <div className="space-y-3">
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
            {/* Remote Video (Opponent) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                remoteStream ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Waiting for Opponent Stream Overlay */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2.5 animate-pulse">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white mb-0.5">{opponentName}</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {connectionState === 'connected'
                    ? 'Đang truyền dữ liệu hình ảnh & âm thanh...'
                    : connectionState
                    ? `Đang kết nối (${connectionState})...`
                    : 'Đang kết nối camera & micro của đối thủ...'}
                </p>
              </div>
            )}

            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-slate-200">
              {opponentName}
            </div>

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-2 right-2 w-24 sm:w-28 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-amber-500/50 shadow-lg">
              <video
                ref={localVideoRef}
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
        /* Camera Preview before calling */
        <div className="space-y-3">
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-emerald-500/50 shadow-inner">
            <video
              ref={localVideoRef}
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
