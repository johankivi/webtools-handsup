// Handsup 2.1 by ITG Göteborg - Student side
var socket = io(location.host);
var storage = localStorage;
var username = "";
var teacherRoom = null;
var me = {};

function escapeHTML(str) {
	str = str + "";
	var out = "";
	for(var i = 0; i < str.length; i++) {
		if(str[i] === "<") {
			out += "&lt;";
		} else if(str[i] === ">") {
			out += "&gt;";
		} else if(str[i] === "'") {
			out += "&#39;"; 
		} else if(str[i] === '"') {
			out += "&quot;";
		} else {
			out += str[i];
		}
	}

	return out;
}

function getUser() {
	if (!storage.handsup_name) {
		$("#input-user").show();
	} else {
		username = storage.handsup_name;

		$(".username").text(username);
		$("#input-room").show().focus();
	}
}

function getRoom() {
	if (storage.handsup_room) {
		teacherRoom = storage.handsup_room;
		$("#input-room").val(teacherRoom);

		delete storage.handsup_room;
	}
}

function init() {
	$(".screen--active").removeClass("screen--active");
	$("#input-room, #input-user").val("").hide();
	$(".room").text("");
	$(".screen__settings").addClass("screen--active");
	$("#input-user").val("").focus();
	$(".arm").velocity({ translateY: 1200 }, 0);
	getUser();
	getRoom();
	var room = storage.handsup_room;
	if (room && user) {
		teacherRoom = room;
		$("#input-room").val(teacherRoom);
	}
}

$(function() {
	init();

	function raiseHand() {
		$("body").velocity({ backgroundColor: "#318e87"}, { duration: 300, complete: function() {
			$("#raise-hand").hide();
			$(".screen__whoops").removeClass("screen--active");
			$(".arm").show().velocity({ translateY: 0 }, { duration: 300, complete: function() {     
				$("#unraise-hand, #greeting").show();
			}});
		}});
	}

	function unraiseHand() {
		$("body").velocity({ backgroundColor: "#3eb5ac"}, { duration: 300, complete: function() {
			$("#unraise-hand, #greeting").hide();
			$(".arm").velocity({ translateY: 1200 }, { duration: 300, complete: function() {     
				$("#raise-hand").show();
			}});
		}});
	}

	function whoops() {
		me.handUp = false;
		$("#unraise-hand, #greeting").hide();
		$(".arm").velocity({ translateY: 1200 }, { duration: 300 });

		$("body").velocity({ backgroundColor: "#3eb5ac" }, { duration: 300, complete: function() {
			$(".room").text("");
			$(".screen--active").removeClass("screen--active");
			$(".screen__whoops").addClass("screen--active");
			$("#whoops__input-room").val("").show();
			$("#raise-hand").show();
		}});

		socket.connect();
	}

	function disconnected() {
		me.handUp = false;
		$("#unraise-hand, #greeting").hide();
		$(".arm").velocity({ translateY: 1200 }, { duration: 300 });

		$("body").velocity({ backgroundColor: "#3eb5ac" }, { duration: 300, complete: function() {
			$(".room").text("");
			$(".screen--active").removeClass("screen--active");
			$(".screen__disconnected").addClass("screen--active");
			$("#raise-hand").show();
		}});

		if (teacherRoom) {
			storage.handsup_room = teacherRoom;
		}
	}

	function handLer(error, user) {
		if (error) {
			console.error(error);
			return;
		}

		me = user;
		if (user.handUp) {
			raiseHand();
		} else {
			unraiseHand();
		}
	}

	socket.on("connect", function() {
		socket.on("handStatus", handLer);

		socket.on("error", function(error) {
			console.error(error);
		});

		socket.on("teacherExit", function(teacher) {
			whoops();
		});

		socket.on("disconnect", function() {
			disconnected();
		});
	});

	$("#input-user").on("keypress", function(event) {
		var code = (event.keyCode ? event.keyCode : event.which);

		if (code === 13) { 
			username = escapeHTML($("#input-user").val());

			$(".username").text(username);
			storage.handsup_name = username; 

			$(".screen--active").removeClass("screen--active");
			$("#input-user").hide();
			$(".screen__settings").addClass("screen--active");
			$("#input-room").show().focus();
		}
	});

	$(".input-room").on("keypress", function(event) {
		var code = (event.keyCode ? event.keyCode : event.which);
		if (code === 13) { 
			teacherRoom = escapeHTML($(this).val().toUpperCase());

			socket.emit("userInfo", username, teacherRoom, function(error, user) {
				if (error) {
					switch (error.code) {
						case "userInfo/room_non_existing":
							var $roomError = $(".room-error");
							$roomError.text(error.message).slideDown("fast", function() {
								setTimeout(function() {
									$roomError.slideUp("fast").text("");
								}, 5000);
							});
							break;
						default:
							console.error(error);
					}
					
					return;
				}

				$(this).blur();

				me = user;

				$(".room").text(teacherRoom);
				$(".screen--active").removeClass("screen--active");
				$(".screen__handraising").addClass("screen--active");

				$(document).off("keypress");

				$(document).on("keypress", function(event) {
					var code = (event.keyCode ? event.keyCode : event.which);
					if (code === 32) {
						socket.emit("handToggle", handLer);
						console.info("Handuppräckningsdata skickad!");
					}
				});
			});
		}
	});

	$(".header-item--username").on("click", function(event) {
		if (me.handUp) {
			alert("Du kan inte byta namn när du har handen uppe. Ta ner den och försök igen.");
		} else {
			$("#input-user").val("");
			$(".username").empty();

			delete storage.handsup_name;

			init();
		}
	});

	$(".header-item--room").on("click", function(event) {
		if (me.handUp) {
			alert("Du kan inte byta rum när du har handen uppe. Ta ner den och försök igen.");
		} else {
			$("#input-room").val("");
			$(".room").empty();
			init();
		}
	});

	$("#raise-hand, #unraise-hand").on("click", function(event) {
		socket.emit("handToggle", handLer);
		console.info("Handuppräckningsdata skickad!");
	});

	$("#reload").on("click", function(event) {
		window.location.reload();
	});
});
