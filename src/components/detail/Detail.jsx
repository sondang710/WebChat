import "./detail.css";
import { auth} from "../../lib/firebase";
import { doc, arrayUnion, updateDoc, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useState, useEffect } from "react";
const Detail = () => {
    const {chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock} = useChatStore();
    const {currentUser} = useUserStore();
    const [sharedPhotos, setSharedPhotos] = useState([]);
    const [isPhotoListVisible, setIsPhotoListVisible] = useState(true);

    
    useEffect(() => {
        if (!chatId) return;
      
        const chatDocRef = doc(db, "chats", chatId); // Lấy chat từ Firestore
        const unsubscribe = onSnapshot(chatDocRef, (snapshot) => {
          const chatData = snapshot.data();
          if (chatData?.messages) {
            const photos = chatData.messages
              .filter((msg) => msg.img) // Chỉ lấy các tin nhắn có ảnh
              .map((msg) => msg.img, // URL ảnh
              );
            setSharedPhotos(photos); // Lưu ảnh vào state
          }
        });
      
        return () => unsubscribe(); // Cleanup subscription
      }, [chatId]);

      const togglePhotoList = () => {
        setIsPhotoListVisible((prev) => !prev); // Đảo trạng thái hiển thị danh sách ảnh
      };


    const handleBlock = async () => {
        if (!user) return;

        const userDocRef = doc(db, "users", currentUser.id)

        try { 
            const newBlockedState = isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id);
            await updateDoc(userDocRef, {
                blocked: newBlockedState,
            });
            changeBlock();
            
        } catch (err) {
            console.error(err);
        }
    };
  return (<div className="detail">
    <div className="user">
        <img src={user?.avatar || "./avatar.png"} alt="" />
        <h2>{user?.username}</h2>
    </div>
    <div className="info">
        <div className="option">
            <div className="title">
                <div className="span">Shared Photos</div>
                <img src={isPhotoListVisible ? "./arrowUp.png":"./arrowDown.png"} alt="" onClick={togglePhotoList}/>
            </div>

            {isPhotoListVisible && (
            <div className={`photos ${isPhotoListVisible ? "" : "hidden"}`}>
                {/* Hiển thị danh sách ảnh */}
                {sharedPhotos.map((photoUrl, index) => (
            <div className="photoItem" key={index}>
              <div className="photoDetail">
                <img src={photoUrl} alt={`Shared ${index}`} />
              </div>
            </div>
          ))}
            </div>
        )}
        </div>
        <div className="option">
            <div className="title">
                <div className="span">Shared Files</div>
                <img src="./arrowUp.png" alt="" />
            </div>
        </div>
        <button onClick={handleBlock}>
            {isCurrentUserBlocked ? "You are blocked" : isReceiverBlocked? "User blocked" : "Block User"}
        </button>
        <button className="logout" onClick={() => auth.signOut()}>Log Out</button>
    </div>
  </div>
  );
};

export default Detail;
