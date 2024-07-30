const fs = require("fs");
const dbFile = "./chat.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;
let crypto = require("crypto");

const initDB = async () => {
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.Database
    });
    try {
        if (!exists) {
            await db.run(
                `CREATE TABLE user (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    login VARCHAR(40) UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    salt TEXT,
                    connection_status TEXT,
                    kindness INTEGER DEFAULT 0,
                    crown_status TEXT DEFAULT 'Cityzen',
                    money INTEGER DEFAULT 0,
                    ads INTEGER DEFAULT 5,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );`
            );
            await db.run(
                `CREATE TABLE message (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    author_id INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(author_id) REFERENCES user(id)
                );`
            );
            await db.run(
                `CREATE TABLE private_message (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id INTEGER NOT NULL,
                    author_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(author_id) REFERENCES user(id)
                );`
            );
            await db.run(
                `CREATE TABLE private_chat (
                    chat_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user1_id INTEGER NOT NULL,
                    user2_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user1_id) REFERENCES user(id),
                    FOREIGN KEY(user2_id) REFERENCES user(id)
                );`
            );
            await db.run(`
                CREATE TABLE market (
                    announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL,
                    author_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(author_id) REFERENCES user(id)
                )`
            );
        }
    } catch (error) {
        console.error(error);
    }
};

const ensureDBInitialized = async () => {if (!db) await initDB()};

