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
exports.connectTransport = exports.createTransport = exports.getRouterRtpCapabilities = exports.loadNextWorker = exports.createWorkers = void 0;
const mediasoup = __importStar(require("mediasoup"));
const config_1 = require("../../lib/mediasoup/config");
/**
 *
 * @param workerConfig
 * @returns mediasoup worker array
 */
const createWorkers = (workerConfig) => __awaiter(void 0, void 0, void 0, function* () {
    const workers = [];
    for (let i = 0; i < config_1.config.mediaSoup.workersNumber; i++) {
        const worker = yield mediasoup.createWorker(config_1.config.mediaSoup.worker);
        workers.push(worker);
    }
    return workers;
});
exports.createWorkers = createWorkers;
/**
 *
 * @param currentWorkerIdx
 * @param workers
 * @returns [current worker, next worker index]
 */
const loadNextWorker = (currentWorkerIdx, workers) => {
    currentWorkerIdx < workers.length - 1
        ? currentWorkerIdx++
        : (currentWorkerIdx = 0);
    return [workers[currentWorkerIdx], currentWorkerIdx];
};
exports.loadNextWorker = loadNextWorker;
/**
 *
 * @param echo
 * @returns router rtp capabilities
 */
const getRouterRtpCapabilities = (echo) => {
    return echo.router.rtpCapabilities;
};
exports.getRouterRtpCapabilities = getRouterRtpCapabilities;
const createTransport = (router) => __awaiter(void 0, void 0, void 0, function* () {
    const transport = yield router.createWebRtcTransport(config_1.config.mediaSoup.webRtcTransport);
    const params = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    };
    return { transport, params };
});
exports.createTransport = createTransport;
/**
 *
 * @param transport
 * @param dtlsParameters
 */
const connectTransport = (transport, dtlsParameters) => __awaiter(void 0, void 0, void 0, function* () {
    yield transport.connect({ dtlsParameters });
});
exports.connectTransport = connectTransport;
