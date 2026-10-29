'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Camera,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  roomCode: string;
  isHost: boolean;
  opponentName: string;
}

// Multi-server STUN + TURN relay for NAT traversal over Cloudflare Tunnels & Mobile 4G/Wi-Fi
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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

export const VideoCall: React.FC<VideoCallProps> = ({
  socket,
  roomCode,
  isHost,
  opponentName,
}) => {
  // Local media enabled
  const [localActive, setLocalActive] = useState(false);
  // Opponent video readiness signaled over socket
  const [opponentReady, setOpponentReady] = useState(false);
  // WebRTC connected state
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  // Keep refs in sync for socket callbacks
  const localActiveRef = useRef(false);
  const opponentReadyRef = useRef(false);
  useEffect(() => {
    localActiveRef.current = localActive;
  }, [localActive]);
  useEffect(() => {
    opponentReadyRef.current = opponentReady;
  }, [opponentReady]);

  // Sync local stream to local video element
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.muted = true; // Always muted locally to prevent echo
      el.play().catch(() => {});
    }
  }, [localStream, localActive]);

  // Sync remote stream to remote video & audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current
          .play()
          .then(() => setAudioBlocked(false))
          .catch((e) => {
            console.warn('Remote video autoplay blocked:', e);
            setAudioBlocked(true);
          });
      }

      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current
          .play()
          .catch(() => {});
      }
    }
  }, [remoteStream]);

  // Teardown Peer Connection safely
  const closePeerConnection = useCallback(() => {
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
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    setRemoteStream(null);
    setConnectionStatus('');
  }, []);

  // Teardown everything (local stream + peer connection)
  const stopAllMedia = useCallback(() => {
    closePeerConnection();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setLocalActive(false);
    setAudioBlocked(false);

    if (socket) {
      socket.emit('webrtc-video-disabled', { roomCode });
    }
  }, [socket, roomCode, closePeerConnection]);

  // Start local camera + microphone
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current?.active) {
      return localStreamRef.current;
    }

    setErrorMsg(null);
    let stream: MediaStream;

    try {
      // First try requesting video and audio with clear noise suppression
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
        console.warn('Audio+Video failed, falling back to video-only');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (err: any) {
        let msg = 'Không thể mở Camera/Micro: Vui lòng cho phép quyền truy cập thiết bị.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Bạn đã chặn quyền Camera/Micro. Hãy bấm biểu tượng ổ khóa cạnh thanh địa chỉ để mở khóa.';
        } else if (err.name === 'NotFoundError') {
          msg = 'Không tìm thấy thiết bị Camera/Micro trên máy tính.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Camera/Micro đang bị ứng dụng khác chiếm giữ (Zoom, Teams...).';
        }
        setErrorMsg(msg);
        throw err;
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setLocalActive(true);
    setMicEnabled(true);
    setVideoEnabled(true);
    return stream;
  }, []);

  // Flush queued candidates
  const drainCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const list = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const c of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn('ICE Candidate add error:', e);
      }
    }
  }, []);

  // Create RTCPeerConnection and attach tracks & event listeners
  const initPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      closePeerConnection();

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peerConnRef.current = pc;
      pendingCandidatesRef.current = [];
      remoteDescSetRef.current = false;
      remoteStreamRef.current = new MediaStream();

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote tracks (audio & video)
      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        // Force fresh MediaStream reference so React state updates and video/audio plays
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

      // Connection state tracking
      pc.onconnectionstatechange = () => {
        setConnectionStatus(pc.connectionState);
        if (pc.connectionState === 'connected') {
          setErrorMsg(null);
        } else if (pc.connectionState === 'failed') {
          setErrorMsg('Kết nối WebRTC bị gián đoạn. Đang kết nối lại qua Relay...');
        }
      };

      return pc;
    },
    [socket, roomCode, closePeerConnection]
  );

  // Host initiates WebRTC Offer
  const startNegotiationAsHost = useCallback(async () => {
    try {
      const stream = localStreamRef.current || (await acquireMedia());
      const pc = initPeerConnection(stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      socket?.emit('webrtc-offer', { roomCode, offer });
    } catch (err: any) {
      console.error('Error in startNegotiationAsHost:', err);
    }
  }, [acquireMedia, initPeerConnection, socket, roomCode]);

  // Turn On Video & Mic Button Click
  const handleEnableVideo = useCallback(async () => {
    try {
      setErrorMsg(null);
      await acquireMedia();
      socket?.emit('webrtc-video-ready', { roomCode });

      // If opponent is already ready and we are the host, kick off negotiation!
      if (opponentReadyRef.current && isHost) {
        setTimeout(() => {
          startNegotiationAsHost();
        }, 200);
      }
    } catch (err) {
      console.error('Failed to enable video:', err);
    }
  }, [acquireMedia, socket, roomCode, isHost, startNegotiationAsHost]);

  // Socket signaling listener
  useEffect(() => {
    if (!socket) return;

    // 1. Opponent became ready with video
    const handleOpponentReady = () => {
      setOpponentReady(true);
      // If we already have our local video active:
      if (localActiveRef.current) {
        if (isHost) {
          // Host initiates the offer
          startNegotiationAsHost();
        } else {
          // Guest notifies host that we are ready
          socket.emit('webrtc-video-ready', { roomCode });
        }
      }
    };

    // 2. Opponent disabled video
    const handleOpponentDisabled = () => {
      setOpponentReady(false);
      closePeerConnection();
    };

    // 3. Receive WebRTC Offer (usually Guest receiving from Host)
    const handleOfferReceived = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        setOpponentReady(true);
        const stream = localStreamRef.current || (await acquireMedia());
        const pc = initPeerConnection(stream);

        if (pc.signalingState !== 'stable') {
          console.warn('Offer received in non-stable state, rolling back:', pc.signalingState);
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' } as any),
            pc.setRemoteDescription(new RTCSessionDescription(offer)),
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        }

        remoteDescSetRef.current = true;
        await drainCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', { roomCode, answer });
      } catch (err: any) {
        console.error('Error handling offer:', err);
        setErrorMsg('Lỗi đàm phán cuộc gọi: ' + (err.message || 'Thiết bị bận'));
      }
    };

    // 4. Receive WebRTC Answer (Host receiving from Guest)
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
        await drainCandidates(pc);
      } catch (err: any) {
        console.error('Error handling answer:', err);
      }
    };

    // 5. Receive ICE Candidates
    const handleCandidateReceived = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      const pc = peerConnRef.current;
      if (!pc || !remoteDescSetRef.current) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Error adding ICE candidate:', e);
      }
    };

    // 6. Call ended
    const handleCallEnded = () => {
      closePeerConnection();
      setOpponentReady(false);
    };

    socket.on('webrtc-video-ready', handleOpponentReady);
    socket.on('webrtc-video-disabled', handleOpponentDisabled);
    socket.on('webrtc-offer-received', handleOfferReceived);
    socket.on('webrtc-answer-received', handleAnswerReceived);
    socket.on('webrtc-ice-candidate-received', handleCandidateReceived);
    socket.on('webrtc-call-ended', handleCallEnded);

    return () => {
      socket.off('webrtc-video-ready', handleOpponentReady);
      socket.off('webrtc-video-disabled', handleOpponentDisabled);
      socket.off('webrtc-offer-received', handleOfferReceived);
      socket.off('webrtc-answer-received', handleAnswerReceived);
      socket.off('webrtc-ice-candidate-received', handleCandidateReceived);
      socket.off('webrtc-call-ended', handleCallEnded);
    };
  }, [
    socket,
    roomCode,
    isHost,
    acquireMedia,
    initPeerConnection,
    closePeerConnection,
    drainCandidates,
    startNegotiationAsHost,
  ]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  // Toggle mic track
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video track
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

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="bg-[#121824]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Hidden dedicated audio element for guaranteed audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? 'bg-emerald-500 animate-pulse'
                : localActive && opponentReady
                ? 'bg-amber-400 animate-ping'
                : localActive
                ? 'bg-sky-400 animate-pulse'
                : 'bg-slate-600'
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-200">Video & Micro Trực Tiếp</h3>
          {isConnected ? (
            <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">
              Đã kết nối
            </span>
          ) : localActive && opponentReady ? (
            <span className="text-[10px] text-amber-400 font-medium">Đang đàm phán...</span>
          ) : localActive ? (
            <span className="text-[10px] text-sky-400 font-medium">Chờ đối thủ...</span>
          ) : null}
        </div>

        {/* Action Button: Enable Video or Stop */}
        {!localActive ? (
          <button
            type="button"
            onClick={handleEnableVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Bật Video & Mic</span>
          </button>
        ) : (
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
              onClick={stopAllMedia}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow transition active:scale-95"
            >
              <PhoneOff className="w-3 h-3" />
              <span>Tắt</span>
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

      {/* Autoplay Audio Blocked Banner */}
      {audioBlocked && (
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

      {/* Video Screens Area */}
      {localActive ? (
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
          {/* Main Display: Remote Video (Opponent) if available, otherwise waiting overlay */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              remoteStream ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Waiting for Opponent Overlay */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-2.5 animate-pulse">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white mb-0.5">{opponentName}</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {opponentReady
                  ? 'Đối thủ đã bật camera. Đang thiết lập đường truyền...'
                  : 'Đang chờ đối thủ bấm "Bật Video & Mic"...'}
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

          {/* Local Video Picture-in-Picture (Always visible in bottom-right corner) */}
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
          <p className="text-xs text-slate-300 font-medium mb-1">
            Chưa bật Camera & Micro
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3">
            Bấm nút bên dưới để trò chuyện trực tiếp qua webcam và micro với đối thủ.
          </p>
          <button
            type="button"
            onClick={handleEnableVideo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Bật Video & Mic ngay</span>
          </button>
        </div>
      )}
    </div>
  );
};
