import { Server, Socket } from "socket.io";
import * as fs from "fs";
import * as path from "path";
import {
  EchosType,
  EchoType,
  MemberType,
  MessageType,
  SocketWithEchoType,
} from "../../lib/types/echoTypes";
import { types as mediaSoupTypes } from "mediasoup";
import { sameNameCheck, validUsername } from "../user/validation";
import { v4 } from "uuid";
import { config } from "../../lib/mediasoup/config";

//handle socket disconnect function
/**
 *
 * @param socket socket
 * @param io socket server instance
 * @param echo current socket echo
 * @param echos all echos object
 */
export const handleSocketDisconnect = (
  socket: SocketWithEchoType,
  io: Server,
  echo: EchoType,
  echos: EchosType
): void => {
  console.log("Socket has Disconnected,", socket.id);
  try {
    if (echo) {
      //get member name
      const fromName = echo.members.find(
        (member) => member.id === socket.id
      )!.name;

      //add member left message with his details
      echo.messages.push({
        type: "info",
        fromID: socket.id,
        fromName,
        message: "left.",
      });

      //remove the member who left from this echo members array
      echo.members = echo.members?.filter((m) => m.id !== socket.id);

      //close user transports
      echo.transports[socket.id].producerTransport?.close();
      echo.transports[socket.id].consumerTransport?.close();

      //delete his media properties also
      delete echo.media[socket.id];

      //delete user transports and producers
      delete echo.transports[socket.id];
      delete echo.producers[socket.id];

      //get the admin of this echo
      const admin = echo.members?.find((member) => member.isAdmin);

      //get the echo members array length
      const membersLen = echo.members.length;

      //if the admin has left, promote the first member in the array to admin
      if (!admin && membersLen) {
        echo.members[0] = {
          ...echo.members[0],
          isAdmin: true,
        };
      }

      //is the echo still has members
      if (membersLen) {
        //send updated echo data to the exist echo members
        io.to(socket.echo).emit("memberLeft", {
          id: socket.id,
          members: echo.members,
          messages: echo.messages,
          media: echo.media,
        });
      }
      //if the echo is empty
      else {
        //delete echo messages, files and all the other stuff if all members left
        delete echos[socket.echo];
        fs.rm(
          path.join(process.cwd(), "tmp", "upload", socket.echo),
          { recursive: true, force: true },
          (err) => {
            console.log("Error while deleting", socket.echo, "Files!!");
          }
        );
      }
    }
  } catch (err) {
    console.log("error occurred while socket disconnecting,", err);
  }
};

//handle create new echo function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echos all echos object
 * @param worker next worker
 */
export const handleCreateEcho = async (
  opts: { echoID: string; creator: MemberType },
  io: Server,
  socket: SocketWithEchoType,
  echos: EchosType,
  worker: mediaSoupTypes.Worker
) => {
  try {
    //check if echo is not exist
    if (!io.sockets.adapter.rooms.has(opts.echoID)) {
      //check if the username is valid
      if (validUsername(opts.creator.name)) {
        //socket joins room with echo's id
        socket.join(opts.echoID);
        socket.echo = opts.echoID;

        //create mediasoup router
        const echoRouter = await worker.createRouter(config.mediaSoup.router);

        //initiate echo data
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
          router: echoRouter,
          transports: {
            [opts.creator.id]: {
              producerTransport: null,
              consumerTransport: null,
            },
          },
          producers: {
            [opts.creator.id]: [],
          },
        } as EchoType;
        //when create the echo, send echoCreated message to the user
        socket.emit("echoCreated", echos[opts.echoID]);
      }
      //if username is not valid
      else {
        socket.emit("invalidData", opts.echoID);
      }
    } else {
      //if echo is exist, return echo exists message
      socket.emit("echoExists", { echoID: opts.echoID });
    }
  } catch (err) {
    console.log("error occurred while creating new echo!", err);
  }
};

//handle member join echo function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echo current socket echo
 */
export const handleJoinEcho = (
  opts: { echoID: string; member: MemberType },
  io: Server,
  socket: SocketWithEchoType,
  echo: EchoType
): void => {
  try {
    //check if echo exists
    if (io.sockets.adapter.rooms.has(opts.echoID)) {
      //check if echo is not full > MAX=4
      if (echo.members.length < 4) {
        //check if valid username
        if (validUsername(opts.member.name)) {
          //check if there is members with same name, if found add count to the name
          //example: john, john1, john2, etc
          opts.member.name = sameNameCheck(opts.member.name, echo);

          //get admin of this echo, to send join requests to him
          const echoAdmin = echo.members!.find((m) => m.isAdmin);

          if (echoAdmin) {
            //if admin found, send him the join request
            socket.to(echoAdmin.id).emit("joinRequest", opts);
          }
        }
        //if username is not valid
        else {
          socket.emit("invalidData", opts.echoID);
        }
      }
      //if the echo is fulll
      else {
        socket.emit("limitReached");
      }
    }
    //if the echo is not exist
    else {
      socket.emit("echoNotFound", opts.echoID);
    }
  } catch (err) {
    console.log("error occurred while joining the echo!", err);
  }
};

