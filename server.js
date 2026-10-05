const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더의 index.html 제공
app.use(express.static(path.join(__dirname, "public")));

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("사용자 접속:", socket.id);

    // 대기자가 없으면 대기
    if (waitingUser === null) {
        waitingUser = socket;

        console.log("사용자 대기 중");
        socket.emit("waiting");
    }

    // 대기자가 있으면 1:1 매칭
    else {
        const otherUser = waitingUser;

        waitingUser = null;

        socket.partner = otherUser;
        otherUser.partner = socket;

        console.log("두 사용자 매칭");

        socket.emit("matched");
        otherUser.emit("matched");
    }

    // 메시지 전달
    socket.on("message", (message) => {
        if (socket.partner) {
            socket.partner.emit("message", message);
        }
    });

    // 연결 종료
    socket.on("disconnect", () => {
        console.log("사용자 퇴장:", socket.id);

        // 대기 중인 사용자였다면 대기 취소
        if (waitingUser === socket) {
            waitingUser = null;
        }

        // 상대방에게 퇴장 알림
        if (socket.partner) {
            socket.partner.emit("partnerLeft");
            socket.partner.partner = null;
        }
    });
});

// Render가 지정하는 포트를 사용
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`서버 실행 중: ${PORT}`);
});
