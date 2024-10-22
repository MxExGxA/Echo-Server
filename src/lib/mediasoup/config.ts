import * as os from "os";
import { types as mediaSoupTypes } from "mediasoup";
import { TransportListenInfo } from "mediasoup/node/lib/types";

export const config = {
  listenIp: "0.0.0.0",
  listenPort: 3016,
  mediaSoup: {
    workersNumber: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: "debug" as mediaSoupTypes.WorkerLogLevel,
      logTags: [
        "info",
        "ice",
        "dtls",
        "rtp",
        "srtp",
        "rtcp",
      ] as mediaSoupTypes.WorkerLogTag[],
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
      ] as mediaSoupTypes.RtpCodecCapability[],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: "127.0.0.1", // will be replaced by vps public ip/domain
        },
      ] as TransportListenInfo[],
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
