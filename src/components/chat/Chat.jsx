import { useEffect,useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { arrayUnion, updateDoc, getDoc, doc, onSnapshot } from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import  upload  from "../../lib/upload";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import VideoCall from "../VideoCall/VideoCall";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Chat = () => {
    const [isRecording, setIsRecording] = useState(false);  // Trạng thái ghi âm
    const [audioUrl, setAudioUrl] = useState(null);  // Lưu trữ URL âm thanh đã ghi
    const [audioBlob, setAudioBlob] = useState(null);  // Lưu trữ dữ liệu âm thanh
    const audioRef = useRef(null);  // Ref lưu stream audio
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(null);
    const videoRef = useRef(null);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [chat,setChat] = useState(false);
    const [open,setOpen] = useState(false);
    const [text, setText] = useState("");
    const [sharedPhotos, setSharedPhotos] = useState(false);
    const [img, setImg] = useState({
        file: null,
        url: "",
    });

    const {currentUser} = useUserStore();
    const {chatId, user, isCurrentUserBlocked, isReceiverBlocked} = useChatStore();

    const endRef = useRef(null);

    useEffect(() => {
    endRef.current?.scrollIntoView({behavior: "smooth"});
    },[chat?.messages]);

    useEffect (() => {
        const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
            const chatData = res.data();
            setChat(chatData);
            
        });
        return () => {
            unSub();
        };
    }, [chatId]);

    const handleEmoji = (e) => {
        setText((prev) => prev + e.emoji);
        setOpen(false);
    };

    const handleImg = e => {
        if (img.url) {
            URL.revokeObjectURL(img.url);
        }
        if(e.target.files[0]) {
            const file = e.target.files[0];
            setImg({
                file,
                url: URL.createObjectURL(file),
            })
        }
        
};

    const handleSend = async () => {
        if (!text && !img.url && !audioBlob && !photoUrl) return;

        

        try {
            let imgUrl = null;
            let audioUrl = null; 


            if (audioBlob) {
                const audioRefStorage = ref(storage, `audioMessages/${Date.now()}.wav`);
                await uploadBytes(audioRefStorage, audioBlob);
                audioUrl = await getDownloadURL(audioRefStorage);
              }

            if (img.file) {
                const imageRef = ref(storage, `images/${Date.now()}-${img.file.name}`);
                const snapshot = await uploadBytes(imageRef, img.file);
                imgUrl = await getDownloadURL(snapshot.ref);
            }
            if (photoUrl) {
                const photoRef = ref(storage, `photos/${Date.now()}.png`);
                await uploadBytes(photoRef, photoUrl);  // Upload ảnh chụp
                imgUrl = await getDownloadURL(photoRef); // Lấy URL của ảnh đã upload
            }

            const newMessage = {
                senderId: currentUser.id,
                createAt: Date(),
            }
            if (text.trim()) {
                newMessage.text = text; // Nếu có văn bản
              }
          
              if (imgUrl) {
                newMessage.img = imgUrl; // Nếu có ảnh
              }
          
              if (audioUrl) {
                newMessage.audioUrl = audioUrl; // Nếu có âm thanh
              }
            await updateDoc(doc(db, "chats", chatId), {
                messages: arrayUnion(newMessage),
            });

            if (imgUrl) {
                setSharedPhotos((prev) => [...prev, imgUrl]);
              }

            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: text || (audioUrl ? "Sent a voice message" : "Sent an image"),
            });

            const userIDs = [currentUser.id, user.id];

            userIDs.forEach(async (id) => { 
            const userChatsRef = doc(db, "userchats", id)
            const userChatsSnapshot = await getDoc(userChatsRef)

            if (userChatsSnapshot.exists()) {
                const userChatsData = userChatsSnapshot.data();
                const chatIndex = userChatsData.chats.findIndex(c => c.chatId === chatId);

                userChatsData.chats[chatIndex].lastMessage = text;
                userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
                userChatsData.chats[chatIndex].updateAt = Date.now();

                await updateDoc(userChatsRef, { 
                    chats: userChatsData.chats, 
                });
            }
        });
        } catch (err) {
            console.error(err);
        }

        


        setImg({
            file: null,
            url: "",
        });

        setText("");
        setPhotoUrl(null);
        setAudioBlob(null);
        setAudioUrl(null);
    };

    const openCamera = async () => {
        if (isCameraOpen) {
            // Nếu camera đang mở, tắt camera
            setIsCameraOpen(false);
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop()); // Dừng tất cả các track video
            videoRef.current.srcObject = null;
        } else {
            // Nếu camera chưa mở, mở camera
            setIsCameraOpen(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
            });
            videoRef.current.srcObject = stream;
        }
      };
    
      // Chụp ảnh
      const capturePhoto = () => {
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          setPhotoUrl(blob); // Lưu ảnh dưới dạng blob
          setIsCameraOpen(false); // Tắt camera sau khi chụp
        }, "image/png");
      };

    const handleVideoCall = () => {
        setShowVideoCall(true);
    };
    const handleEndCall = () => {
        setShowVideoCall(false);
    }

    const downloadPhoto = () => {
        if (!photoUrl) return;
        
        // Tạo một URL tạm thời cho ảnh
        const downloadUrl = URL.createObjectURL(photoUrl);
        
        // Tạo thẻ <a> để tải ảnh về
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `captured-photo-${Date.now()}.png`;  // Đặt tên file ảnh
        a.click();  // Thực hiện thao tác tải xuống
    
        // Giải phóng URL tạm thời
        URL.revokeObjectURL(downloadUrl);
    }; 

    const startRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
      
          const mediaRecorder = new MediaRecorder(stream);
          audioRef.current = mediaRecorder;  // Lưu mediaRecorder vào ref
          const audioChunks = [];
      
          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
          };
      
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            setAudioBlob(audioBlob);
            setAudioUrl(URL.createObjectURL(audioBlob));  // Tạo URL cho file âm thanh
          };
      
          mediaRecorder.start();
          setIsRecording(true);
        } catch (err) {
          console.error("Error accessing microphone", err);
        }
      };
      
      const stopRecording = () => {
        if (audioRef.current) {
          audioRef.current.stop();
          setIsRecording(false);
        }
      };

      const handleSendAudio = async () => {
        if (!audioBlob) return;
      
        try {
          // Upload audio to Firebase storage
          const audioRefStorage = ref(storage, `audioMessages/${Date.now()}.wav`);
          await uploadBytes(audioRefStorage, audioBlob);
          const audioUrl = await getDownloadURL(audioRefStorage);
      
          // Gửi âm thanh qua chat
          await updateDoc(doc(db, "chats", chatId), {
            messages: arrayUnion({
              senderId: currentUser.id,
              audioUrl,
              createdAt: new Date(),
            }),
          });
      
          // Cập nhật tin nhắn cuối cùng
          await updateDoc(doc(db, "chats", chatId), {
            lastMessage: "Sent a voice message",
          });
      
          // Reset state
          setAudioBlob(null);
          setAudioUrl(null);
        } catch (err) {
          console.error("Error sending audio message", err);
        }
      };


  return (
  <div className="chat">
    <div className="top">
        <div className="user">
            <img src={user?.avatar || "./avatar.png"} alt="" />
            <div className="texts">
                <span>{user?.username}</span>
                <p>Chat cùng nhau nhé </p>
            </div>
        </div>
        <div className="icons">
            <img src="./phone.png" alt="" />
            <img src="./video.png" alt="" onClick={handleVideoCall}/>
            {showVideoCall && <VideoCall 
                user={user}
                currentUser={currentUser}
                onEndCall={handleEndCall}
            />}
            <img src="./info.png" alt="" />
        </div>
    </div>


    <div className="center">
    { chat?.messages?.map((message) =>(
    <div className={message.senderId === currentUser?.id ? "message own" : "message"} key = {message?.createAt}>
        <div className="texts">
            {message.img && <img src = {message.img} alt="" />}
            {message.audioUrl && (
                <div className="audio-message">
                    <audio controls>
                        <source src= {message.audioUrl} type="audio/wav"/>
                    </audio>
                </div>
            )}
            {message.text && <p>{message.text}</p>}
            {/* <span>1 min ago</span> */}
        </div>
    </div>
    ))}
    {(img.url || photoUrl) && (
        <div className="message own">
        <div className="texts">
            {/* Kiểm tra nếu img.url tồn tại, chỉ hiển thị img.url */}
            {img.url && <img src={img.url} alt="Uploaded" />}
            
            {/* Kiểm tra nếu photoUrl tồn tại, chỉ hiển thị ảnh đã chụp */}
            {photoUrl && <img src={URL.createObjectURL(photoUrl)} alt="Captured" />}
        </div>
    </div>)}
    <div ref={endRef}></div>
    </div>

    <div className="bottom">
        <div className="icons">
        <label htmlFor="file">
            <img src="./img.png" alt="" />
        </label>
            <input type="file" id= "file" style= {{display: "none"}} onChange={handleImg}/>
            <img src="./camera.png" alt="" onClick={openCamera}/>
            {isCameraOpen && (
            <div className="camera-container">
                <div className="camera-control">
                    <video ref={videoRef} autoPlay></video>
                    <button onClick={capturePhoto}><img src="./camera.png" alt="" /></button>
                </div>
            </div>
        )}

        {audioUrl && (
            <div className="audio-preview">
            <audio controls src={audioUrl}></audio>
        </div>
        )}
        <img src="./mic.png" alt="" onClick={() => {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }}/>
        </div>
        
        <input type="text" placeholder={(isCurrentUserBlocked || isReceiverBlocked) ? "You cannot send a message" : "Type a message..."} onChange={(e) => setText(e.target.value)} value={text}/>
        <div className="emoji">
            <img src="./emoji.png" alt="" onClick={()=> setOpen(prev => !prev)}/>
            <div className="picker"><EmojiPicker open={open} onEmojiClick={handleEmoji}/>
            </div>
        </div>
        
      {/* Hiển thị ảnh đã chụp */}
      {photoUrl && (
        <div className="captured-photo">
          <button onClick={downloadPhoto}><img src="download.png" alt="" /></button>
        </div>
      )}
        <button className="sendButton" onClick={isRecording ? null : handleSend} disabled= {isCurrentUserBlocked || isReceiverBlocked}>{isRecording ? "Recording..." : "Send"}</button>
    
      </div>
  </div>
  
  );
};

export default Chat;
