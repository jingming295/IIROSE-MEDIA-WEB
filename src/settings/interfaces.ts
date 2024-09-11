export interface SettingData
{
    title: string;
    actionTitle: string;
    icon: string;
    action: (doSomethings?: (actionTitle?: string) => void) => void;
}