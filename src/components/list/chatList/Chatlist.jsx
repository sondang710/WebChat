import { useState } from "react";
import "./chatList.css";
import AddUser from './addUser/addUser';
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUserStore } from "../../../lib/userStore";
import { useEffect } from "react";
import { useChatStore } from "../../../lib/chatStore";
const Chatlist = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");

  const { currentUser } = useUserStore();
  const { chatId, changeChat } = useChatStore();


  useEffect(() => {
    if (!currentUser?.id) {
      console.warn("Current user or user ID is undefined");
      return;
    }
    const unSub = onSnapshot(
      doc(db, "userchats", currentUser.id),
      async (res) => {
        const items = res.data()?.chats || [];
        const promises = items.map(async (item) => {
          const userDocRef = doc(db, "users", item.receiverId);
          const userDocSnap = await getDoc(userDocRef);
          const user = userDocSnap.data();
          return { ...item, user };
        });
        const chatData = await Promise.all(promises);
        setChats(chatData.sort((a, b) => b.updateAt - a.updateAt));
      }
    );
    return () => {
      unSub();
    };
  }, [currentUser?.id]);


  const handleSelect = async (chat) => {
    // Navigate to the chat page with the selected chat ID
    const userChats = chats.map(item => {
      const{user, ...rest} = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId
    );

    userChats[chatIndex].isSeen = true;

    const userChatsRef = doc(db,"userchats", currentUser.id);

    try {
      await updateDoc(userChatsRef, {
        chats: userChats,
      });
      changeChat(chat.chatId,chat.user);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredChats = chats.filter((c) => c.user.username.toLowerCase().includes(input.toLowerCase()));

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input type="text" placeholder="Search.." onChange={(e)=>setInput(e.target.value)}/>
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
        />
      </div>
      {Array.isArray(chats) &&
        filteredChats.map((chat) => (
          <div className="item" 
          key={chat.chatId}
          onClick={() => handleSelect(chat)}
          style = {{
            backgroundColor: chat?.isSeen ? "transparent" : "#5183f3",
          }}>
            <img src={chat.user.blocked.includes(currentUser.id) ? "./avatar.png" : chat.user.avatar || "./avatar.png"} alt="" />
            <div className="texts">
              <span>{chat.user.blocked.includes(currentUser.id) ? "Unknown User" : chat.user.username || "Unknown User"}</span>
              <p>{chat.lastMessage}</p>
              
            </div>
          </div>
        ))}

      {addMode && <AddUser />}
    </div>
  );
};

export default Chatlist;
