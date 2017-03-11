var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var count = 0;
userArray = [];
userNamesArray = [];
connections = [];
chatMemory = [];

server.listen(process.env.PORT || 3000);
console.log("Server running...");

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
	connections.push(socket);
	console.log("Connected: %s sockets connected", connections.length);

	//Give new user a name
	count++;
	console.log(userArray);
	while(userArray.indexOf("User" + count) > -1 || userArray.indexOf("user" + count) > -1){
		count++;
	}
	var username = "User" + count;
	console.log("User: " + username);
	io.to(socket.id).emit('new username', {name: username});

	//Add new user to list of online users
	socket.username = username;
	userArray.push(socket.username);
	io.sockets.emit('user list', userArray);

	//Supply new user with chat memory
	for(var i = 0; i < chatMemory.length; i++) {
		io.to(socket.id).emit('new message', {msg: chatMemory[i]});
	}

	//User has disconnected
	socket.on('disconnect', function(data){;
		connections.splice(connections.indexOf(socket), 1);
		console.log("Disconnected: %s sockets connected", connections.length);
		//Take out user from user list when they disconnect
		userArray.splice(userArray.indexOf(socket.username), 1);
		io.sockets.emit('user list', userArray);

	});

	//Echo message back to clients
	socket.on('send message', function(data){
		console.log(data);
		chatMemory.push(time() + data.name + data.msg); //Add message to chat memory.
		socket.broadcast.emit('new message', {msg: time() + data.name + data.msg}); //emit to everyone but the sender
		var boldMessage = data.msg;
		boldMessage = boldMessage.bold();
		io.to(socket.id).emit('new message', {msg: time() + data.name + boldMessage}); //emit to the sender
	});

	//Check if desired username is already in use and if it's not then change it in userArray and tell the client
	socket.on('update username', function(data){
		var isUnique = true;
		var name = data.toLowerCase();
		name = name.replace(/\s/g, '');
		for(var i = 0; i < userArray.length; i++){
			var currentUser = userArray[i].toLowerCase();
			var currentUser = currentUser.replace(/\s/g, '');
			if(name == currentUser){
				console.log("we have a hit");
				var match = userArray[i];
				isUnique = false;
			}
		}

		if(isUnique == false){
			io.to(socket.id).emit('new message', {msg: "The username " + match + " is already in use"});
		}
		else{
			var index = userArray.indexOf(socket.username);
			socket.username = data;
			if (index !== -1) {
				userArray[index] = data;
			}
			io.sockets.emit('user list', userArray);
			io.to(socket.id).emit('new message', {msg: "Username changed to " + data});
		}
	});


});

function time() {
	var date = new Date(); // for now
	var h = date.getHours();
	var m = date.getMinutes();

	if(h < 10) {
		h = '0' + h;
	}

	if(m < 10) {
		m = '0' + m;
	}

	var time = h + ":" + m;

	return time;
}
