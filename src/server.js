// This is the main file of our chat app. It initializes a new 
// express.js instance, requires the config and routes files
// and listens on a port. Start the application by running
// 'node app.js' in your terminal
"use strict"

var express = require('express');

var CryptoJS = require('crypto-js');
var app = express();
var port = 8008;

// ------------------- Config static directories and files ---------------
//
// Set .html as the default template extension
app.set('view engine', 'html');

// Initialize the ejs template engine
app.engine('html', require('ejs').renderFile);

// Make the files in the client folder available to the world
app.use(express.static(__dirname + '/client')); // every files whiche user client need it for

// Tell express where it can find the templates
app.set('views', __dirname + '/client/views');

// =======================================================================

// --------------------------- Router Config -----------------------------
// when client call my / url then get index2.html
app.get('/', function (req, res) {
    // Render views/index.html
    res.render('index');
});
// =======================================================================
//
console.log('Your application is running on http://localhost:' + port);







// Initialize a new socket.io object. It is bound to 
// the express app, which allows them to coexist.
var io = require('socket.io').listen(app.listen(port));
var users = {};
// default events: 
//    connection: on client socket connected to me
//    disconnect: on the client leave me
//    error:      on the system error occured
io.on('connection', function (socket) {
    console.info(`a client socketid: ${socket.id} connected`);

    socket.on("s-login", function (userData) { // userData.username , userData.password
        userData.status = "online";
        userData.socket_id = socket.id;

        if (users[userData.username] != null && // user exist
            symDecrypt(users[userData.username].password, socket.id) !== userData.password) { // ccrypto: decrypt nonce pass
            // password not match
            socket.emit("c-unsign", "your password is incorrect!")
        }
        else { // new user || matched password
            users[userData.username] = userData; // update
            socket.user = userData;
            socket.emit("c-sign");

            defineEvents(socket);
            io.sockets.emit("c-user-list", getUsers())
        }
    });
});


function defineEvents(socket) {
    socket.on('disconnect', function () {
        console.warn(`the client socketid: ${socket.id} disconnected`);
        socket.user.status = "offline"
        io.sockets.emit("c-user-list", getUsers())
    });

    socket.on("s-msg", function (data) { // data.to, data.message
        // send all clients also me
        data.from = socket.user.username;
        var toUser = users[data.to];
        socket.to(toUser.socket_id).emit("c-receive-msg", data);
    });

    socket.on("s-request-chat", function (req) { // req.to, req.pubKey
        req.from = socket.user.username;
        var toUser = users[req.to];

        socket.to(toUser.socket_id).emit("c-request-chat", req);
    });

    socket.on("s-accept-chat", function (acp) {
        acp.from = socket.user.username;
        var toUser = users[acp.to];

        socket.to(toUser.socket_id).emit("c-accept-chat", acp);
    });

    socket.on("s-reject-chat", function (rej) {
        rej.from = socket.user.username;
        var toUser = users[rej.to];

        socket.to(toUser.socket_id).emit("c-reject-chat", rej);
    });
}

function getUsers() {
    var rawUsers = {}
    for (var u in users) {
        rawUsers[u] = { username: users[u].username, status: users[u].status };
    }
    return rawUsers;
}

function symDecrypt(cipherInput, pass) {
    var bytes = CryptoJS.TripleDES.decrypt(cipherInput, pass);
    return bytes.toString(CryptoJS.enc.Utf8);
}