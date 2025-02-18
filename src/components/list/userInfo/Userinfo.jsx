import { useUserStore } from "../../../lib/userStore";
import "./userInfo.css";

const Userinfo = () => {
  const { currentUser } = useUserStore();
  return (
  <div className="userInfo">
    <div className="user">
        <img src={currentUser.avatar||"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7GysEC8-sMrUArBV7JsdHnowZC1-iJ4vFUA_ZGKk761Vokn8S8tvgFaUqCk0t56ScYQU&usqp=CAU"} alt="" />
        <h2>{currentUser.username}</h2>
    </div>
    <div className="icons">
        <img src="./more.png" alt=""/>
        <img src="./video.png" alt=""/>
        <img src="./edit.png" alt=""/>
    </div>


  </div>
  );
};

export default Userinfo;