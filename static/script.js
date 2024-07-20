const socket = io({auth: {cookie: document.cookie}});
const myName = document.cookie.split(".")[1];
document.getElementById("myName").textContent = myName;
console.log(myName + " Wellkome");
const myId = document.cookie.split("=")[1].split(".")[0];
const pageBox = document.getElementById('contentBox');
const items = document.querySelectorAll('.panel_elm');
items.forEach(item => {
    item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

function copyID() {
    document.getElementById('idBox').addEventListener('click', function () {
        const textElement = document.getElementById('idBox');

        const tempInput = document.createElement('input');
        tempInput.value = textElement.innerText;
        document.body.appendChild(tempInput);

        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    });
}
renderPage("general");
function renderPage(render) {
    if (render == "general") {
        pageBox.innerHTML = `
            <div class="contentBox_elm">
                <div class="idBox" id="idBox" onclick="copyID()">Profile ID:${myId}</div>
                <div class="userData">
                    <img src="" alt="photo">
                    <div>
                        <div class="username" id="username">${myName}</div>
                        <div class="userStatus">status</div>
                    </div>

                </div>
                <div class="grace">Grace of the imperial crown: 0</div>
                <button id="editUserData" class="editUserData">Click to edit your profile data</button>
            </div>
            <div class="contentBox_elm rules">
                <h2>Rules of our organisation</h2>
                <ul>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                    <li>Очень много интересних правил ☻</li>
                </ul>
            </div>
        `;
        document.getElementById('editUserData').addEventListener('click', () => {
            console.log('Hello world');
        });
    } else if (render == "gc") {
        pageBox.innerHTML = `
            <form class="globalChat" id="globalChat-form"> 
                <div class="chat" id="chatField"></div>
                <div class="messagePanel">
                    <input type="text" name="" id="messageContainer-global" placeholder="Type message">
                    <input type="submit" value="Enter">
                </div>
            </form>
        `;
        socket.emit("servise_request");
        socket.off('all_messages').on('all_messages', msgArray => {
            msgArray.forEach(msg => {
                console.log(msg);
                createMsg(msg);
            });
        });

        socket.on("message",(msg) => {
            console.log(msg);
            createMsg(msg);
        });
        
        document.getElementById('globalChat-form').addEventListener("submit", event => {
            const input = document.getElementById("messageContainer-global");
            event.preventDefault();
            if (input.value) {
                socket.emit("new_message", input.value);
                createMsg({
                    username: myName,
                    content: input.value,
                    timestamp: Date.now()
                });
                input.value = "";
            }
        });
    } else if (render == "pc") {
        pageBox.innerHTML = `
             <div class="pChat">
                <div class="panelPChats" id="panelPChats">
                </div>
                <div class="panelPChats-elm" id="newPrivateChat">
                    <h3>Create private chat</h3>
                </div>
                <div class = "chat_MesPanel">
                    <div class="chat privateChat" id="chatField"></div>
                    <div class="messagePanel">
                        <input type="text" name="" id="messageContainer-global" placeholder="Type message">
                        <input type="button" value="Enter">
                    </div>
                </div>    
            </div>
        `;
        socket.emit("all_chats", (chats) => {
            console.log(chats);
            createPrivateChats(chats);
        })
       
        const newChat = document.getElementById('newPrivateChat').addEventListener('click', () => {
            let dialog = document.createElement("div");
            dialog.classList.add("dialog");
            dialog.innerHTML = `
            <form id="new_chat">
                <input 
                    id="id_for_analise"
                    class = "dialog_elm"
                    type="text"
                    pattern="[0-9]*"
                    placeholder="Enter ID of interlocutor">
                <input 
                    id="create_chat_btn"
                    class = "buttons dialog_elm"
                    type="submit"
                    value="Create Chat">
                <input 
                    id="back_btn"
                    class = "buttons dialog_elm"
                    type="button"
                    value="Go back">  
                <span id = "err"></span> 
            </form> 
            `;
            if (!document.getElementById("panelPChats").querySelector('.dialog')) document.getElementById("panelPChats").appendChild(dialog);

            const go_back = document.getElementById('back_btn');
            const chat_form = document.getElementById("new_chat");
            const span = document.getElementById("err");

            go_back.addEventListener("click",() => dialog.remove());
            chat_form?.addEventListener("submit", (event) => {
                event.preventDefault();
                span.innerHTML = null;

                let interlocutor_login = document.getElementById("id_for_analise");
                if(interlocutor_login.value){
                    console.log(interlocutor_login.value);
                    socket.emit("new_private_chat", interlocutor_login.value, (res) => {
                        console.log(res);
                        if (res.status){
                            span.innerHTML = res.status;
                            dialog.remove();
                            socket.emit("all_chats", (chats) => {
                                console.log(chats);
                                createPrivateChats(chats);
                            })
                        }
                    });
                }
                else span.innerHTML = "Missing data";
            });
        })
       
    } else if (render == "market") {

    } else if (render == "faq") {

    }
}

function createMsg(msg) {
    let item = document.createElement("li");
    item.classList.add("message");
    document.getElementById("chatField").appendChild(item);
    item.innerHTML = 
    `
        <div class = "name_img">
            <img src = "" alt = "p">
            <div class = "user_name">${msg.login || msg.username}</div>
        </div>
        <div class = "user_message">${msg.content}</div>
        <div class = "data">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    document.getElementById("chatField").scrollTop = document.getElementById("chatField").scrollHeight;
}

function createPrivateChats(data) {
    console.log(data.chats);
    let panel = document.getElementById("panelPChats");
    panel.innerHTML = '';

    for(let i = 0; i < data.chats.length; i++) {
        let reqID;
        if (data.chats[i].user1_id != myId) reqID = data.chats[i].user1_id;
        else if (data.chats[i].user2_id != myId) reqID = data.chats[i].user2_id;
        else reqID = myId;

        socket.emit("user_details", reqID, (obj) => {
            console.log(obj);
            const chatElement = document.createElement('div');
            chatElement.className = 'panelPChats-elm buttons privateChats-panel-elements privatesChats';
            chatElement.setAttribute('value', data.chats[i].chat_id);
            chatElement.innerHTML = `
                <img src="" alt="ph">
                <h4>${obj.details.login}</h4>
            `;
            panel.appendChild(chatElement);

            chatElement.addEventListener('click', (event) => {
                const clickedElement = event.target.closest('.privatesChats');
                const value = clickedElement.getAttribute('value');
                socket.emit("getPrivateMessages", value, (msg_obj) => {
                    let msg = msg_obj.messages;
                    if(msg.length == 0) document.getElementById("chatField").innerHTML = "No messages";
                    else {
                        document.getElementById("chatField").innerHTML = '';
                        msg.forEach(message => {
                            console.log(message);
                            createMsg(message);
                        });
                    }
                });
            });
        });
    }
}

socket.on("dissconect");
window.addEventListener('beforeunload', function(event) {
    socket.disconnect();
});