"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEditorCodeChange = exports.handleEditorLangChange = exports.handleUploadFile = exports.handleMessaging = exports.handleKickMember = exports.handleRequestApproved = exports.handleRequestDenied = exports.handleJoinEcho = exports.handleCreateEcho = exports.handleSocketDisconnect = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const validation_1 = require("../user/validation");
const uuid_1 = require("uuid");
const config_1 = require("../../lib/mediasoup/config");
//handle socket disconnect function
/**
 *
 * @param socket socket
 * @param io socket server instance
 * @param echo current socket echo
 * @param echos all echos object
 */
const handleSocketDisconnect = (socket, io, echo, echos) => {
    var _a, _b;
    console.log("Socket has Disconnected,", socket.id);
    try {
        if (echo) {
            //get member name
            const fromName = echo.members.find((member) => member.id === socket.id).name;
            //add member left message with his details
            echo.messages.push({
                type: "info",
                fromID: socket.id,
                fromName,
                message: "left.",
            });
            //remove the member who left from this echo members array
            echo.members = (_a = echo.members) === null || _a === void 0 ? void 0 : _a.filter((m) => m.id !== socket.id);
            //delete his media properties also
            delete echo.media[socket.id];
            //get the admin of this echo
            const admin = (_b = echo.members) === null || _b === void 0 ? void 0 : _b.find((member) => member.isAdmin);
            //get the echo members array length
            const membersLen = echo.members.length;
            //if the admin has left, promote the first member in the array to admin
            if (!admin && membersLen) {
                echo.members[0] = Object.assign(Object.assign({}, echo.members[0]), { isAdmin: true });
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
                fs.rm(path.join(process.cwd(), "tmp", "upload", socket.echo), { recursive: true, force: true }, (err) => {
                    console.log("Error while deleting", socket.echo, "Files!!");
                });
            }
        }
    }
    catch (err) {
        console.log("error occurred while socket disconnecting,", err);
    }
};
exports.handleSocketDisconnect = handleSocketDisconnect;
//handle create new echo function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echos all echos object
 * @param worker next worker
 */
const handleCreateEcho = (opts, io, socket, echos, worker) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //check if echo is not exist
        if (!io.sockets.adapter.rooms.has(opts.echoID)) {
            //check if the username is valid
            if ((0, validation_1.validUsername)(opts.creator.name)) {
                //socket joins room with echo's id
                socket.join(opts.echoID);
                socket.echo = opts.echoID;
                //create mediasoup router
                const echoRouter = yield worker.createRouter(config_1.config.mediaSoup.router);
                //initiate echo data
                echos[opts.echoID] = {
                    members: [Object.assign(Object.assign({}, opts.creator), { isAdmin: true })],
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
                };
                //when create the echo, send echoCreated message to the user
                socket.emit("echoCreated", echos[opts.echoID]);
            }
            //if username is not valid
            else {
                socket.emit("invalidData", opts.echoID);
            }
        }
        else {
            //if echo is exist, return echo exists message
            socket.emit("echoExists", { echoID: opts.echoID });
        }
    }
    catch (err) {
        console.log("error occurred while creating new echo!", err);
    }
});
exports.handleCreateEcho = handleCreateEcho;
//handle member join echo function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echo current socket echo
 */
const handleJoinEcho = (opts, io, socket, echo) => {
    try {
        //check if echo exists
        if (io.sockets.adapter.rooms.has(opts.echoID)) {
            //check if echo is not full > MAX=4
            if (echo.members.length < 4) {
                //check if valid username
                if ((0, validation_1.validUsername)(opts.member.name)) {
                    //check if there is members with same name, if found add count to the name
                    //example: john, john1, john2, etc
                    opts.member.name = (0, validation_1.sameNameCheck)(opts.member.name, echo);
                    //get admin of this echo, to send join requests to him
                    const echoAdmin = echo.members.find((m) => m.isAdmin);
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
    }
    catch (err) {
        console.log("error occurred while joining the echo!", err);
    }
};
exports.handleJoinEcho = handleJoinEcho;
//handle on join request denied function
/**
 *
 * @param opts options
 * @param socket socket
 */
const handleRequestDenied = (opts, socket) => {
    socket.to(opts.member.id).emit("joinRequestDenied");
};
exports.handleRequestDenied = handleRequestDenied;
//handle on join request approved function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echo current socket echo
 */
const handleRequestApproved = (opts, io, socket, echo) => {
    try {
        //get approved member socket
        const approvedSocket = io.sockets.sockets.get(opts.member.id);
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
    }
    catch (err) {
        console.log("error occurred while handling joining echo!", err);
    }
};
exports.handleRequestApproved = handleRequestApproved;
//handle kick member function
/**
 *
 * @param opts options
 * @param io socket server instance
 * @param socket socket
 * @param echos  all echos object
 */
const handleKickMember = (opts, io, socket, echos) => {
    try {
        //check if this socket is admin
        const kicker = echos[opts.echoID].members.find((member) => member.id === socket.id);
        if (kicker === null || kicker === void 0 ? void 0 : kicker.isAdmin) {
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
    }
    catch (err) {
        console.log("error occurred while kicking member!", err);
    }
};
exports.handleKickMember = handleKickMember;
//handle send and receive messages function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
const handleMessaging = (opts, socket, echo) => {
    echo.messages.push(opts);
    socket.to(socket.echo).emit("echoMessage", opts);
};
exports.handleMessaging = handleMessaging;
//handle file upload function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 * @param callback socket callback function
 */
const handleUploadFile = (opts, socket, echo, callback) => {
    try {
        //find sender name by id
        const fromName = echo.members.find((m) => m.id === opts.fromID).name;
        const fromID = opts.fromID;
        //make a directory and name it as echo's id, to store uploaded echo files in
        fs.mkdir(path.join(process.cwd(), "tmp", "upload", opts.echoID), { recursive: true }, (err) => {
            console.log(err);
        });
        //generate uuid as a file name + file extention
        const fileName = (0, uuid_1.v4)() + "." + opts.fileExtention;
        //save the received file to /tmp/upload/[echoID] directory
        fs.writeFile(path.join(process.cwd(), "tmp", "upload", `${opts.echoID}`, fileName), opts.fileData, (err) => {
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
        });
    }
    catch (err) {
        console.log("error occurred while uploading the file!", err);
    }
};
exports.handleUploadFile = handleUploadFile;
/*handle code Editor functions
*------------------------------------------------
handle on code editor language change function*/
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
const handleEditorLangChange = (opts, socket, echo) => {
    socket.to(opts.echoID).emit("editorLangChanged", opts.language);
    echo.editor.language = opts.language;
};
exports.handleEditorLangChange = handleEditorLangChange;
//handle on code editor code change function
/**
 *
 * @param opts options
 * @param socket socket
 * @param echo current socket echo
 */
const handleEditorCodeChange = (opts, socket, echo) => {
    socket.to(opts.echoID).emit("editorCodeChanged", opts.value);
    echo.editor.code = opts.value;
};
exports.handleEditorCodeChange = handleEditorCodeChange;
//-----------------------------------------------
