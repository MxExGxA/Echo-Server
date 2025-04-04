import express from "express";
import * as https from "https";
import { Server, Socket } from "socket.io";
import { configDotenv } from "dotenv";
import cors from "cors";
import fileRouter from "./routes/fileRoute";
import { EchoType, SocketWithEchoType } from "./lib/types/echoTypes";
import {
  handleCreateEcho,
  handleEditorCodeChange,
  handleEditorLangChange,
  handleJoinEcho,
  handleKickMember,
  handleMakeAdmin,
  handleMessaging,
  handleRequestApproved,
  handleRequestDenied,
  handleSocketDisconnect,
  handleUploadFile,
} from "./utils/echo/helpers";
import {
  connectTransport,
  createTransport,
  createWorkers,
  getRouterRtpCapabilities,
  loadNextWorker,
} from "./utils/mediasoup/helpers";
import { config } from "./lib/mediasoup/config";
import { types as mediaSoupTypes } from "mediasoup";
import https_options from "./lib/ssl/httpsOptions";

//configure dot env variables
configDotenv();

//create express app
const app = express();

//create http server
const server = https.createServer(https_options, app);

//configure cors
app.use(cors());

//file download route
app.use("/file", fileRouter);

//env vars
const hostname: string = process.env.HOSTNAME as string;
const PORT: number = (process.env.PORT || 443) as number;

//init echos object
const echos: { [key: string]: EchoType } = {};

//create socket.io server
const io: Server = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8,
});

