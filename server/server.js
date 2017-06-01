console.log("Hello");

	/**
	TO-DO:
		-
	**/
var io = require('socket.io'),
	server = io.listen(8000),
	playerList = [],
	playerNumber = 0,
	maxPlayers = 5,
	timer = 10,
	cardsPlayedRound = [],
	timeLeft = 0,
	currentCzar = 0;

var whiteCardsList,
	blackCardsList,
	czarCardSelectTimer,
	roundTimer;

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

httpGetAsync("http://gustl.xyz/cah_base.json", function(data) {
	var jsonData = JSON.parse(data);
	whiteCardsList = jsonData['whiteCards'];
	blackCardsList = jsonData['blackCards'];
});

server.on('connection', function(socket)
{
	if(playerList.length > maxPlayers) {
		socket.emit('loginFail', {})
  		removePlayerFromList(socket);
  		console.log(playerList);
		socket.disconnect(true);
	}

	playerNumber++;
	playerList.push([{"playerNumber": playerNumber}, {"socketInfo": socket}, {"socketId": socket.id}, {"points": 0}, {"username": ""}]);

  	socket.on('disconnect', function() {
  		removePlayerFromList(socket);
  		console.log(playerList);
  		if(playerList.length == 0) {
  			playerNumber = 0;
  		}
  		sendCurrentPlayerCount();
  	});

		socket.on('getUsername' , function(data) {
			for(var i = 0; i < playerList.length; i++) {
				if(playerList[i][2].socketId == socket.id) {
					playerList[i][4].username = data.user;
				}
			}
		});

  	socket.on('startNewRnd', function() {
  		console.log("New Round!");
  		sendNewRound();
  	});

  	socket.on('getCurrentPlayers', function() {
  		sendCurrentPlayerCount();
  	});

  	socket.on('getPlayedCard', function(data) {
  		getPlayedCard(data);
  	});

  	socket.on('czarCardSelect', function(data) {
  		console.log(data);
		clearInterval(czarCardSelectTimer);
  		for(var i = 0; i < playerList.length; i++) {
  			if(data.data[1] == i) {
  				playerList[i][3].points++;
  				publishWinner(i);
  			}
  		}
  		for(var i = 0; i < playerList.length; i++) {
  			var msg = playerList[i][2].socketId + "(" + playerList[i][0].playerNumber + ") has " + playerList[i][3].points + " Points!";
  			console.log(msg);
  		}
  		sendPoints();
  	});

  	console.log(playerList);
});

function removePlayerFromList(socket)
{
	for(var i = 0; i < playerList.length; i++) {
		if(playerList[i][2].socketId == socket.id) {
			playerList.splice(i, 1);
		}
	}
}

function sendNewRound()
{
	sendPoints();
	if(currentCzar == playerList.length) {
		currentCzar = 0;
		console.log("Reset Czar!");
	}
	var data = [];
	cardsPlayedRound = [];
	var blackCard = getRandomBlackCard();
	if(getRandomBlackCard().pick > 1) {
		console.log("2 Pick Card!");
		getRandomBlackCard();
	}
	data.push(blackCard);
	for(var i = 0; i < playerList.length; i++) {
		var whiteCards = getRandomWhiteCards();
		data.push(whiteCards);
		if(i == currentCzar) {
			data.push(1);
		} else {
			data.push(0);
		}
		data.push(i);
		var dataToSend = JSON.stringify(data);
		playerList[i][1].socketInfo.emit('newRound', {msg: data});
		data.splice(1, 3);
	}
	currentCzar++;
	startRoundTimer();
}

function httpGetAsync(url, callback)
{
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
			callback(xmlHttp.responseText);
		}
	}
	xmlHttp.open("GET", url, true);
	xmlHttp.send(null);
}

function getRandomWhiteCards()
{
	var whiteCardArray = []
	for(var i = 0; i < 5; i++) {
		var index = Math.floor((Math.random() * whiteCardsList.length) + 1);
		whiteCardArray.push(whiteCardsList[index]);
	}
	return whiteCardArray;
}

function getRandomBlackCard()
{
	var index = Math.floor((Math.random() * blackCardsList.length) + 1);
	console.log(blackCardsList[index].pick);
	return blackCardsList[index];
}

function sendCurrentPlayerCount()
{
	for(var i = 0; i < playerList.length; i++){
		playerList[i][1].socketInfo.emit('recieveCurrentPlayer', {curP: playerList.length, maxP: maxPlayers});
	}
}

function sendPlayedCards()
{
	for(var i = 0; i < playerList.length; i++) {
		playerList[i][1].socketInfo.emit('cardsPlayedRound', {data: cardsPlayedRound});
	}
}

function startRoundTimer()
{
	timer = 10;
	roundTimer = setInterval(function() {
		if(timer <= 0) {
			clearInterval(roundTimer);
			sendPlayedCards();
			startCzarTimer();
		} else if(playerList.length == 0) {
			clearInterval(roundTimer);
		}
		for(var i = 0; i < playerList.length; i++) {
			playerList[i][1].socketInfo.emit('timeLeft', {time: timer});
		}
		timer--;
	}, 1000);
}

function startCzarTimer()
{
	console.log("Started Czar Timer!");
	timer = 10;
	czarCardSelectTimer = setInterval(function() {
		if(timer <= 0) {
			clearInterval(czarCardSelectTimer);
		} else if(playerList.length == 0) {
			clearInterval(czarCardSelectTimer);
		}
		for(var i = 0; i < playerList.length; i++) {
			playerList[i][1].socketInfo.emit('timeLeftForCzar', {time: timer});
		}
		timer--;
	}, 1000);
}

function getPlayedCard(data)
{
	cardsPlayedRound.push(data.data);
	if(cardsPlayedRound.length == (playerList.length - 1)) {
		clearInterval(roundTimer);
		sendPlayedCards();
		startCzarTimer();
	}
	console.log(cardsPlayedRound);

}

function sendPoints()
{
	var totalPlayers = [];
	if(playerList.length > 0) {
		for(var j = 0; j < playerList.length; j++) {
			totalPlayers.push([playerList[j][4].username, playerList[j][3].points]);
		}
	}
	for(var i = 0; i < playerList.length; i++){
		playerList[i][1].socketInfo.emit('currentScoreboard', {score: totalPlayers});
	}
}

function publishWinner(position)
{
	for(var i = 0; i < playerList.length; i++){
		playerList[i][1].socketInfo.emit('publishWinnerCard', {pos: position});
	}
}
