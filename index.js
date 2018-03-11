var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookieParser = require('socket.io-cookie-parser');
var port = process.env.PORT || 3000;

io.use(cookieParser());

http.listen( port, function () {
    console.log('listening on port', port);
});

app.use(express.static(__dirname + '/public'));

users = {};
chatlog = {};
const defColor = "cccccc";

io.on('connection', function(socket){
    //parse cookies
    let cookies = socket.request.cookies;
    // if cookie for chat doesnt exist, make a new cookie
    if(cookies.nickname === undefined) {
        addUser(socket.id, generateDefNick(), defColor);
        socket.emit('saveCookies', setCookie(users[socket.id].nick, 1));
    // if it exists then read cookie + add user
    } else {
        addUser(socket.id, cookies.nickname, defColor);
    }

    // update nickname label for client
    socket.emit('updateNickLabel', users[socket.id]);

    // load userlist for all clients
    socket.on('loadUsers', function() {
        io.sockets.emit('updateUserlist', getUserList());
    });

    // load chat history for client
    socket.on('loadChat', function() {
        for(m in chatlog) {
            socket.emit('chat', chatlog[m]);
        }
    });

    // alert all clients of connection
    socket.on('alertConnection', function() {
        io.sockets.emit('chat', message(getTimestamp(),'SERVER &gt;',defColor,users[socket.id].nick + ' has joined the chat.'));
    });


    // parse messages from client
    socket.on('chat', function(msg){
        let ts = getTimestamp();

        if(msg === "") {
            // do nothing
        } else if(msg.substring(0,6)==="/nick ") {
            updateUserNick(socket.id, msg.split(" ")[1]);
            socket.emit('saveCookies', setCookie(users[socket.id].nick, 1));
            socket.emit('updateNickLabel', users[socket.id]);
            io.sockets.emit('updateUserlist', getUserList());

        } else if(msg.substring(0,11) === "/nickcolor ") {
            updateUserColor(socket.id, msg.split(" ")[1]);
            socket.emit('updateNickLabel', users[socket.id]);
            io.sockets.emit('updateUserlist', getUserList());

        } else {
            msg = sanitize(msg);
            let data = message(ts, users[socket.id].nick, users[socket.id].color, msg);
            storeMessage(data);
            io.sockets.emit('chat', data);
        }
    });

    socket.on('disconnect', function() {
        socket.broadcast.emit('chat',message(getTimestamp(),'SERVER &gt;',defColor,users[socket.id].nick + ' has left the chat.'));
        deleteUser(socket.id);
        // update user list for all other clients
        socket.broadcast.emit('updateUserlist', getUserList());
    });
});

function generateDefNick() {
    return "user" + (Object.keys(users).length+1);
}

function nickIsAvailable(nick) {
    for(id in users) {
        if(users[id].nick === nick) {
            return false;
        }
    }
    return true;
}

function addUser(id, nick, color) {
    if(nickIsAvailable(nick)) {
        users[id] = {nick: nick, color: color};
    } else {
        console.log("nickname already taken. generating new default nickname");
        users[id] = {nick: generateDefNick(), color};
    }
}

function deleteUser(id) {
    delete users[id];

}

function updateUserNick(id, nick) {
    if(nickIsAvailable(nick)) {
        users[id].nick = nick;
    }
}

function updateUserColor(id, color) {
    if(isValidColor(color)) {
        users[id].color = color;
    } else
        console.log("user entered invalid color:" + color);
}

// to check for valid hex colors
// cite: https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation
function isValidColor(color) {
    return /^[0-9A-F]{6}$/i.test(color);
}

function setCookie(nick,exdays) {
    let d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires=" + d.toUTCString() + ";";
    let nickdata = "nickname=" + nick + ";";
    return nickdata + expires + "path=/";
}

function getTimestamp() {
    let d = new Date();
    let hr = d.getHours();
    let mins = d.getMinutes();

    let suffix = (hr<=12) ? "am" : "pm";
    hr = (hr > 12) ? hr-12 : hr;
    mins = (mins < 10) ? "0" + mins : mins;
    return hr + ":" + mins + " " + suffix;
}

function storeMessage(data) {
    let len = Object.keys(chatlog).length;
    if(len>200) { // remove oldest message
        delete chatlog[0];
    }
    chatlog[Object.keys(chatlog).length] = data;
}

// to sanitize messages and prevent html/js input
// replaces <,>,/,\,$ with html encoding
// cite: https://stackoverflow.com/questions/2794137/sanitizing-user-input-before-adding-it-to-the-dom-in-javascript
function sanitize(msg) {
    return msg.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\//g, '&#47;').replace(/\$/g, '&#36;');
}

function message(time, nick, color, msg) {
    return {time: time, nick: nick, color: color, msg: msg};
}

function getUserList() {
    let list = [];
    for(u in users) {
        list.push({nick: users[u].nick, color: users[u].color});
    }
    return list;
}