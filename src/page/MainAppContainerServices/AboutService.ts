// AboutService.ts
import { About } from "../../platforms/About";

export class AboutService {
  /**
   * @description 构建并显示“关于”菜单
   * @param ctx 核心操作上下文
   * @param ShowOrHideIMC 组件传入的显示/隐藏控制方法
   */
  static showAbout(
    ctx: MainAppContainerActionContext,
    ShowOrHideIMC: () => Promise<void>,
  ) {
    const aboutData: SettingData[] = [
      {
        key: "aboutAuthor",
        title: "作者",
        actionTitle: "铭", // 这里对应你的名字 Ming
        icon: "mdi-account-tie",
        action: async () => {
          await ShowOrHideIMC();
          new About().aboutCreator();
        },
      },
      {
        key: "aboutSource",
        title: "项目源代码地址",
        actionTitle: "GitHub 🔗",
        icon: "mdi-github",
        action: () => {
          window.open("https://github.com/jingming295/IIROSE-MEDIA-WEB");
        },
      },
      {
        key: "aboutDonate",
        title: "投喂我",
        actionTitle: "投喂",
        icon: "mdi-coffee-outline",
        action: () => {
          new About().aboutDonate();
        },
      },
      {
        key: "aboutSponsorList",
        title: "赞助列表",
        actionTitle: "感谢名单",
        icon: "mdi-account-group",
        action: () => {
          new About().aboutSponsorList(ShowOrHideIMC);
        },
      },
    ];

    ctx.setState({ settingsData: aboutData });
  }
}
