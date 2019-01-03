"use strict"


// connect to this url socket
var socket = io()
var users = {}
var currentChat = null;
var messageHistory = {}

// read username from localStoage
if (localStorage.username) {
    $("#my-name").val(localStorage.username);
}

function login() {
    localStorage.username = $("#my-name").val();

    var hashedPass = getHash($("#my-pass").val());  // ccrypto: hash login password
    localStorage.password = symEncrypt(hashedPass, socket.id); // ccrypto: nonce hashedPass by my socket id

    socket.emit("s-login", { username: localStorage.username, password: localStorage.password })
}

function requestChat(username) {
    if (localStorage[username])
        startChat(username)
    else
        socket.emit("s-request-chat", { to: username, pubKey: localStorage.publicKey }); // ccrypto: send my public key
}

function getChatName(u0, u1) {
    var sortedUsers = [u0, u1].sort();
    return sortedUsers[0] + "_" + sortedUsers[1]; // unique name for this users private chat
}

function startChat(withUser) {
    $("#chat").empty();
    $("button.user").removeClass("active")
    $(`#user-${withUser}`).addClass("active")
    currentChat = withUser;

    var history = messageHistory[getChatName(localStorage.username, withUser)];
    if (history) {
        for (var i = 0; i < history.length; i++) {
            appendMessage(history[i].message, history[i].sender);
        }
    }
}

function appendMessage(msg, username) {
    if (username == localStorage.username) {
        $("#chat").append(`<p><b>me: </b>${msg}</p>`);
    }
    else {
        $("#chat").append(`<p><b>${username}: </b>${msg}</p>`);
    }
}

function addMessage(msg, from, to) {
    var history = messageHistory[getChatName(from, to)];
    if (history == null)
        messageHistory[getChatName(from, to)] = history = [];

    history.push({ message: msg, sender: from });

    // show chat message when I'm sender or sender is current chat
    if (from == localStorage.username || from == currentChat)
        appendMessage(msg, from);
}

$("#msgInput").on("keydown", function (e) {
    if (e.keyCode === 13) // enter pressed
    {
        if (currentChat == null) {
            alert("Please select one user to chat with...")
            return;
        }

        var msg = $("#msgInput").val();
        if (msg.length > 0) {
            addMessage(msg, localStorage.username, currentChat)

            // ccrypto: encrypt message by RSA
            var anotherUserPubKey = localStorage[currentChat]
            msg = asymEncrypt(msg, anotherUserPubKey); 

            socket.emit("s-msg", { to: currentChat, message: msg });
            $("#msgInput").val("");
        }
    }
})


socket.on("c-receive-msg", function (data) {
    data.message = asymDecrypt(data.message); // ccrypto: decrypt message by my private key in RSA algorithm
    addMessage(data.message, data.from, localStorage.username);
});

socket.on("c-sign", function () {
    $("#login-section").css("display", "none")
    $("#main-section").css("display", "block")
    $("title").html("Secure Chat - " + localStorage.username)
});

socket.on("c-unsign", function (msg) { alert(msg) });

socket.on("c-user-list", function (rawUsers) {
    users = rawUsers;
    delete users[localStorage.username] //  delete me from user list

    var showUsers = $("#show-users");
    showUsers.empty();

    for (var user in users) {
        showUsers.append(`<button id="user-${user}" class="user user-${users[user].status}" onclick="requestChat('${user}')">${user}</button>`)
    }
})

socket.on("c-request-chat", function (req) {
    if (confirm(`Do you allow the user <${req.from}> to chat with you?`)) {
        localStorage[req.from] = req.pubKey; //  ccrypto: store that user pubKey
        socket.emit("s-accept-chat", { to: req.from, pubKey: localStorage.publicKey }) // ccrypto: send my public key
        startChat(req.from);
    } else {
        // reject request
        socket.emit("s-reject-chat", { to: req.from })
        return;
    }
});

socket.on("c-accept-chat", function (acp) {
    localStorage[acp.from] = acp.pubKey; // ccrypto: store accepted user public key
    alert(`user <${acp.from}> accepted your chat request.`)
    startChat(acp.from);
})


socket.on("c-reject-chat", function (rej) {
    alert(`user <${rej.from}> rejected your chat request!`)
})