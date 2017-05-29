$(function() {
	console.log("Ready!");

	var currentCards,
	cardsPlayableThisRound,
	playerId;

	var cardsPlayedThisRound = 0,
	timerTimeLeft = 0,
	czarTimerTimeLeft = 0,
	isCzar = false,
	czarAlertShown = false,
	cardsPlayed = [],
	gameIsSetup = false;

	var socket = io.connect('http://192.168.2.107:8000');

	socket.on('newRound', function (data) {
		if(!gameIsSetup) {
			setUpGame();
		}
		$('.cardsPlayed').empty();
		var cardsLeft = $('.whiteCard').length;
		console.log(cardsLeft);
		cardsPlayedThisRound = 0;
		playerId = data.msg[3];
		console.log(data.msg);
		if(data.msg[2] == 1) {
			isCzar = true;
		} else {
			isCzar = false;
		}
		
		cardsPlayableThisRound = data.msg[0].pick;
		$('.blackCard').html(data.msg[0].text);

		for(var i = cardsLeft; i < 5; i++) {
			var whiteCard = document.createElement("DIV");
			whiteCard.className = "whiteCard";
			whiteCard.innerHTML = data.msg[1][i];
			whiteCard.ondblclick = function() {
				if(timerTimeLeft != 0) {
					if(cardsPlayedThisRound >= cardsPlayableThisRound) {
						showAlert("Can't play any more cards this Round!");
					} else if (isCzar) {
						showAlert("You're the Card-Czar!");
					} else {
						var cardToSend = [$(this).text(), playerId];
						socket.emit('getPlayedCard', {data: cardToSend});
						$(this).remove();
						cardsPlayedThisRound++;
					}					
				}
			};
			$('.whiteCardContainer').append(whiteCard);
		}
		animateCard();

		currentCards = $('.whiteCard').length;
		console.log(currentCards);
	});

	socket.on('loginFail', function() {

		console.log("Login Failed!");
	})

	socket.emit('getCurrentPlayers', {});

	socket.on('recieveCurrentPlayer', function(data) {
		var info = "There are " + data.curP + " out of max. " + data.maxP + " Players online!";
		$('#playerInfo').text(info);
	});


	socket.on('timeLeft', function(data) {
		var timeLeft = "Time left: " + data.time + "s";
		$('#timeLeftTimer').text(timeLeft);
		timerTimeLeft = data.time;
		if(data.time == 0) {
			$('#timeLeftTimer').text("Time's up!");
			$('.whiteCard').css('background', '#aaa');
			$('.whiteCard').prop('disabled', true);
		}
	});

	socket.on('timeLeftForCzar', function(data) {
		if(!czarAlertShown) {
			showAlert("You're the Czar, pick a card!");
			czarAlertShown = true;
		}
		var timeLeft = "Time left for Czar: " + data.time + "s";
		$('#timeLeftTimer').text(timeLeft);
		czarTimerTimeLeft = data.time;
		if(data.time == 0) {
			$('#timeLeftTimer').text("Time's up!");
			$('.whiteCardPlayed').css('background', '#aaa');
			$('.whiteCardPlayed').prop('disabled', true);
		}
	});

	socket.on('cardsPlayedRound', function(data) {
		if(data.data.length != 0) {
			console.log(data);
			for(var i = 0; i < data.data.length; i++) {
				var whiteCard = document.createElement("DIV");
				whiteCard.className = "whiteCardPlayed";
				whiteCard.innerHTML = data.data[i][0];
				whiteCard.dataset.player = data.data[i][1]
				whiteCard.ondblclick = function() {
					if(czarTimerTimeLeft != 0 && isCzar) {
						var cardToSend = [$(this).text(), $(this).data("player")];
						socket.emit('czarCardSelect', {data: cardToSend});
						$(this).css('background', '#aaa')
					}
				};
				$('.cardsPlayed').append(whiteCard);
			}
			animateCard();
		}
	});

	socket.on('currentScoreboard', function(data) {
		$('.scoreboard').empty();
		for(var i = 0; i < data.score.length; i++) {
			var line = data.score[i][0] + " has " + data.score[i][1] + " points! <br />";
			$('.scoreboard').append(line);
		}
	});

	socket.on('publishWinnerCard', function(data) {
		console.log(data.pos);
		$('.whiteCardPlayed').each(function() {
			if($(this).data("player") == data.pos) {
				$(this).css('background', 'green');
				$('#timeLeftTimer').text("Round finished!");				
			}
		});
	});

	$('#startRndBtn').on('click', function() 
	{
		socket.emit('startNewRnd', {})
	});

	function showAlert(message) {
		$('#alertBox').text(message);
		$('#alertBox').animate({
			bottom: "0px"
		}, 500, function() {
			setTimeout(function() {
				$('#alertBox').animate({
					bottom: "-50px"
				}, 500);
			}, 1500);
		});

	}

	function setUpGame() {
		var blackCard = document.createElement("DIV");
		blackCard.className = "blackCard";
		var whiteCardContainer = document.createElement("DIV");
		whiteCardContainer.className = "whiteCardContainer";
		var cardsPlayedCont = document.createElement("DIV");
		cardsPlayedCont.className = "cardsPlayed";		
		var scoreboard = document.createElement("DIV");
		scoreboard.className = "scoreboard";
		$('body').append(blackCard);
		$('body').append(cardsPlayedCont);
		$('body').append(whiteCardContainer);
		$('body').append(scoreboard);
		console.log("Game is set up!");
		gameIsSetup = true;
	}

	function animateCard() {
		$('.whiteCard').each(function() {
			$(this).animate({
				opacity: 1,
				marginLeft: "10px"
			}, 1000);
		})
	}
});
