import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type NoiseType = "brown" | "pink" | "white";

export const NOISE_OPTIONS: { type: NoiseType; label: string; desc: string }[] = [
  { type: "brown", label: "Brown", desc: "Deep & grounding"   },
  { type: "pink",  label: "Pink",  desc: "Natural & balanced" },
  { type: "white", label: "White", desc: "Sharp & masking"    },
];

interface NoiseCtx {
  on: boolean;
  noiseType: NoiseType;
  volume: number;
  toggle: () => void;
  setVolume: (v: number) => void;
  changeType: (t: NoiseType) => void;
}

const NoiseContext = createContext<NoiseCtx>({
  on: false, noiseType: "brown", volume: 0.55,
  toggle: () => {}, setVolume: () => {}, changeType: () => {},
});

function buildNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * 4;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    if (type === "white") {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === "pink") {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)/6;
        b6=w*0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    }
  }
  return buf;
}

export function NoiseProvider({ children }: { children: ReactNode }) {
  const actxRef   = useRef<AudioContext | null>(null);
  const gainRef   = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const volRef    = useRef(0.55);
  const typeRef   = useRef<NoiseType>("brown");

  const [on,        setOn]        = useState(false);
  const [noiseType, _setType]     = useState<NoiseType>("brown");
  const [volume,    setVolumeVal] = useState(0.55);

  function setType(t: NoiseType) { typeRef.current = t; _setType(t); }

  function getCtx() {
    if (!actxRef.current) {
      actxRef.current = new AudioContext();
      gainRef.current = actxRef.current.createGain();
      gainRef.current.gain.value = volRef.current;
      gainRef.current.connect(actxRef.current.destination);
    }
    return actxRef.current;
  }

  async function startSource(type: NoiseType) {
    const c = getCtx();
    await c.resume();
    const buf = buildNoiseBuffer(c, type);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gainRef.current!);
    src.start();
    sourceRef.current = src;
  }

  async function toggle() {
    if (on) {
      // silence — keep source running for instant resume
      if (gainRef.current) gainRef.current.gain.value = 0;
      setOn(false);
    } else {
      const c = getCtx();
      await c.resume();
      if (!sourceRef.current) await startSource(typeRef.current);
      if (gainRef.current) gainRef.current.gain.value = volRef.current;
      setOn(true);
    }
  }

  async function changeType(t: NoiseType) {
    setType(t);
    if (on) {
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
      await startSource(t);
      if (gainRef.current) gainRef.current.gain.value = volRef.current;
    }
  }

  function setVolume(v: number) {
    volRef.current = v;
    setVolumeVal(v);
    if (gainRef.current && on) gainRef.current.gain.value = v;
  }

  return (
    <NoiseContext.Provider value={{ on, noiseType, volume, toggle, setVolume, changeType }}>
      {children}
    </NoiseContext.Provider>
  );
}

export function useNoise() { return useContext(NoiseContext); }
