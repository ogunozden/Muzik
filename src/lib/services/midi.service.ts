/**
 * MIDI Service - Merkezi MIDI Servisi
 * MIDI cihaz ve giriş yönetimi
 */

/**
 * MIDI not event callback
 */
export type MidiNoteCallback = (midiNumber: number, velocity: number) => void;

/**
 * MIDI cihaz bilgisi
 */
export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: "input" | "output";
}

/**
 * MIDI Service state
 */
interface MidiServiceState {
  isSupported: boolean;
  isEnabled: boolean;
  devices: MidiDevice[];
  activeDevice: string | null;
  onNoteOn: MidiNoteCallback | null;
  onNoteOff: MidiNoteCallback | null;
}

/**
 * MIDI Service singleton
 */
class MidiService {
  private static instance: MidiService | null = null;
  private state: MidiServiceState = {
    isSupported: false,
    isEnabled: false,
    devices: [],
    activeDevice: null,
    onNoteOn: null,
    onNoteOff: null,
  };

  private midiAccess: MIDIAccess | null = null;
  private activeInput: MIDIInput | null = null;

  private constructor() {
    // Check for Web MIDI API support
    if (typeof navigator !== "undefined" && "requestMIDIAccess" in navigator) {
      this.state.isSupported = true;
    }
  }

  /**
   * Singleton instance getter
   */
  static getInstance(): MidiService {
    if (!MidiService.instance) {
      MidiService.instance = new MidiService();
    }
    return MidiService.instance;
  }

  /**
   * MIDI erişimi başlat
   */
  async initialize(): Promise<boolean> {
    if (!this.state.isSupported) {
      console.warn("MidiService: Web MIDI API not supported");
      return false;
    }

    if (this.state.isEnabled) return true;

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.updateDevices();
      this.state.isEnabled = true;
      return true;
    } catch (error) {
      console.error("MidiService: Failed to initialize", error);
      return false;
    }
  }

  /**
   * MIDI cihazlarını güncelle
   */
  private updateDevices(): void {
    if (!this.midiAccess) return;

    const devices: MidiDevice[] = [];
    
    // Input devices
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name ?? "Unknown",
        manufacturer: input.manufacturer ?? "Unknown",
        type: "input",
      });
    });

    // Output devices
    this.midiAccess.outputs.forEach((output) => {
      devices.push({
        id: output.id,
        name: output.name ?? "Unknown",
        manufacturer: output.manufacturer ?? "Unknown",
        type: "output",
      });
    });

    this.state.devices = devices;
  }

  /**
   * Cihaz değişikliklerini dinle
   */
  private setupDeviceListeners(): void {
    if (!this.midiAccess) return;

    this.midiAccess.onstatechange = () => {
      this.updateDevices();
    };
  }

  /**
   * Belirli bir cihaza bağlan
   */
  connectToDevice(deviceId: string): boolean {
    if (!this.midiAccess) return false;

    // Disconnect current
    if (this.activeInput) {
      this.activeInput.onmidimessage = null;
    }

    // Connect to new
    const input = this.midiAccess.inputs.get(deviceId);
    if (input) {
      this.activeInput = input;
      this.activeInput.onmidimessage = this.handleMidiMessage.bind(this);
      this.state.activeDevice = deviceId;
      return true;
    }

    return false;
  }

  /**
   * MIDI mesajını işle
   */
  private handleMidiMessage(event: MIDIMessageEvent): void {
    const [status, data1, data2] = event.data ?? [];
    const command = status >> 4;
    // const channel = status & 0x0f; // Future: for multi-channel support

    // Note On (0x90) or Note Off (0x80)
    if (command === 0x90 && data2 > 0) {
      // Note On with velocity > 0
      this.state.onNoteOn?.(data1, data2);
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      // Note Off
      this.state.onNoteOff?.(data1, 0);
    }
  }

  /**
   * Note on callback'i ayarla
   */
  onNoteOn(callback: MidiNoteCallback | null): void {
    this.state.onNoteOn = callback;
  }

  /**
   * Note off callback'i ayarla
   */
  onNoteOff(callback: MidiNoteCallback | null): void {
    this.state.onNoteOff = callback;
  }

  /**
   * Bağlantıyı kes
   */
  disconnect(): void {
    if (this.activeInput) {
      this.activeInput.onmidimessage = null;
      this.activeInput = null;
    }
    this.state.activeDevice = null;
  }

  /**
   * State getters
   */
  get supported(): boolean {
    return this.state.isSupported;
  }

  get enabled(): boolean {
    return this.state.isEnabled;
  }

  get devices(): MidiDevice[] {
    return this.state.devices;
  }

  get inputDevices(): MidiDevice[] {
    return this.state.devices.filter((d) => d.type === "input");
  }

  get outputDevices(): MidiDevice[] {
    return this.state.devices.filter((d) => d.type === "output");
  }

  get currentDevice(): string | null {
    return this.state.activeDevice;
  }
}

/**
 * Export singleton instance
 */
export const midiService = MidiService.getInstance();

/**
 * MIDI service hook-friendly exports
 */
export const midiServiceActions = {
  initialize: () => midiService.initialize(),
  connect: (deviceId: string) => midiService.connectToDevice(deviceId),
  disconnect: () => midiService.disconnect(),
  onNoteOn: (callback: MidiNoteCallback | null) => midiService.onNoteOn(callback),
  onNoteOff: (callback: MidiNoteCallback | null) => midiService.onNoteOff(callback),
  getDevices: () => midiService.devices,
  getInputDevices: () => midiService.inputDevices,
  isSupported: () => midiService.supported,
};

export type MidiServiceInstance = MidiService;
