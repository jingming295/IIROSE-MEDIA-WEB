import { Component } from 'preact';
import { SettingData } from '../../../settings/interfaces';


interface SettingsCardProps
{
    settingsData: SettingData
}

export class SettingsCard extends Component<SettingsCardProps>
{

    state = {
        actionTitle: this.props.settingsData.actionTitle
    }

    private updateActionTitle = (actionTitle?: string) =>
    {
        this.setState({ actionTitle: actionTitle })
    }

    componentDidUpdate(prevProps: Readonly<SettingsCardProps>): void
    {

        if (prevProps.settingsData.actionTitle !== this.props.settingsData.actionTitle)
        {
            this.setState({ actionTitle: this.props.settingsData.actionTitle })
        }
    }

    render()
    {
        const { settingsData } = this.props;
        const actionClassName = this.state.actionTitle.startsWith('mdi')
            ? `action ${this.state.actionTitle}`
            : 'action textAction';

        const fontStyle = this.state.actionTitle.startsWith('mdi')
            ? {
                fontFamily: 'md',
                fontSize: '48px',
                fontWeight: 'unset',
            } // 替换为你想要的字体
            : {};
        return (
            <div className='actionWrapper' onClick={() =>
            {
                settingsData.action(this.updateActionTitle);
            }}>
                <div className={actionClassName} style={fontStyle}>
                    {!this.state.actionTitle.startsWith('mdi') && (
                        this.state.actionTitle
                    )}
                </div>
            </div>
        );
    }

}