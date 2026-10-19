interface NeteaseSetting {
  quality: NeteaseSongQuality;
  api: "default" | "HK" | "Dev";
  lyricOption: "off" | "original" | "translated" | "both";
}

type NeteaseSongQuality =
  | "standard"
  | "higher"
  | "exhigh"
  | "lossless"
  | "hires"
  | "jyeffect"
  | "sky"
  | "jymaster";
