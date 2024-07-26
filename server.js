const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const db = require("./database");
const cookie = require("cookie");
const database = require("./database");

const chatHtmlFile = fs.readFileSync(path.join(__dirname, "static", "main.html"));
const styleCssFile = fs.readFileSync(path.join(__dirname, "static", "style.css"));
const scriptJsFile = fs.readFileSync(path.join(__dirname, "static", "script.js"));
const loginHtmlFile = fs.readFileSync(path.join(__dirname, "static", "loginreg.html"));
const authJsFile = fs.readFileSync(path.join(__dirname, "static", "auth.js"));

const server = http.createServer((req, res) => {
    if (req.method === "GET") {
        switch (req.url) {
            case "/style.css": return res.end(styleCssFile);
            case "/loginreg": return res.end(loginHtmlFile);
            case "/auth.js": return res.end(authJsFile);
            case "/api/private_message": return handlePrivateMessage(req, res);
            case "/api/create_private_chat": return createPrivateChat(req, res);
            default: return guarded(req, res);
        }
    }
    if (req.method === "POST") {
        switch (req.url) {
            case "/api/register": return registerUser(req, res);
            case "/api/login": return login(req, res);
        }
    }

    return res.end("Error 404");
});

async function registerUser(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            if (!user.login || !user.password) {
                return res.end(JSON.stringify({
                    error: "Empty login or password"
                }));
            }
            if (await db.isUserExist(user.login)) {
                return res.end(JSON.stringify({
                    error: "User already exists"
                }));
            }
            await db.addUser(user);
            return res.end(JSON.stringify({
                res: "Registration is successful"
            }));
        } catch (error) {
            return res.end(JSON.stringify({
                error: error.toString()
            }));
        }
    });
}

async function handlePrivateMessage(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", async () => {
        try {
            const { senderId, receiverId, content } = JSON.parse(data);
            await db.addPrivateMessage(content, senderId, receiverId);
            return res.end(JSON.stringify({
                res: "Message sent"
            }));
        } catch (error) {
            return res.end(JSON.stringify({
                error: error.toString()
            }));
        }
    });
}

async function createPrivateChat(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", async () => {
        try {
            const { user1Id, user2Id } = JSON.parse(data);
            await db.createPrivateChat(user1Id, user2Id);
            return res.end(JSON.stringify({
                res: "Private chat created"
            }));
        } catch (error) {
            return res.end(JSON.stringify({
                error: error.toString()
            }));
        }
    });
}

let validateAuthToken = [];

async function login(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            const token = await db.getAuthToken(user);
            validateAuthToken.push(token);
            res.writeHead(200, {
                'Set-Cookie': cookie.serialize('token', token, { httpOnly: true })
            });
            res.end(JSON.stringify({
                token: token
            }));
        } catch (error) {
            res.writeHead(400);
            return res.end(JSON.stringify({
                error: error.toString()
            }));
        }
    });
}

server.listen(3000);

const io = new Server(server);

io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const creds = getCredentials(cookies.token);
    if (!creds) {
        next(new Error("No auth"));
    } else {
        socket.credentials = creds;
        next();
    }
});

function getCredentials(token = '') {
    if (!token || !validateAuthToken.includes(token)) return null;
    const [userId, login] = token.split(".");
    if (!userId || !login) return null;
    return { userId, login };
}

function guarded(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const creds = getCredentials(cookies.token);
    if (!creds) {
        res.writeHead(302, { "Location": "/loginreg" });
        return res.end();
    }
    if (req.method === "GET") {
        switch (req.url) {
            case "/": return res.end(chatHtmlFile);
            case "/script.js": return res.end(scriptJsFile);
        }
    }
}

io.on("connection", async (socket) => {
    const username = socket.credentials?.login;
    const userId = socket.credentials?.userId;
    console.log("A user " + username + " connected. Id - " + socket.id);
    await db.userLineStatus(1, userId);

    socket.on("my_data", async(callback) => {
        if (typeof callback === 'function'){
            let assets_data = await db.getUserDetails(userId);
            return callback(assets_data);
        }
    });

    //Глобал часть
    socket.on("servise_request", async() => {
        socket.emit("all_messages", await db.getMessages());
    });

    socket.on("new_message", async (message) => {
        await db.addMessage(message, userId);
        let obj = {
            username: username,
            content: message,
            userId: userId,
            timestamp: new Date().toISOString()
        };
        socket.broadcast.emit("message", obj);
    });

    //приват часть
    socket.on('new_private_chat', async (data, callback) => {
        if (typeof data !== 'number' || typeof callback !== 'function') return;
        if (await db.isUserExistByID(data)) {
            console.log(await db.isChatExistByUserIDs(data, userId));
            if (!await db.isChatExistByUserIDs(data, userId)){
                let newChat = await db.createPrivateChat(userId, data);
                console.log(newChat);
                return callback({ status: 200 });
            }
            else return callback({ status: 201 });
        }
        else return callback({ status: 404 });
    });

    socket.on("all_chats", async(callback) => {
        if (typeof callback !== 'function') return;
        let chats = await db.getAllPrivateChats(userId);
        return callback({chats});
    });

    socket.on("user_details", async(reqID, callback) => {
        if (typeof callback !== 'function' || typeof reqID !== 'number') return;
        let details = await db.getUserDetails(reqID)
        return callback({details});
    });

    socket.on("getPrivateMessages", async(chatId, callback) => {
        if (typeof callback !== 'function' || chatId === undefined) return;
        if (await db.isUserINChat(chatId,userId)) {
            let messages = await db.getPrivateMessage(chatId, userId);
            return callback({ data: messages })
        }
        return callback({ status: 403 });
    });

    socket.on("new_private_message", async(data) => {
        if (data.msg != undefined && data.chat_id != undefined) {
            if (await db.isUserINChat){
                await db.addPrivateMessage(data.msg, userId ,data.chat_id);
            }
        }
    });

    socket.on('disconnect', async () => {
        await db.userLineStatus(0, userId);
        console.log("User " + username + " discconected");
    });
});


(async function() {
    // await db.addUser({login:'1',password:'13'});
    // await db.addUser({login:'2',password:'13'});
    // let data = '2';
    // let userId = 1;
    // console.log(await db.createPrivateChat(1,2));
    // console.log(await db.createPrivateChat(1,3));
    // console.log(await db.getAllPrivateChats(1));
    // await db.addPrivateMessage('test text from 1', 1,1);
    // await db.addPrivateMessage('test t 1', 1,3);
    // console.log("private messages: " + await db.getPrivateMessage(1,2));
    // let dushe = await db.getPrivateMessage(1,2);
    // console.log(dushe);
    // console.log(await db.isChatExist(10));

    // console.log(data);
    //     if (await db.isUserExistByID(data)) {
    //         console.log(await db.isChatExistByUserIDs(data, userId));
    //         if (!await db.isChatExistByUserIDs(data, userId)){
    //             console.log("Creating...")
    //             let newChat = await db.createPrivateChat(userId, data);
    //             console.log(newChat);
    //             console.log('+');
    //             console.log(await db.getAllPrivateChats(1));
    //         }
    //         else{
    //             console.log('Chat is exist');
    //             console.log(await db.getAllPrivateChats(1));
    //         }
    //     }
    //     else console.log('user not found');
})();