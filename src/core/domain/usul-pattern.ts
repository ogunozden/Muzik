export type UsulStroke = "dum" | "tek" | "ke" | "rest";

export interface UsulBeat {
  beat: number;
  stroke: UsulStroke;
  accent?: boolean;
}

export interface UsulPattern {
  id: string;
  name: string;
  beats: number;
  unit: number;
  strokes: UsulBeat[];
}