module.exports = {
    //глобал чат
    getMessages: async () => {
        await ensureDBInitialized();
        return await db.all(`
            SELECT message.id AS msg_id, author_id, content, login, timestamp FROM message 
            JOIN user ON message.author_id = user.id
        `);
    },
    addMessage: async (msg, userid) => {
        await ensureDBInitialized();
        try {
            const timestamp = new Date().toISOString();
            const user = await db.get(`SELECT login FROM user WHERE id = ?`, [userid]);
            console.log(`Message from ${user.login} at ${timestamp}: ${msg}`);
            await db.run(`INSERT INTO message (content, author_id, timestamp) VALUES (?, ?, ?)`, [msg, userid, timestamp]);
        } catch (error) {
            console.log(error);
        }
    },
    //пользователи и администрирование
    isUserExist: async (login) => {
        await ensureDBInitialized();
        let person = await db.all(`SELECT * FROM user WHERE login = ?`, [login]);
        return person.length;
    },
    isUserExistByID: async (userId) => {
        await ensureDBInitialized();
        let person = await db.all(`SELECT * FROM user WHERE user.id = ?`, [userId]);
        return person.length;
    },
    addUser: async (user) => {
        await ensureDBInitialized();
        let salt = crypto.randomBytes(16).toString("hex");
        let passCipher = crypto.pbkdf2Sync(user.password, salt, 1000, 100, 'sha512').toString("hex");
        await db.run(
            `INSERT INTO user (login, password, salt, kindness, crown_status, money) VALUES (?, ?, ?, ?, ?, ?)`,
            [user.login, passCipher, salt , 10, 'Citizen', 100]
        );
        return true;// ПОТОМ УБРАТЬ ЕТО НЕ НАДО НО ПОКА НАДО!!!!
    },
    userLineStatus: async(type, userId) => {
        await ensureDBInitialized();
        if (type) await db.run(`UPDATE user SET connection_status = 'Online' WHERE id = ?`, [userId]);
        else await db.run(`UPDATE user SET connection_status = 'Offline' WHERE id = ?`, [userId]);
    },
    getAuthToken: async (user) => {
        await ensureDBInitialized();
        let person = await db.all(`SELECT * FROM user WHERE login = ?`, [user.login]);
        if (!person.length) {
            throw "Incorrect login";
        }
        const { id, login, password, salt } = person[0];
        const hash = crypto.pbkdf2Sync(user.password, salt, 1000, 100, 'sha512').toString("hex");
        if (hash != password) {
            throw "Incorrect password";
        }
        return id + "." + login + "." + crypto.randomBytes(20).toString("hex");
    },

    //приватние чаты
    createPrivateChat: async (user1Id, user2Id) => {  // Создание проватного чата
        await ensureDBInitialized();
        const [firstUserId, secondUserId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
        const chats = await db.all(`SELECT * FROM private_chat WHERE (user1_id , user2_id) = (? , ?)`, [firstUserId,secondUserId]);
        if (chats.length) return {error: "Chat allready exists"};

        const timestamp = new Date().toISOString();
        const result = await db.run(`
            INSERT INTO private_chat (user1_id, user2_id, created_at) VALUES (?, ?, ?)
        `, [firstUserId, secondUserId, timestamp]);
        let buffer = result.lastID
        return {chat_id:buffer};
    },
    isUserINChat: async(chatId, userId) => {
        await ensureDBInitialized();
        const chat = await db.get(`
            SELECT chat_id FROM private_chat 
            WHERE chat_id = ? AND (user1_id = ? OR user2_id = ?)
        `, [chatId, userId, userId]);
        if (!chat) return false;
        return true;
    },
    isChatExistByUserIDs: async (user1Id, user2Id) => { 
        await ensureDBInitialized();
        const [firstUserId, secondUserId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
        const chats = await db.all(`SELECT * FROM private_chat WHERE (user1_id , user2_id) = (? , ?)`, [firstUserId,secondUserId]);
        return chats.length;
    },
    isChatExistByChatId: async (chatId) => {
        await ensureDBInitialized();
        const chat = await db.all(`SELECT * FROM private_chat WHERE (chat_id) = ?`, [chatId]);
        return chat.length;
    },
    chatDetails:async (chatId) => {
        await ensureDBInitialized();
        const chat = await db.all(`SELECT * FROM private_chat WHERE (chat_id) = ?`, [chatId]);
        return chat;
    },
    getPrivateMessage: async (chatId) => { // Получение сообщения
        await ensureDBInitialized();
        return await db.all(`
            SELECT private_message.id AS p_msg_id, user.login AS username, content, timestamp 
            FROM private_message 
            JOIN user ON private_message.author_id = user.login
            WHERE private_message.chat_id = ?
        `, [chatId]);
    },
    addPrivateMessage: async (msg, author_id, chatId) => { // Установка сообщения
        await ensureDBInitialized();
        const timestamp = new Date().toISOString();
        await db.run(`INSERT INTO private_message (content, author_id, chat_id, timestamp) VALUES (?, ?, ?, ?)`, [msg, author_id, chatId, timestamp]);
    },
    deletePrivateMessage: async(chat_id,private_msg_id) => {// Уничтожение сообщения
        await ensureDBInitialized();
        await db.run(`
            DELETE FROM private_message WHERE chat_id = ? AND private_message.id = ?
        `,[chat_id, private_msg_id])
    },
    getAllPrivateChats: async (userId) => {// Получение всех приватних чатов 
        await ensureDBInitialized();
        return await db.all(`
            SELECT chat_id, user1_id, user2_id, created_at FROM private_chat 
            WHERE user1_id = ? OR user2_id = ?
        `, [userId, userId]);
    },

    //детали и имперский статус
    getUserDetails: async (userId) => {
        await ensureDBInitialized();
        return await db.get(`
            SELECT login, kindness, crown_status, money, connection_status FROM user WHERE id = ?
        `, [userId]);
    },
    getUserConnectionStatus: async(userId) => {
        await ensureDBInitialized();
        return await db.get(`
            SELECT connection_status FROM user WHERE id = ?
        `, [userId]);
    },
    setKindness: async (userId, kindness) => {
        await ensureDBInitialized();
        try {
            await db.run(`UPDATE user SET kindness = ? WHERE id = ?`, [kindness, userId]);
        } catch (error) {
            console.log(error);
        }
    },
    setCrownStatus: async (userId, crownStatus) => {
        await ensureDBInitialized();
        try {
            await db.run(`UPDATE user SET crown_status = ? WHERE id = ?`, [crownStatus, userId]);
        } catch (error) {
            console.log(error);
        }
    },
    setMoney: async (userId, money) => {
        await ensureDBInitialized();
        try {
            await db.run(`UPDATE user SET money = ? WHERE id = ?`, [money, userId]);
        } catch (error) {
            console.log(error);
        }
    }
};