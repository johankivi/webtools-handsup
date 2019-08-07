// jshint esversion: 6
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const express = require("express");
const socketio = require("socket.io");

const handsup = require(path.resolve("package.json"));

if (!handsup.config.appRoot || typeof handsup.config.appRoot !== "string") {
	console.error(`appRoot was not set in package.json will use default "/"`);
}

const app = express();

const PORT = process.env.PORT || handsup.config.port || 3000;
const APPROOT = process.env.APPROOT || handsup.config.appRoot || "/";

const server = app.listen(PORT, () => {
	console.log(`listening on *:${PORT}`);
});

const io = socketio.listen(server);

const generateId = (len) => {
	let buffer = crypto.randomBytes(len);
	return buffer.toString("hex").toUpperCase();
};

app.set("views", path.resolve("views"));
app.set("view engine", "ejs");
app.set("trust proxy", true);

app.locals.title = `${handsup.realName} ${handsup.version}`;
app.locals.appRoot = APPROOT;

app.use(helmet());

const mainApp = express.Router();

mainApp.use(express.static(path.resolve("public")));

mainApp.get("/", (req, res) => {
    res.render("index");
});

mainApp.get("/index.html", (req, res) => {
    res.render("student");
});

mainApp.get("/admin", (req, res) => {
	res.locals.loadingText = (Math.random() >= 0.7) ? `"It's smaller on the outside"` : `"It's bigger on the inside"`;
	res.render("admin");
});

mainApp.get("/admin/index.html", (req, res) => {
	res.locals.loadingText = (Math.random() >= 0.7) ? `"It's smaller on the outside"` : `"It's bigger on the inside"`;
	res.render("admin");
});

app.use("/", mainApp);

String.prototype.escapeHTML = function() {
	let str = this + "";
	let out = "";
	for(let i = 0; i < str.length; i++) {
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
};

let rooms = {};

const generateRoom = (teacherId, count = 0, length = 0) => {
	if (!teacherId && typeof teacherId !== "string") {
		throw new Error("teacherId is required and has to be a string");
	}

	if ((count % 5) === 0) {
		length++;
	}
	count++;

	let room = generateId(length);
	if (Object.keys(rooms).includes(room)) {
		generateRoom(teacherId, count, length);
	} else {
		rooms[room] = {
			id: room,
			teacherId: teacherId,
		};

		return rooms[room];
	}
};

io.on("connect", (socket) => {
	let user = socket.handsup = {
		id: socket.id,
	};

	socket.on("userInfo", (name, room, callback) => {
		// Callback is provided
		if (!callback) {
			socket.emit("error", {
				code: "userInfo/missing_callback",
				message: "En callback saknas",
			});
			return;
		}

		// Callback is a function
		if (typeof callback !== "function") {
			socket.emit("error", {
				code: "userInfo/callback_malformat",
				message: "Callback är inte en funktion",
			});
			return;
		}

		// User is not registered as teacher
		if (user.teacher) {
			return callback({
				code: "userInfo/teachers_are_not_students",
				message: "Lärare kan inte registera sig som en elev",
			});
		}

		// Name is provided
		if (!name) {
			return callback({
				code: "userInfo/missing_name",
				message: "Det saknas ett namn",
			});
		}

		// Name is a string
		if (typeof name !== "string") {
			return callback({
				code: "userInfo/name_malformat",
				message: "Namnet har inte rätt format",
			});
		}

		// Room is provided
		if (!room) {
			return callback({
				code: "userInfo/missing_room",
				message: "Det saknas ett rum",
			});
		}

		// Room is a string
		if (typeof room !== "string") {
			return callback({
				code: "userInfo/room_malformat",
				message: "Rummet har inte rätt format",
			});
		}

		// Room exists
		if (!Object.keys(rooms).includes(room.toUpperCase())) {
			return callback({
				code: "userInfo/room_non_existing",
				message: "Det rummet verkar inte finnas",
			});
		}

		socket.leave(user.room);
		user.name = name.escapeHTML();
		user.room = room.toUpperCase().escapeHTML();

		socket.join(user.room);

		callback(null, user);
	});

	socket.on("createRoom", (callback) => {
		// Callback is provided
		if (!callback) {
			socket.emit("error", {
				code: "createRoom/missing_callback",
				message: "En callback saknas",
			});
			return;
		}

		// Callback is a function
		if (typeof callback !== "function") {
			socket.emit("error", {
				code: "createRoom/callback_malformat",
				message: "Callback är inte en funktion",
			});
			return;
		}

		// User does not have a name
		if (user.name) {
			return callback({
				code: "createRoom/students_are_not_teachers",
				message: "Elever kan inte skapa rum",
			});
		}

		// User is not connected to a room
		if (user.room) {
			delete rooms[user.room];
			socket.leave(user.room);
		}

		user.teacher = true;
		user.room = generateRoom(user.id).id;

		socket.join(user.room);

		return callback(null, user.room);
	});

	socket.on("handToggle", (callback) => {
		if (user.teacher) {
			let error = {
				code: "handToggle/teachers_are_not_students",
				message: "Lärare kan inte räcka upp handen",
			};

			if (callback && typeof callback === "function") {
				callback(error);
			} else {
				socket.emit("error", error);
			}
		}

		if (user.id && user.name && user.room) {
			if (Object.keys(rooms).includes(user.room)) {
				user.handUp = !user.handUp;

				if (callback && typeof callback === "function") {
					callback(null, user);
				} else {
					socket.emit("handStatus", null, ser);
				}

				let teacherId = rooms[user.room].teacherId;
				socket.broadcast.to(teacherId).emit("handStatus", null, user);
			}
		} else {
			let error = {
				code: "handToggle/invalid_user",
				message: "Användaren är inte komplett",
			};

			if (callback && typeof callback === "function") {
				callback(error);
			} else {
				socket.emit("error", error);
			}
		}
	});

	socket.on("kick", (studentId) => {
		if (user.teacher && studentId && typeof studentId === "string") {
			if (Object.keys(io.sockets.sockets).includes(studentId)) {
				let student = io.sockets.sockets[studentId].handsup;

				student.handUp = false;

				socket.emit("handStatus", null, student);
				socket.broadcast.to(studentId).emit("handStatus", null, student);
			}
		} else {
			socket.emit("error", {
				code: "kick/students_are_not_teachers",
				message: "Elever får inte ta ner handen åt någon annan",
			});
		}
	});

	socket.on("disconnect", () => {
		if (user.teacher) {
			delete rooms[user.room];
			socket.to(user.room).emit("teacherExit", user.id);
		} else {
			socket.to(user.room).emit("exit", user.id);
		}
	});
});
