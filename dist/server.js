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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const https = __importStar(require("https"));
const socket_io_1 = require("socket.io");
const dotenv_1 = require("dotenv");
const cors_1 = __importDefault(require("cors"));
const fileRoute_1 = __importDefault(require("./routes/fileRoute"));
const helpers_1 = require("./utils/echo/helpers");
const helpers_2 = require("./utils/mediasoup/helpers");
const config_1 = require("./lib/mediasoup/config");
const httpsOptions_1 = __importDefault(require("./lib/ssl/httpsOptions"));
//configure dot env variables
(0, dotenv_1.configDotenv)();
//create express app
const app = (0, express_1.default)();
//create http server
const server = https.createServer(httpsOptions_1.default, app);
//configure cors
app.use((0, cors_1.default)());
//file download route
app.use("/file", fileRoute_1.default);
//env vars
const hostname = process.env.HOSTNAME;
const PORT = (process.env.PORT || 443);
//init echos object
const echos = {};
//create socket.io server
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8,
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    //create mediasoup workers array => WORKER=CPU-THREAD
    let currentWorkerIdx = 0;
    const workers = yield (0, helpers_2.createWorkers)(config_1.config.mediaSoup.worker);
    //listening for socket connection event => Main Loop
    io.on("connection", (socket) => {
        console.log("New Socket Connected,", socket.id);
        //custom socket with echo property
        const socketWithEcho = socket;
        socketWithEcho.echo = "";
        //handle socket disconnect
        socket.on("disconnect", () => (0, helpers_1.handleSocketDisconnect)(socketWithEcho, io, echos[socketWithEcho.echo], echos));
        //handle create new echo
        socket.on("createEcho", (opts) => {
            const [worker, idx] = (0, helpers_2.loadNextWorker)(currentWorkerIdx, workers);
            currentWorkerIdx = idx;
            (0, helpers_1.handleCreateEcho)(opts, io, socketWithEcho, echos, worker);
        });
        //handle join echo
        socket.on("joinEcho", (opts) => {
            (0, helpers_1.handleJoinEcho)(opts, io, socketWithEcho, echos[opts.echoID]);
        });
        //handle join request denied
        socket.on("requestDenied", (opts) => {
            (0, helpers_1.handleRequestDenied)(opts, socketWithEcho);
        });
        //handle join request approved
        socket.on("requestApproved", (opts) => {
            (0, helpers_1.handleRequestApproved)(opts, io, socketWithEcho, echos[opts.echoID]);
        });
        //handle make admin
        socket.on("makeAdmin", (opts) => {
            (0, helpers_1.handleMakeAdmin)(opts, io, socketWithEcho, echos[opts.echoID]);
        });
        //handle kick echo member
        socket.on("kickMember", (opts) => {
            (0, helpers_1.handleKickMember)(opts, io, socketWithEcho, echos);
        });
        //handle messaging
        socket.on("echoMessage", (opts) => {
            (0, helpers_1.handleMessaging)(opts, socketWithEcho, echos[socketWithEcho.echo]);
        });
        //handle upload files
        socket.on("upload", (opts, callback) => {
            (0, helpers_1.handleUploadFile)(opts, socketWithEcho, echos[socketWithEcho.echo], callback);
        });
        /**
         * handle code editor
         */
        //on lang change
        socket.on("editorLangChanged", (opts) => {
            (0, helpers_1.handleEditorLangChange)(opts, socketWithEcho, echos[socketWithEcho.echo]);
        });
        //on code change
        socket.on("editorCodeChanged", (opts) => {
            (0, helpers_1.handleEditorCodeChange)(opts, socketWithEcho, echos[socketWithEcho.echo]);
        });
        /*
         * *******************************************************************************************************************************************************
         * ██╗  ██╗ █████╗ ███╗   ██╗██████╗ ██╗     ██╗███╗   ██╗ ██████╗    ███╗   ███╗███████╗██████╗ ██╗ █████╗      ██████╗ █████╗ ██╗     ██╗     ███████╗
         * ██║  ██║██╔══██╗████╗  ██║██╔══██╗██║     ██║████╗  ██║██╔════╝    ████╗ ████║██╔════╝██╔══██╗██║██╔══██╗    ██╔════╝██╔══██╗██║     ██║     ██╔════╝
         * ███████║███████║██╔██╗ ██║██║  ██║██║     ██║██╔██╗ ██║██║  ███╗   ██╔████╔██║█████╗  ██║  ██║██║███████║    ██║     ███████║██║     ██║     ███████╗
         * ██╔══██║██╔══██║██║╚██╗██║██║  ██║██║     ██║██║╚██╗██║██║   ██║   ██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║    ██║     ██╔══██║██║     ██║     ╚════██║
         * ██║  ██║██║  ██║██║ ╚████║██████╔╝███████╗██║██║ ╚████║╚██████╔╝   ██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║    ╚██████╗██║  ██║███████╗███████╗███████║
         * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝    ╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝     ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝
         * *******************************************************************************************************************************************************
         */
        //send RouterRtpCapabilities to the client
        socketWithEcho.on("getRouterRtpCapabilities", (callback) => {
            callback((0, helpers_2.getRouterRtpCapabilities)(echos[socketWithEcho.echo]));
        });
        /**
         * Producer Transport process
         */
        socketWithEcho.on("createProducerTransport", (callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                //create producer transport
                const { transport, params } = yield (0, helpers_2.createTransport)(echos[socketWithEcho.echo].router);
                //add the producer transport to echo object
                echos[socketWithEcho.echo].transports[socketWithEcho.id].producerTransport = transport;
                callback(params);
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //connecting the producer transport
        socketWithEcho.on("connectProducerTransport", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ dtlsParameters }, callback) {
            try {
                const transport = echos[socketWithEcho.echo].transports[socketWithEcho.id]
                    .producerTransport;
                if (!transport) {
                    callback({ error: "no producer transport found" });
                    return;
                }
                yield (0, helpers_2.connectTransport)(transport, dtlsParameters);
                callback({ status: "success" });
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //starting produce
        socketWithEcho.on("produce", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ kind, rtpParameters, appData }, callback) {
            try {
                const transport = echos[socketWithEcho.echo].transports[socketWithEcho.id]
                    .producerTransport;
                if (!transport) {
                    callback({ error: "no producer transport found" });
                    return;
                }
                //create producer with kind and rtp received from client
                const producer = yield transport.produce({
                    kind,
                    rtpParameters,
                    paused: false,
                });
                //push producer to user producers array
                echos[socketWithEcho.echo].producers[socketWithEcho.id].push({
                    id: producer.id,
                    appData: Object.assign({}, appData),
                    kind: producer.kind,
                });
                callback({ id: producer.id });
                //notify echo members
                socketWithEcho.to(socketWithEcho.echo).emit("incommingMedia", {
                    kind,
                    appData,
                    producerId: producer.id,
                    memberID: socketWithEcho.id,
                    rtpParameters: producer.rtpParameters,
                });
            }
            catch (err) {
                console.log(err);
                callback({ error: err });
            }
        }));
        /**
         * Consumer Transport process
         */
        socketWithEcho.on("createConsumerTransport", (callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                //create consumer transport
                const { transport, params } = yield (0, helpers_2.createTransport)(echos[socketWithEcho.echo].router);
                //add the consumer transport to echo object
                echos[socketWithEcho.echo].transports[socketWithEcho.id].consumerTransport = transport;
                callback(params);
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //connecting the consumer transport
        socketWithEcho.on("connectConsumerTransport", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ dtlsParameters }, callback) {
            try {
                const transport = echos[socketWithEcho.echo].transports[socketWithEcho.id]
                    .consumerTransport;
                if (!transport) {
                    callback({ error: "no consumer transport found" });
                    return;
                }
                yield (0, helpers_2.connectTransport)(transport, dtlsParameters);
                callback({ status: "success" });
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //starting consume
        socketWithEcho.on("consume", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ rtpCapabilities, producerId }, callback) {
            //create consumer
            try {
                if (echos[socketWithEcho.echo].router.canConsume({
                    rtpCapabilities,
                    producerId,
                })) {
                    const transport = echos[socketWithEcho.echo].transports[socketWithEcho.id]
                        .consumerTransport;
                    if (!transport) {
                        callback({ error: "no consumer transport found" });
                        return;
                    }
                    const consumer = yield transport.consume({
                        producerId,
                        rtpCapabilities,
                        paused: true,
                    });
                    socketWithEcho.on("resumeConsumer", (opts) => __awaiter(void 0, void 0, void 0, function* () {
                        if (opts.id === consumer.id) {
                            yield consumer.resume();
                        }
                    }));
                    callback({
                        consumerId: consumer.id,
                        producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    });
                }
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //restarting ice on connection failed or disconnected
        socketWithEcho.on("restartIce", (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ type }, callback) {
            var _b, _c;
            let transport;
            if (type === "producer") {
                transport =
                    (_b = echos[socketWithEcho.echo].transports[socketWithEcho.id]) === null || _b === void 0 ? void 0 : _b.producerTransport;
            }
            if (type === "consumer") {
                transport =
                    (_c = echos[socketWithEcho.echo].transports[socketWithEcho.id]) === null || _c === void 0 ? void 0 : _c.consumerTransport;
            }
            if (!transport) {
                return callback({ error: "Transport not found" });
            }
            try {
                const iceParams = yield transport.restartIce();
                callback({ iceParams });
            }
            catch (err) {
                callback({ error: err });
            }
        }));
        //screen sharing
        socketWithEcho.on("screenShare", (opts) => {
            io.to(opts.echoID).emit("screenShare", opts);
        });
        socketWithEcho.on("stopScreenShare", (opts) => {
            io.to(opts.echoID).emit("stopScreenShare", opts);
        });
        //handling member media
        socketWithEcho.on("media", (opts) => {
            echos[opts.echoID].media[opts.memberID][opts.mediaType] = {
                id: opts.trackID,
                toggle: opts.mediaVal,
            };
            socket.to(opts.echoID).emit("media", echos[opts.echoID].media);
        });
    });
}))();
//http server start listening
server.listen(PORT, () => {
    console.log("socket server is running on port", PORT);
});
