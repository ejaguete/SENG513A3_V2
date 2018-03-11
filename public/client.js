// shorthand for $(document).ready(...)
var socket = io();

socket.on('saveCookies', function(data) {
    document.cookie = data;
});

socket.on('updateNickLabel', function(data) {
    $('#nicklabel').html("<span id='nick' style=\"color:#" +  data.color + ";\">" + data.nick + "</span>");
});

socket.on('updateUserlist',function(data) {
    $('#userlist').html("");
    for(let i=0; i< data.length; i++) {
        $('#userlist').append($('<li>').html("<span id='nick' style=\"color:#" +  data[i].color + ";\">" + data[i].nick + "</span>"));
    }
});

socket.on('connection', function() {
});

$(function() {
    // load userlist
    socket.emit('loadUsers');

    // load chatlog
    socket.emit('loadChat');
    $('form').submit(function(){
	    socket.emit('chat', $('#m').val());
	    $('#m').val('');
        return false;
    });

    socket.emit('alertConnection');

    socket.on('chat', function(data){
        console.log("doing a thing");
        let time = "<span id='time'>" + data.time + "</span> ";
        let nick = "<span id='nick' style=\"color:#" +  data.color + ";\">" + data.nick + "</span> ";
        let message = "<span id='msg'>" + data.msg + "</span>";
	    $('#messages').append($('<li>').html(time + nick + message));
        $('#messages').animate({ scrollTop: $('#messages').prop('scrollHeight')}, 0);
    });

});
