// Handsup 2.1 by ITG Göteborg - Teacher side
var socket = io(location.host); 
var teacherRoom;
var hands = {};
var title;

$(function() {
	title = document.title;

	function removeFromList(userId) {
		delete hands[userId];

		$("#" + userId).velocity({ translateX: ($(window).width() * 2) }, { duration: 300, complete: function() {
			$(this).remove();
		}});

		$(".hand").off();
		$(".hand").on("click", function(event) {
			var userId = $(this).data("user-id");

			socket.emit("kick", userId);
		});
	}

	function addToList(user) {
		if (Object.keys(hands).includes(user.id)) {
			return;
		}
		
		hands[user.id] = user.name;

		$("#list").append("<div class='hand' id='" + user.id + "' data-user-id='" + user.id + "'>" + user.name + "</div>");

		$(".hand").off();
		$(".hand").on("click", function(event) {
			var userId = $(this).data("user-id");

			socket.emit("kick", userId);
		});
	}

	function createRoom() {
		socket.emit("createRoom", function(error, room) {
			if (error) {
				console.error(error);
				return;
			}

			teacherRoom = room;
			$("#showRoom h2").text(teacherRoom);

			setTimeout(function() {
				$(".admin-screen--active").removeClass("admin-screen--active");
				$(".admin-screen__admin").fadeIn("fast");
				document.title = "Rum: " + room + " | " + title;
			}, 1000);
		});
	}

	$(document).on("keypress", function(event) {
		var code = (event.keyCode ? event.keyCode : event.which);

		var handsArray = Object.keys(hands);

		if ((code === 32) && (handsArray.length > 0)) {
			socket.emit("kick", handsArray[0]);
		}
	});

	socket.on("connect", function() {
		createRoom();

		socket.on("handStatus", function(error, student) {
			if (error) {
				console.error(error);
				return;
			}

			if (student.handUp) {
				addToList(student);
			} else {
				removeFromList(student.id);
			}
		});

		socket.on("exit", function(studentId) {
			removeFromList(studentId);
		});

		socket.on("disconnect", function() {
			document.title = title;
			$(".admin-screen__admin").fadeOut("fast");
			$(".admin-screen__loader").addClass("admin-screen--active");

			hands = {};
			$("#list").html("");
		});
	});
});

window.onbeforeunload = function() {
	if (Object.keys(hands).length > 0) {
		return "Om du stänger eller laddar om sidan tappar du alla elever i kön, vill du det?";
	}
};
