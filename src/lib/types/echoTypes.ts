import { Socket } from "socket.io";
import { types as mediaSoupTypes } from "mediasoup";

export interface MemberType {
  id: string;
  name: string;
  isAdmin?: boolean;
}

export interface MessageType {
  type: "info" | "chat" | "file";
  fromID: string;
  fromName: string;
  message: string;
}

export interface CodeEditorType {
  language: {
    language: string;
    version: string;
  };
  code: string;
}

export interface MediaType {
  [id: string]: {
    camera: { id: string; toggle: boolean };
    screen: { id: string; toggle: boolean };
    mic: { id: string; toggle: boolean };
  };
}

export interface transportsType {
  [id: string]: {
    producerTransport: mediaSoupTypes.WebRtcTransport | null;
    consumerTransport: mediaSoupTypes.WebRtcTransport | null;
  };
}

export interface producersType {
  [id: string]: ({ id: string; appData: {} } | null)[];
}

export interface EchoType {
  members: MemberType[];
  messages: MessageType[];
  editor: CodeEditorType;
  media: MediaType;
  router: mediaSoupTypes.Router;
  transports: transportsType;
  producers: producersType;
}

export interface EchosType {
  [key: string]: EchoType;
}

export interface SocketWithEchoType extends Socket {
  echo: string;
}
