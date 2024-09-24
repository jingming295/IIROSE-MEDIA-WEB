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

    componentDidUpdate(prevProps: Readonly<SettingsCardProps>, prevState: Readonly<{}>): void
    {

        if (prevProps.settingsData.actionTitle !== this.props.settingsData.actionTitle)
        {
            this.setState({ actionTitle: this.props.settingsData.actionTitle })
        }
    }

    render()
    {
        const { settingsData } = this.props;

        return (
            <div className='actionWrapper' onClick={() =>
            {
                settingsData.action(this.updateActionTitle)
            }}>
                <div className='action textAction'>
                    {this.state.actionTitle}
                </div>
            </div>
        )
    }

}