import { Component, ComponentChildren } from "preact";

interface SettingCardProps
{
    settingsData: SettingData
}

interface SettingCardState
{
    currentActionTitle: string
}


export class SettingCard extends Component<SettingCardProps, SettingCardState>
{
    constructor(props: SettingCardProps)
    {
        super(props);
        this.state = {
            currentActionTitle: props.settingsData.actionTitle
        }
    }

    handleClick = () =>
    {
        this.props.settingsData.action(this.updateActionTitle);
    };

    componentDidUpdate(previousProps: Readonly<SettingCardProps>, _previousState: Readonly<SettingCardState>, _snapshot: any): void
    {
        if (previousProps !== this.props)
        {
            this.setState({
                currentActionTitle: this.props.settingsData.actionTitle
            })
        }
    }

    private updateActionTitle = (actionTitle?: string) =>
    {
        this.setState({ currentActionTitle: actionTitle })
    }

    render(): ComponentChildren
    {
        const { title, icon } = this.props.settingsData
        const { currentActionTitle } = this.state
        return (
            <div className='flex flex-col h-[200px] m-[12px] shadow-[0_0_1px_rgba(0,0,0,0.12),_0_1px_1px_rgba(0,0,0,0.24)]'>
                <div className='commonBoxHead'>
                    <div className={`flex font-md ${icon} h-full text-[30px] items-center`}></div>
                    <span className='font-bold flex h-full text-[20px] items-center ml-[22px]'>{title}</span>
                </div>
                <div className='textColor shopItemColor h-[50%]' onClick={this.handleClick}>
                    {
                        currentActionTitle.startsWith('mdi') ? (
                            <div className={`whoisTouch2 w-full h-full flex items-center justify-center font-md text-[48px] ${currentActionTitle}`} />

                        ) : (
                            <span className={`whoisTouch2 text-[16px] w-full h-full flex items-center justify-center font-bold`}>
                                {currentActionTitle}
                            </span>
                        )
                    }
                </div>
            </div>
        );
    }
}
