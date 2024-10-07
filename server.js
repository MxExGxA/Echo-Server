const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4 } = require("uuid");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const { configDotenv } = require("dotenv");
const cors = require("cors");
const app = express();

//https cert & key files

// const key = fs.readFileSync("cert.key");
// const cert = fs.readFileSync("cert.crt");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8,
});

configDotenv();

app.use(cors());

//file download route
app.use("/file", require("./routes/downloadRoute"));

//env variables
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME;
const port = process.env.PORT || 443;

//validate username
const validUsername = (username) => {
  const trimmedUsername = username.trim();
  const validLength = validator.isLength(trimmedUsername, { min: 3, max: 20 });
  return validLength;
};

//echos data object
let echos = {};

io.on("connection", (socket) => {
  //when user disconnects
  socket.on("disconnect", () => {
    //push a user left message in the messages history with his data
    if (socket.room) {
      echos[socket.room].messages.push({
        type: "info",
        fromID: socket.id,
        fromName: echos[socket.room].members.find(
          (member) => member.id === socket.id
        ).name,
        message: "left.",
      });

      //remove the member who left from this echo members array
      echos[socket.room].members = echos[socket.room].members?.filter(
        (m) => m.id !== socket.id
      );

      //remove media
      delete echos[socket.room].media[socket.id];

      //check if the admin is the one who left
      const admin = echos[socket.room].members?.find((m) => m.isAdmin);
      const members = echos[socket.room].members;

      //if the admin has left, promote the first member in the array to admin
      if (!admin && members.length) {
        echos[socket.room].members[0] = {
          ...echos[socket.room].members[0],
          isAdmin: true,
        };
      }

      //send updated echo data to echo members
      io.to(socket.room).emit("memberLeft", {
        id: socket.id,
        members: echos[socket.room].members,
        messages: echos[socket.room].messages,
        media: echos[socket.room].media,
      });

      //delete echo messages, files and another stuff if all members had left

      if (!members.length) {
        delete echos[socket.room];

        fs.rm(
          path.join(__dirname, "tmp", "upload", socket.room),
          { recursive: true, force: true },
          (err) => {}
        );
      }
    }
  });

  //create new echo
  socket.on("createEcho", (opts) => {
    //if echo isn't exist, create new echo
    if (!io.sockets.adapter.rooms.has(opts.echoID)) {
      if (validUsername(opts.creator.name)) {
        socket.join(opts.echoID);
        socket.room = opts.echoID;
        echos[opts.echoID] = {
          members: [{ ...opts.creator, isAdmin: true }],
          messages: [
            {
              type: "info",
              fromID: opts.creator.id,
              fromName: opts.creator.name,
              message: "Created this echo.",
            },
          ],
          editor: {
            language: { language: "javascript", version: "1.32.3" },
            code: "",
          },
          media: {
            [opts.creator.id]: {
              camera: { id: "", toggle: false },
              screen: { id: "", toggle: false },
              mic: { id: "", toggle: false },
            },
          },
        };
        socket.emit("echoCreated", echos[opts.echoID]);
      } else {
        socket.emit("invalidData", opts.echoID);
      }
    } else {
      //if echo is exist, give choice if user wanna join it
      socket.emit("echoExists", { echoID: opts.echoID });
    }
  });

  //join echo
  socket.on("joinEcho", (opts) => {
    //check if echo exists
    if (io.sockets.adapter.rooms.has(opts.echoID)) {
      if (echos[opts.echoID].members.length < 4) {
        if (validUsername(opts.member.name)) {
          const echoAdmin = echos[opts.echoID].members?.find(
            (m) => m.isAdmin
          ).id;

          //check if there is members with same name
          let counter = 0;
          const sameNameCheck = (name) => {
            let exist = echos[opts.echoID].members.find(
              (member) => member.name === `${name}${counter ? counter : ""}`
            );
            while (exist) {
              counter++;
              exist = echos[opts.echoID].members.find(
                (member) => member.name === `${name}${counter ? counter : ""}`
              );
            }
            return `${name}${counter ? counter : ""}`;
          };
          opts.member.name = sameNameCheck(opts.member.name);

          socket.to(echoAdmin).emit("joinRequest", opts);
        } else {
          socket.emit("invalidData", opts.echoID);
        }
      } else {
        socket.emit("limitReached");
      }
    } else {
      //if not exist
      socket.emit("echoNotFound", opts.echoID);
    }
  });

  //when join request denied, send request denied message to the denied member
  socket.on("requestDenied", (opts) => {
    socket.to(opts.member.id).emit("joinRequestDenied");
  });

  //when join request approved
  socket.on("requestApproved", (opts) => {
    const approvedSocket = io.sockets.sockets.get(opts.member.id);
    if (approvedSocket) {
      approvedSocket.join(opts.echoID);
      approvedSocket.room = opts.echoID;
      echos[opts.echoID].members.push(opts.member);
      echos[opts.echoID].messages.push({
        type: "info",
        fromID: approvedSocket.id,
        fromName: opts.member.name,
        message: "joined.",
      });
      echos[opts.echoID].media[approvedSocket.id] = {
        camera: { id: "", toggle: false },
        screen: { id: "", toggle: false },
        mic: { id: "", toggle: false },
      };

      socket.to(opts.member.id).emit("joinRequestApproved", echos[opts.echoID]);
      approvedSocket.to(opts.echoID).emit("memberJoined", {
        echo: echos[opts.echoID],
        member: opts.member,
      });
    }
  });

  //kicking members
  socket.on("kickMember", (opts) => {
    //check if this socket is admin
    const kicker = echos[opts.echoID].members.find(
      (member) => member.id === socket.id
    );

    const isAdmin = kicker.isAdmin;

    if (isAdmin) {
      //kicking member process here
      const message = {
        type: "info",
        fromID: socket.id,
        fromName: kicker.name,
        message: `kicked ${opts.member.name}`,
      };
      echos[opts.echoID].messages.push(message);
      socket.to(opts.echoID).emit("memberKicked", opts);
      io.to(opts.echoID).emit("echoMessage", message);
    }
  });

  //Messaging
  socket.on("echoMessage", (opts) => {
    echos[socket.room].messages.push(opts);
    socket.to(socket.room).emit("echoMessage", opts);
  });

  //file sharing
  socket.on("upload", (opts, callback) => {
    //find sender name by id
    const fromName = echos[opts.echoID].members.find(
      (m) => m.id === opts.fromID
    ).name;

    const fromID = opts.fromID;

    //make a directory and name it as echo's id, to store uploaded echo files in
    fs.mkdir(
      path.join(__dirname, "tmp", "upload", opts.echoID),
      { recursive: true },
      (err) => {}
    );

    //generate uuid as a file name + file extention
    const fileName = v4() + "." + opts.fileExtention;

    //save the received file to /tmp/upload/[echoID] directory
    fs.writeFile(
      path.join(__dirname, "tmp", "upload", `${opts.echoID}`, fileName),
      opts.fileData,
      (err) => {
        callback({
          state: err ? "failure" : "success",
          message: {
            type: "file",
            fromID,
            fromName,
            message: `${opts.fileName}::${opts.echoID}/${fileName}`,
          },
        });
        //if successfuly saved, push the file name into chat history
        if (!err) {
          echos[opts.echoID].messages.push({
            type: "file",
            fromID,
            fromName,
            message: `${opts.fileName}::${opts.echoID}/${fileName}`,
          });
          socket.to(opts.echoID).emit("echoMessage", {
            type: "file",
            fromID,
            fromName,
            message: `${opts.fileName}::${opts.echoID}/${fileName}`,
          });
        }
      }
    );
  });

  //code Editor
  socket.on("editorLangChanged", (opts) => {
    socket.to(opts.echoID).emit("editorLangChanged", opts.language);
    echos[opts.echoID].editor.language = opts.language;
  });

  socket.on("editorCodeChanged", (opts) => {
    socket.to(opts.echoID).emit("editorCodeChanged", opts.value);
    echos[opts.echoID].editor.code = opts.value;
  });

  /*
///////////////////
  calls
//////////////////
*/

  //handling call signals
  socket.on("signal", (opts) => {
    socket.to(opts.to).emit("signal", opts);
  });

  //screen sharing
  socket.on("screenShare", (opts) => {
    io.to(opts.echoID).emit("screenShare", opts);
  });

  socket.on("stopScreenShare", (opts) => {
    io.to(opts.echoID).emit("stopScreenShare", opts);
  });

  //handling member media
  socket.on("media", (opts) => {
    echos[opts.echoID].media[opts.memberID][opts.mediaType] = {
      id: opts.trackID,
      toggle: opts.mediaVal,
    };
    socket.to(opts.echoID).emit("media", echos[opts.echoID].media);
  });
});

server.listen(port, () => {
  console.log("server is running on port", port);
});
