export interface PluginSettingsInterface
{
    chatBox: {
        isProxyAtInput: boolean;
    }
}

export class PluginSettings
{

    public isProxyAtInputSetting(changeActionTitleAction?: (actionTitle?: string) => void)
    {
        const pluginSettings = this.getPluginSetting();

        pluginSettings.chatBox.isProxyAtInput = !pluginSettings.chatBox.isProxyAtInput;
        localStorage.setItem('imwPluginSetting', JSON.stringify(pluginSettings));

        if (changeActionTitleAction)
        {
            changeActionTitleAction(pluginSettings.chatBox.isProxyAtInput ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline');
        }
        window.functionBtnDo(87)
    }

    public getPluginSetting(): PluginSettingsInterface
    {
        const pluginSettings = localStorage.getItem('imwPluginSetting');
        if (pluginSettings)
        {
            return JSON.parse(pluginSettings) as PluginSettingsInterface;
        }
        return {
            chatBox: {
                isProxyAtInput: true
            }
        }

    }

}