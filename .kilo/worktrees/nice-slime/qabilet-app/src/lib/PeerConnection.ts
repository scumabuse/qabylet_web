import { Peer } from "peerjs";

export class PeerConnection {
  private peer: Peer | null = null;
  private connection: any = null;
  private call: any = null;
  private stream: MediaStream | null = null;
  private roomCode: string;
  private isCreator: boolean;
  private onRemoteStream: (stream: MediaStream) => void;
  private onData: (data: string) => void;
  private onStatus: (status: string) => void;

  constructor(
    roomCode: string, 
    isCreator: boolean,
    stream: MediaStream, 
    onRemoteStream: (stream: MediaStream) => void,
    onData: (data: string) => void,
    onStatus: (status: string) => void
  ) {
    this.roomCode = roomCode;
    this.isCreator = isCreator;
    this.stream = stream;
    this.onRemoteStream = onRemoteStream;
    this.onData = onData;
    this.onStatus = onStatus;

    this.initPeer();
  }

  private initPeer() {
    // Joiner ID can be random to avoid conflicts, only Creator ID needs to be predictable
    const randomSuffix = Math.floor(Math.random() * 1000).toString();
    const myId = this.isCreator 
      ? `qabilet-${this.roomCode}-creator` 
      : `qabilet-${this.roomCode}-joiner-${randomSuffix}`;
    
    const otherId = `qabilet-${this.roomCode}-${this.isCreator ? 'joiner' : 'creator'}`;

    console.log(`Initializing Peer with ID: ${myId}`);
    this.peer = new Peer(myId, {
      debug: 1 // Only errors
    });

    // Cleanup on window close
    const cleanup = () => this.destroy();
    window.addEventListener('beforeunload', cleanup);

    this.peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      this.onStatus(this.isCreator ? "Waiting for joiner..." : "Connecting to creator...");
      
      if (!this.isCreator) {
        // As a joiner, we try to connect to the creator
        // Give it a small delay to ensure creator is ready
        setTimeout(() => this.connectToOther(`qabilet-${this.roomCode}-creator`), 1000);
      }
    });

    this.peer.on("connection", (conn) => {
      console.log("Incoming connection from:", conn.peer);
      this.setupConnection(conn);
    });

    this.peer.on("call", (incomingCall) => {
      console.log("Incoming call from:", incomingCall.peer);
      incomingCall.answer(this.stream || undefined);
      this.setupCall(incomingCall);
    });

    this.peer.on("error", (err) => {
      console.error("PeerJS error:", err.type, err);
      
      if (err.type === 'peer-disconnected') {
        this.onStatus("Peer disconnected.");
      } else if (err.type === 'network') {
        this.onStatus("Network error.");
      } else if (err.type === 'unavailable-id') {
        this.onStatus("ID taken. Please refresh or wait 5s.");
      } else if (err.type === 'peer-unavailable') {
        this.onStatus("Creator not found. Check code.");
      } else {
        this.onStatus("Connection error: " + err.type);
      }
    });

    this.peer.on("disconnected", () => {
      this.onStatus("Disconnected.");
      // Attempt reconnection if not destroyed
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });
  }

  private connectToOther(otherId: string) {
    if (!this.peer) return;
    
    console.log("Connecting to:", otherId);
    const conn = this.peer.connect(otherId);
    this.setupConnection(conn);

    const call = this.peer.call(otherId, this.stream || new MediaStream());
    this.setupCall(call);
  }

  private setupConnection(conn: any) {
    this.connection = conn;
    this.connection.on("data", (data: any) => {
      this.onData(data.toString());
    });
    this.connection.on("open", () => {
      console.log("Data connection established");
      this.onStatus("Connected");
    });
  }

  private setupCall(call: any) {
    this.call = call;
    this.call.on("stream", (remoteStream: MediaStream) => {
      console.log("Received remote stream");
      this.onRemoteStream(remoteStream);
      this.onStatus("Connected");
    });
  }

  public sendData(data: string) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }

  public destroy() {
    this.peer?.destroy();
  }
}
