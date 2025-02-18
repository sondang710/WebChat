import React, { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase"; // Firebase setup của bạn
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

// Đây là component VideoCall sử dụng WebRTC và Firebase
const VideoCall = ({ user, currentUser, onEndCall }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [callId, setCallId] = useState(null); // ID của cuộc gọi
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  // Cấu hình WebRTC
  const iceServers = [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "turn:YOUR_TURN_SERVER_URL",
      username: "YOUR_TURN_SERVER_USERNAME",
      credential: "YOUR_TURN_SERVER_CREDENTIAL",
    },
  ];

  // 1. Bắt đầu cuộc gọi
  const handleStartCall = async () => {
    setIsCalling(true);
    
    // Khởi tạo peer connection với cấu hình STUN/TURN servers
    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = peerConnection;

    // Lấy stream video của người dùng
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    // Thêm tracks vào peer connection
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    // Tạo offer và lưu vào Firestore
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const callRef = doc(db, "calls", currentUser.id + "-" + user.id);
    setCallId(callRef.id);

    await setDoc(callRef, {
      offer: offer,
      from: currentUser.id,
      to: user.id,
      status: "calling", // Trạng thái cuộc gọi (calling, answered)
    });

    // Lắng nghe ICE candidates từ WebRTC
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(callRef, {
          iceCandidates: event.candidate,
        });
      }
    };

    // Lắng nghe stream từ người nhận
    peerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };
  };

  // 2. Chấp nhận cuộc gọi
  const handleAcceptCall = async () => {
    const callRef = doc(db, "calls", callId);

    // Lắng nghe offer từ Firebase Firestore
    const unsubscribe = onSnapshot(callRef, async (docSnapshot) => {
      const data = docSnapshot.data();
      if (data && data.offer) {
        const offer = data.offer;

        const peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = peerConnection;

        // Lấy stream video của người nhận
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;

        // Thêm tracks vào peer connection
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        // Cung cấp answer và gửi về Firestore
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Cập nhật answer vào Firestore
        await updateDoc(callRef, {
          answer: answer,
          status: "answered",
        });

        // Lắng nghe ICE candidates từ WebRTC
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            updateDoc(callRef, {
              iceCandidates: event.candidate,
            });
          }
        };

        // Lắng nghe stream từ người gọi
        peerConnection.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        };

        unsubscribe();
      }
    });
  };

  // 3. Kết thúc cuộc gọi
  const handleEndCall = async () => {
    const callRef = doc(db, "calls", callId);

    // Đóng kết nối WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Cập nhật trạng thái cuộc gọi
    await updateDoc(callRef, {
      status: "ended",
    });

    setIsCalling(false);
    onEndCall(); // Đóng cửa sổ cuộc gọi
  };

  // Lắng nghe ICE candidates từ Firebase Firestore
  useEffect(() => {
    if (callId) {
      const callRef = doc(db, "calls", callId);

      const unsubscribe = onSnapshot(callRef, async (docSnapshot) => {
        const data = docSnapshot.data();
        if (data && data.iceCandidates && peerConnectionRef.current) {
          const candidate = new RTCIceCandidate(data.iceCandidates);
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
      });

      return () => unsubscribe();
    }
  }, [callId]);

  return (
    <div className="video-call">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted></video>
        <video ref={remoteVideoRef} autoPlay></video>
      </div>
      {!isCalling ? (
        <button onClick={handleStartCall}>Start Call</button>
      ) : (
        <button onClick={handleEndCall}>End Call</button>
      )}
      {isCalling && !callId && (
        <button onClick={handleAcceptCall}>Accept Call</button>
      )}
    </div>
  );
};

export default VideoCall;