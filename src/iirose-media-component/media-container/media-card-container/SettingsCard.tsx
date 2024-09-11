import React from 'react';
import { SettingData } from '../../../settings/interfaces';


interface SettingsCardProps
{
    settingsData: SettingData
}

export class SettingsCard extends React.Component<SettingsCardProps>
{

    state = {
        actionTitle: this.props.settingsData.actionTitle
    }

    private updateActionTitle = (actionTitle?: string) =>
    {
        this.setState({ actionTitle: actionTitle })
    }

    componentDidUpdate(prevProps: Readonly<SettingsCardProps>, prevState: Readonly<{}>, snapshot?: any): void
    {

        if (prevProps.settingsData.actionTitle !== this.props.settingsData.actionTitle)
        {
            this.setState({ actionTitle: this.props.settingsData.actionTitle })
        }
    }

    render(): React.ReactNode
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