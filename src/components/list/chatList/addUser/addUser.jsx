import "./adduser.css";
import { db } from "../../../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";
const AddUser = () => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();
  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));

      const querySnapShot = await getDocs(q);
      if (!querySnapShot.empty) {
        const userDoc = querySnapShot.docs[0];
        const userData = userDoc.data();
        userData.id = userDoc.id; // Lấy id từ tài liệu Firestore
        setUser(userData);
      } else {
        setUser(null);
        toast.error("Tài khoản không tồn tại!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async () => {
    const chatRef = collection(db, "chats");
    const userChatsRef = collection(db, "userchats");

    try {
      
      const newChatRef = doc(chatRef)
      await setDoc(newChatRef, {
        createAt: serverTimestamp(),
        messages: [],
      });

      const receiverChatDocRef = doc(userChatsRef, user.id);
      await updateDoc(receiverChatDocRef, {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: " ",
          receiverId: currentUser.id,
          updateAt: Date.now(),
        }),
      });

      const currentUserChatDocRef = doc(userChatsRef, currentUser.id);
      await updateDoc(currentUserChatDocRef, {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: " ",
          receiverId: user.id,
          updateAt: Date.now(),
        }),
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Search</button>
      </form>
      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd}>Add User</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