//handle on join request denied function
/**
 *
 * @param opts options
 * @param socket socket
 */
export const handleRequestDenied = (
  opts: { member: MemberType },
  socket: Socket
): void => {
  socket.to(opts.member.id).emit("joinRequestDenied");
};

//handle on join request approved function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echo current socket echo
 */
export const handleRequestApproved = (
  opts: { echoID: string; member: MemberType },
  io: Server,
  socket: SocketWithEchoType,
  echo: EchoType
): void => {
  try {
    //get approved member socket
    const approvedSocket: SocketWithEchoType = io.sockets.sockets.get(
      opts.member.id
    ) as SocketWithEchoType;

    //if socket exists
    if (approvedSocket) {
      //make socket joins the echo
      approvedSocket.join(opts.echoID);
      approvedSocket.echo = opts.echoID;

      //update echo data with the new member data
      echo.members.push(opts.member);
      echo.messages.push({
        type: "info",
        fromID: approvedSocket.id,
        fromName: opts.member.name,
        message: "joined.",
      });

      echo.media[approvedSocket.id] = {
        camera: { id: "", toggle: false },
        screen: { id: "", toggle: false },
        mic: { id: "", toggle: false },
      };

      echo.transports[approvedSocket.id] = {
        producerTransport: null,
        consumerTransport: null,
      };

      echo.producers[approvedSocket.id] = [];
      socket.to(opts.member.id).emit("joinRequestApproved", echo);
      approvedSocket.to(opts.echoID).emit("memberJoined", {
        members: echo.members,
        messages: echo.messages,
        media: echo.media[approvedSocket.id],
        producers: echo.producers[approvedSocket.id],
        member: opts.member,
      });
    }
  } catch (err) {
    console.log("error occurred while handling joining echo!", err);
  }
};

//handle kick member function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echos  all echos object
 */
export const handleKickMember = (
  opts: { echoID: string; member: MemberType },
  io: Server,
  socket: SocketWithEchoType,
  echos: EchosType
): void => {
  try {
    //check if this socket is admin
    const kicker = echos[opts.echoID].members.find(
      (member) => member.id === socket.id
    );

    if (kicker?.isAdmin) {
      //kicking member process here
      const message: MessageType = {
        type: "info",
        fromID: socket.id,
        fromName: kicker.name,
        message: `kicked ${opts.member.name}`,
      };

      echos[opts.echoID].messages.push(message);
      socket.to(opts.echoID).emit("memberKicked", opts);
      io.to(opts.echoID).emit("echoMessage", message);
    }
  } catch (err) {
    console.log("error occurred while kicking member!", err);
  }
};

//handle send and receive messages function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
export const handleMessaging = (
  opts: MessageType,
  socket: SocketWithEchoType,
  echo: EchoType
): void => {
  echo.messages.push(opts);
  socket.to(socket.echo).emit("echoMessage", opts);
};

//handle file upload function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 * @param callback socket callback function
 */
export const handleUploadFile = (
  opts: {
    echoID: string;
    fromID: string;
    fileName: string;
    fileType: string;
    fileExtention: string;
    fileSize: number;
    fileData: string;
  },
  socket: SocketWithEchoType,
  echo: EchoType,
  callback: Function
): void => {
  try {
    //find sender name by id
    const fromName = echo.members.find((m) => m.id === opts.fromID)!.name;
    const fromID = opts.fromID;

    //make a directory and name it as echo's id, to store uploaded echo files in
    fs.mkdir(
      path.join(process.cwd(), "tmp", "upload", opts.echoID),
      { recursive: true },
      (err) => {
        console.log(err);
      }
    );

    //generate uuid as a file name + file extention
    const fileName = v4() + "." + opts.fileExtention;

    //save the received file to /tmp/upload/[echoID] directory
    fs.writeFile(
      path.join(process.cwd(), "tmp", "upload", `${opts.echoID}`, fileName),
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
          echo.messages.push({
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
  } catch (err) {
    console.log("error occurred while uploading the file!", err);
  }
};

/*handle code Editor functions
*------------------------------------------------
handle on code editor language change function*/
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
export const handleEditorLangChange = (
  opts: {
    echoID: string;
    language: { language: string; version: string };
  },
  socket: SocketWithEchoType,
  echo: EchoType
): void => {
  socket.to(opts.echoID).emit("editorLangChanged", opts.language);
  echo.editor.language = opts.language;
};
//handle on code editor code change function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
export const handleEditorCodeChange = (
  opts: { echoID: string; value: string },
  socket: SocketWithEchoType,
  echo: EchoType
): void => {
  socket.to(opts.echoID).emit("editorCodeChanged", opts.value);
  echo.editor.code = opts.value;
};
//-----------------------------------------------
