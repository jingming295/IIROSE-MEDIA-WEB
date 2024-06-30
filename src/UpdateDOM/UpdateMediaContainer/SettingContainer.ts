import { SettingContainer } from "../../IIROSE-MEDIA/SettingContainer";
import { Setting } from "../../Platform/Setting";

export class MediaSettingContainer
{

    public showSettingContainer()
    {

        const MediaContainerWrapper = document.getElementById('MediaContainerWrapper') as HTMLDivElement | null;
        if (!MediaContainerWrapper) return;

        const setting = new Setting()
        const settingPlatforms = setting.Setting();
        const mediaContainer = new SettingContainer();
        mediaContainer.createSettingContainer(settingPlatforms)
    }
}