'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  Camera,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { sounds } from '@/lib/sound';

interface VideoCallProps {
  socket: Socket | null;
  roomCode: string;
  isHost: boolean;
  opponentName: string;
}

// Multi-server STUN + TURN relay for NAT traversal over Cloudflare Tunnels, NAT firewalls & 4G/Wi-Fi
const ICE_CONFIG: RTCConfiguration = {
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
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  // Queue ICE candidates received before remote description is set
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const callStateRef = useRef<CallState>('idle');
  const isAcquiringMediaRef = useRef<Promise<MediaStream> | null>(null);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Synchronize local preview stream to video element
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.muted = true; // Always muted locally to prevent feedback echo
      el.play().catch(() => {});
    }
  }, [localStream, callState]);

  // Synchronize remote stream to remote video and audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current
          .play()
          .then(() => setAudioBlocked(false))
          .catch((e) => {
            console.warn('Remote video play blocked:', e);
            setAudioBlocked(true);
          });
      }

      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current
          .play()
          .then(() => setAudioBlocked(false))
          .catch(() => {});
      }
    }
  }, [remoteStream, callState]);

  // Clean up all media tracks, peer connection, and reset state
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
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    isAcquiringMediaRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('');
    setCallState('idle');
    setAudioBlocked(false);
    setMicEnabled(true);
    setVideoEnabled(true);
  }, []);

  // Request camera and microphone access with sensible fallback
  const startMedia = useCallback(async (): Promise<MediaStream> => {
    if (
      localStreamRef.current &&
      localStreamRef.current.active &&
      localStreamRef.current.getTracks().some((t) => t.readyState === 'live')
    ) {
      return localStreamRef.current;
    }

    if (isAcquiringMediaRef.current) {
      return isAcquiringMediaRef.current;
    }

    const acquirePromise = (async () => {
      setErrorMsg(null);
      let stream: MediaStream;

      try {
        // First try audio + video with echo cancellation
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
          console.warn('Audio/Video combo failed, falling back to video only');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
            audio: false,
          });
        } catch {
          try {
            console.warn('Video failed, falling back to audio only');
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
          } catch (err: any) {
            let msg = 'Không thể mở Camera/Micro: Vui lòng cho phép quyền truy cập thiết bị.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              msg =
                'Bạn đã chặn quyền Camera/Micro. Hãy bấm biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép.';
            } else if (err.name === 'NotFoundError') {
              msg = 'Không tìm thấy thiết bị Camera hoặc Micro trên máy tính này.';
            } else if (err.name === 'NotReadableError') {
              msg = 'Camera/Micro đang bị ứng dụng khác chiếm giữ (Zoom, Teams, Zalo...).';
            }
            setErrorMsg(msg);
            throw err;
          }
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }

      return stream;
    })();

    isAcquiringMediaRef.current = acquirePromise;
    try {
      return await acquirePromise;
    } finally {
      isAcquiringMediaRef.current = null;
    }
  }, []);

  // Flush queued candidates once remote description is set
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

  // Create RTCPeerConnection and wire tracks and listeners
  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      if (peerConnRef.current) {
        try {
          peerConnRef.current.ontrack = null;
          peerConnRef.current.onicecandidate = null;
          peerConnRef.current.onconnectionstatechange = null;
          peerConnRef.current.close();
        } catch {}
        peerConnRef.current = null;
      }

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peerConnRef.current = pc;
      remoteDescSetRef.current = false;

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, stream);
        } catch (e) {
          console.warn('Error adding track to peer connection:', e);
        }
      });

      // Handle incoming remote stream tracks
      pc.ontrack = (event) => {
        console.log('WebRTC ontrack received:', event.track.kind);
        let rStream = event.streams && event.streams[0] ? event.streams[0] : null;
        if (!rStream) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          remoteStreamRef.current.addTrack(event.track);
          rStream = remoteStreamRef.current;
        } else {
          remoteStreamRef.current = rStream;
        }

        setRemoteStream(rStream);

        // Immediate direct DOM assignment to avoid render delay
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== rStream) {
          remoteVideoRef.current.srcObject = rStream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current
            .play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true));
        }

        if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== rStream) {
          remoteAudioRef.current.srcObject = rStream;
          remoteAudioRef.current
            .play()
            .then(() => setAudioBlocked(false))
            .catch(() => {});
        }
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

      // Connection state tracking
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('PeerConnection state changed:', state);
        setConnectionState(state);
        if (state === 'connected') {
          setErrorMsg(null);
        } else if (state === 'failed') {
          setErrorMsg('Kết nối WebRTC bị gián đoạn. Đang kết nối lại qua Relay...');
        }
      };

      return pc;
    },
    [socket, roomCode]
  );

  // Set up socket signaling listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Callee receives incoming call request
    const handleIncomingCall = () => {
      if (callStateRef.current === 'connected') return;
      setCallState('ringing');
      try {
        sounds.playRing();
      } catch {}
    };

    // 2. Caller receives callee's acceptance -> starts media, creates offer
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
        console.error('Error starting negotiation after acceptance:', err);
        setErrorMsg('Không thể khởi tạo cuộc gọi: ' + (err.message || 'Lỗi thiết bị'));
        cleanupCall();
      }
    };

    // 3. Caller receives callee's decline
    const handleCallDeclined = () => {
      setErrorMsg(`${opponentName || 'Đối thủ'} đã từ chối cuộc gọi video.`);
      cleanupCall();
    };

    // 4. Callee receives WebRTC offer -> sets remote description, sends answer
    const handleOfferReceived = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        setCallState('connected');
        const stream = await startMedia();
        let pc = peerConnRef.current;
        if (!pc) {
          pc = createPeerConnection(stream);
        }

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

    // 5. Caller receives WebRTC answer -> sets remote description
    const handleAnswerReceived = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnRef.current;
        if (!pc) return;

        if (pc.signalingState !== 'have-local-offer') {
          console.warn('Ignoring duplicate/out-of-order answer because state is:', pc.signalingState);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSetRef.current = true;
        await drainPendingCandidates(pc);
      } catch (err: any) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    // 6. Receive ICE candidate
    const handleCandidateReceived = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      const pc = peerConnRef.current;
      if (!pc || !remoteDescSetRef.current || !pc.remoteDescription) {
        // Buffer candidate until remote description is set
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    };

    // 7. Call ended by peer
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
    opponentName,
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
      setCallState('calling');
      await startMedia();
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
      setCallState('connected');
      const stream = await startMedia();
      createPeerConnection(stream);
      socket?.emit('webrtc-call-accepted', { roomCode });
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      setErrorMsg('Không thể mở Camera/Mic để nghe: ' + (err.message || 'Lỗi thiết bị'));
      cleanupCall();
    }
  }, [socket, roomCode, startMedia, createPeerConnection, cleanupCall]);

  // User B declines incoming call
  const declineCall = useCallback(() => {
    socket?.emit('webrtc-call-declined', { roomCode });
    cleanupCall();
  }, [socket, roomCode, cleanupCall]);

  // Either user hangs up
  const endCall = useCallback(() => {
    socket?.emit('webrtc-end-call', { roomCode });
    cleanupCall();
  }, [socket, roomCode, cleanupCall]);

  // Toggle microphone track
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle camera track
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Unlock browser audio autoplay if blocked
  const handleUnlockAudio = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }
    setAudioBlocked(false);
  }, []);

  const inCall = callState === 'connected';

  return (
    <div className="bg-[#121824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Hidden dedicated audio element for guaranteed audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              inCall && connectionState === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : inCall
                ? 'bg-amber-400 animate-pulse'
                : callState === 'calling' || callState === 'ringing'
                ? 'bg-sky-400 animate-ping'
                : 'bg-slate-600'
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-200">Video Call Trực Tiếp</h3>
          {inCall && (
            <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
              {connectionState === 'connected' ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          )}
        </div>

        {/* Action Button: Call Opponent */}
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

        {/* Controls when in Call */}
        {inCall && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`p-1.5 rounded-lg border transition ${
                micEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-rose-600/20 border-rose-500/40 text-rose-400'
              }`}
              title={micEnabled ? 'Tắt mic' : 'Bật mic'}
            >
              {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`p-1.5 rounded-lg border transition ${
                videoEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-rose-600/20 border-rose-500/40 text-rose-400'
              }`}
              title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={endCall}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition active:scale-95"
            >
              <PhoneOff className="w-3 h-3" />
              <span>Kết thúc</span>
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

      {/* Outgoing Call Alert (Calling) */}
      {callState === 'calling' && (
        <div className="mb-3 p-3 bg-sky-500/15 border border-sky-500/40 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <PhoneForwarded className="w-5 h-5 text-sky-400 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-sky-300">Đang gọi cho {opponentName}...</p>
              <p className="text-[11px] text-slate-300">Đang chờ đối thủ nhận cuộc gọi</p>
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
        <div className="mb-3 p-3.5 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5 text-amber-400 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-amber-300">{opponentName}</p>
              <p className="text-[11px] text-slate-200">Đang gọi video cho bạn...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={acceptCall}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95"
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
        <div className="mb-3 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <VolumeX className="w-4 h-4 text-amber-400" />
            <span>Trình duyệt đang chặn âm thanh. Bấm để nghe đối thủ:</span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Bật tiếng</span>
          </button>
        </div>
      )}

      {/* Video Screens View */}
      {inCall || callState === 'calling' || localStream ? (
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
          {/* Main Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              remoteStream ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Waiting Overlay when in call/calling and remote stream hasn't arrived yet */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-2.5 animate-pulse">
                {callState === 'calling' ? (
                  <PhoneForwarded className="w-6 h-6" />
                ) : (
                  <Users className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-bold text-white mb-0.5">{opponentName}</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {callState === 'calling'
                  ? 'Đang đổ chuông... Đang chờ đối thủ bấm Nghe máy'
                  : connectionState === 'connected'
                  ? 'Đang truyền dữ liệu hình ảnh & âm thanh...'
                  : connectionState
                  ? `Đang kết nối (${connectionState})...`
                  : 'Đang kết nối camera & micro của đối thủ...'}
              </p>
            </div>
          )}

          {/* Opponent Name Tag */}
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-slate-200 flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                remoteStream ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span>{opponentName}</span>
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
      ) : (
        /* Video Inactive State */
        <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
          <Camera className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-300 font-medium mb-1">Video & Micro Trực Tiếp</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3">
            Bấm nút &ldquo;Gọi video&rdquo; để gọi trực tiếp qua webcam và micro với đối thủ.
          </p>
          <button
            type="button"
            onClick={startCall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Gọi video ngay</span>
          </button>
        </div>
      )}
    </div>
  );
};
