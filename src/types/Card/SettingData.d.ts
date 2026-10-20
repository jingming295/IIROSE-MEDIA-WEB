interface SettingData {
  /** 稳定标识（如 "searchViewMode"）：面板内同步 actionTitle/icon 时按它匹配，
   *  不得用 title 中文文案匹配（脆弱，见 spec-request-announce-modes 复盘 F7） */
  key: string;
  title: string;
  actionTitle: string;
  icon: string;
  action: (doSomethings?: (actionTitle?: string) => void) => void;
}