(async () => {
  //create mediasoup workers array => WORKER=CPU-THREAD
  let currentWorkerIdx = 0;
  const workers = await createWorkers(config.mediaSoup.worker);

  //listening for socket connection event => Main Loop
  io.on("connection", (socket: Socket) => {
    console.log("New Socket Connected,", socket.id);

    //custom socket with echo property
    const socketWithEcho = socket as SocketWithEchoType;
    socketWithEcho.echo = "";

    //handle socket disconnect
    socket.on("disconnect", () =>
      handleSocketDisconnect(
        socketWithEcho,
        io,
        echos[socketWithEcho.echo],
        echos
      )
    );

    //handle create new echo
    socket.on("createEcho", (opts) => {
      const [worker, idx] = loadNextWorker(currentWorkerIdx, workers);
      currentWorkerIdx = idx as number;
      handleCreateEcho(
        opts,
        io,
        socketWithEcho,
        echos,
        worker as mediaSoupTypes.Worker
      );
    });

    //handle join echo
    socket.on("joinEcho", (opts) => {
      handleJoinEcho(opts, io, socketWithEcho, echos[opts.echoID]);
    });

    //handle join request denied
    socket.on("requestDenied", (opts) => {
      handleRequestDenied(opts, socketWithEcho);
    });

    //handle join request approved
    socket.on("requestApproved", (opts) => {
      handleRequestApproved(opts, io, socketWithEcho, echos[opts.echoID]);
    });

    //handle make admin
    socket.on("makeAdmin", (opts) => {
      handleMakeAdmin(opts, io, socketWithEcho, echos[opts.echoID]);
    });

    //handle kick echo member
    socket.on("kickMember", (opts) => {
      handleKickMember(opts, io, socketWithEcho, echos);
    });

    //handle messaging
    socket.on("echoMessage", (opts) => {
      handleMessaging(opts, socketWithEcho, echos[socketWithEcho.echo]);
    });

    //handle upload files
    socket.on("upload", (opts, callback) => {
      handleUploadFile(
        opts,
        socketWithEcho,
        echos[socketWithEcho.echo],
        callback
      );
    });

    /**
     * handle code editor
     */
    //on lang change
    socket.on("editorLangChanged", (opts) => {
      handleEditorLangChange(opts, socketWithEcho, echos[socketWithEcho.echo]);
    });

    //on code change
    socket.on("editorCodeChanged", (opts) => {
      handleEditorCodeChange(opts, socketWithEcho, echos[socketWithEcho.echo]);
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
      callback(getRouterRtpCapabilities(echos[socketWithEcho.echo]));
    });

    /**
     * Producer Transport process
     */
    socketWithEcho.on("createProducerTransport", async (callback) => {
      try {
        //create producer transport
        const { transport, params } = await createTransport(
          echos[socketWithEcho.echo].router
        );

        //add the producer transport to echo object
        echos[socketWithEcho.echo].transports[
          socketWithEcho.id
        ].producerTransport = transport;

        callback(params);
      } catch (err) {
        callback({ error: err });
      }
    });

    //connecting the producer transport
    socketWithEcho.on(
      "connectProducerTransport",
      async ({ dtlsParameters }, callback) => {
        try {
          const transport =
            echos[socketWithEcho.echo].transports[socketWithEcho.id]
              .producerTransport;

          if (!transport) {
            callback({ error: "no producer transport found" });
            return;
          }

          await connectTransport(transport, dtlsParameters);
          callback({ status: "success" });
        } catch (err) {
          callback({ error: err });
        }
      }
    );

    //starting produce
    socketWithEcho.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback) => {
        try {
          const transport =
            echos[socketWithEcho.echo].transports[socketWithEcho.id]
              .producerTransport;

          if (!transport) {
            callback({ error: "no producer transport found" });
            return;
          }

          //create producer with kind and rtp received from client
          const producer = await transport.produce({
            kind,
            rtpParameters,
            paused: false,
          });

          //push producer to user producers array
          echos[socketWithEcho.echo].producers[socketWithEcho.id].push({
            id: producer.id,
            appData: { ...appData },
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
        } catch (err) {
          console.log(err);
          callback({ error: err });
        }
      }
    );

    /**
     * Consumer Transport process
     */
    socketWithEcho.on("createConsumerTransport", async (callback) => {
      try {
        //create consumer transport
        const { transport, params } = await createTransport(
          echos[socketWithEcho.echo].router
        );

        //add the consumer transport to echo object
        echos[socketWithEcho.echo].transports[
          socketWithEcho.id
        ].consumerTransport = transport;

        callback(params);
      } catch (err) {
        callback({ error: err });
      }
    });

    //connecting the consumer transport
    socketWithEcho.on(
      "connectConsumerTransport",
      async ({ dtlsParameters }, callback) => {
        try {
          const transport =
            echos[socketWithEcho.echo].transports[socketWithEcho.id]
              .consumerTransport;

          if (!transport) {
            callback({ error: "no consumer transport found" });
            return;
          }

          await connectTransport(transport, dtlsParameters);
          callback({ status: "success" });
        } catch (err) {
          callback({ error: err });
        }
      }
    );

    //starting consume
    socketWithEcho.on(
      "consume",
      async ({ rtpCapabilities, producerId }, callback) => {
        //create consumer
        try {
          if (
            echos[socketWithEcho.echo].router.canConsume({
              rtpCapabilities,
              producerId,
            })
          ) {
            const transport =
              echos[socketWithEcho.echo].transports[socketWithEcho.id]
                .consumerTransport;

            if (!transport) {
              callback({ error: "no consumer transport found" });
              return;
            }

            const consumer = await transport.consume({
              producerId,
              rtpCapabilities,
              paused: true,
            });

            socketWithEcho.on("resumeConsumer", async (opts) => {
              if (opts.id === consumer.id) {
                await consumer.resume();
              }
            });

            callback({
              consumerId: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });
          }
        } catch (err) {
          callback({ error: err });
        }
      }
    );

    //restarting ice on connection failed or disconnected
    socketWithEcho.on("restartIce", async ({ type }, callback) => {
      let transport;
      if (type === "producer") {
        transport =
          echos[socketWithEcho.echo].transports[socketWithEcho.id]
            ?.producerTransport;
      }
      if (type === "consumer") {
        transport =
          echos[socketWithEcho.echo].transports[socketWithEcho.id]
            ?.consumerTransport;
      }

      if (!transport) {
        return callback({ error: "Transport not found" });
      }

      try {
        const iceParams = await transport.restartIce();
        callback({ iceParams });
      } catch (err) {
        callback({ error: err });
      }
    });

    //screen sharing
    socketWithEcho.on("screenShare", (opts) => {
      io.to(opts.echoID).emit("screenShare", opts);
    });

    socketWithEcho.on("stopScreenShare", (opts) => {
      io.to(opts.echoID).emit("stopScreenShare", opts);
    });

    //handling member media
    socketWithEcho.on("media", (opts) => {
      echos[opts.echoID].media[opts.memberID][
        opts.mediaType as "camera" | "mic" | "screen"
      ] = {
        id: opts.trackID,
        toggle: opts.mediaVal,
      };
      socket.to(opts.echoID).emit("media", echos[opts.echoID].media);
    });
  });
})();

//http server start listening
server.listen(PORT, () => {
  console.log("socket server is running on port", PORT);
});
