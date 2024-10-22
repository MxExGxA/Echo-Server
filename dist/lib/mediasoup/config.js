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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const os = __importStar(require("os"));
exports.config = {
    listenIp: "0.0.0.0",
    listenPort: 3016,
    mediaSoup: {
        workersNumber: Object.keys(os.cpus()).length,
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: "debug",
            logTags: [
                "info",
                "ice",
                "dtls",
                "rtp",
                "srtp",
                "rtcp",
            ],
        },
        router: {
            mediaCodecs: [
                {
                    kind: "audio",
                    mimeType: "audio/opus",
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: "video",
                    mimeType: "video/VP8",
                    clockRate: 90000,
                    parameters: {
                        "x-google-start-birate": 1000,
                    },
                },
            ],
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: "0.0.0.0",
                    announcedIp: "127.0.0.1", // will be replaced by vps public ip/domain
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun.l.google.com:5349" },
                { urls: "stun:stun1.l.google.com:3478" },
                {
                    urls: "turn:141.95.55.49:3478",
                    username: "test",
                    credential: "test123",
                },
            ],
        },
    },
};
