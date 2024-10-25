import * as mediasoup from "mediasoup";
import { types as mediaSoupTypes } from "mediasoup";
import { config } from "../../lib/mediasoup/config";
import { EchoType } from "../../lib/types/echoTypes";
import { RtpCapabilities } from "mediasoup/node/lib/RtpParameters";

/**
 *
 * @param workerConfig
 * @returns mediasoup worker array
 */
export const createWorkers = async (
  workerConfig: mediaSoupTypes.WorkerSettings
): Promise<mediaSoupTypes.Worker[]> => {
  const workers: mediaSoupTypes.Worker[] = [];
  for (let i = 0; i < config.mediaSoup.workersNumber; i++) {
    const worker = await mediasoup.createWorker(config.mediaSoup.worker);
    workers.push(worker);
  }
  return workers;
};

/**
 *
 * @param currentWorkerIdx
 * @param workers
 * @returns [current worker, next worker index]
 */
export const loadNextWorker = (
  currentWorkerIdx: number,
  workers: mediaSoupTypes.Worker[]
): (mediaSoupTypes.Worker | number)[] => {
  currentWorkerIdx < workers.length - 1
    ? currentWorkerIdx++
    : (currentWorkerIdx = 0);
  return [workers[currentWorkerIdx], currentWorkerIdx];
};

/**
 *
 * @param echo
 * @returns router rtp capabilities
 */
export const getRouterRtpCapabilities = (echo: EchoType): RtpCapabilities => {
  return echo.router.rtpCapabilities;
};

export const createTransport = async (router: mediaSoupTypes.Router) => {
  const transport = await router.createWebRtcTransport(
    config.mediaSoup.webRtcTransport
  );

  const params = {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };

  return { transport, params };
};

/**
 *
 * @param transport
 * @param dtlsParameters
 */
export const connectTransport = async (
  transport: mediaSoupTypes.WebRtcTransport,
  dtlsParameters: mediaSoupTypes.DtlsParameters
) => {
  await transport.connect({ dtlsParameters });
};
