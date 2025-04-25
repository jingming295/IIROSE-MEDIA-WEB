import { Component, ComponentChild } from "preact";
import { MainAppOutLayer } from "./MainAppOutLayer";
import { Input_Behavior_Module } from "../input-behavior-module/Input-Behavior-Module";
import { closeSidebar } from "../iirose_func/CloseSideBar";
import { Gesture } from "../listener/Gesture";

interface MainAppState
{
    mainAppDisplay: boolean;
    init: boolean;
    searchKeyword: string;
}

export class MainApp extends Component<object, MainAppState>
{
    private ShowHideMainApp = async () =>
    {
        const { mainAppDisplay, init } = this.state;
        if (!init) await this.setState({ init: true });
        await this.setState({ mainAppDisplay: !mainAppDisplay });
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private mainHolder: HTMLElement | null = null;

    gasture = new Gesture(this.ShowHideMainApp);

    constructor(props: undefined)
    {
        super(props);
    }

    state = {
        mainAppDisplay: false,
        init: false,
        searchKeyword: ''
    }


    render(): ComponentChild
    {
        const { mainAppDisplay, init, searchKeyword } = this.state;
        const { changeSearchKeyword } = this.controller;
        const activeClass = mainAppDisplay ? 'ShowIIROSE_MEDIA_CONTAINER' : 'IIROSE_MEDIA_CONTAINER';
        return (
            <div id="IIROSE_MEDIA_CONTAINER" class={`IIROSE_MEDIA_CONTAINER ${activeClass}`}>
                {
                    init ? <MainAppOutLayer
                        ShowHideMainApp={this.ShowHideMainApp}
                        searchKeyword={searchKeyword}
                        changeSearchKeyword={changeSearchKeyword}
                        mainAppDisplay={mainAppDisplay}
                    /> : null
                }
            </div>
        );
    }

    componentDidMount(): void
    {
        const { changeSearchKeyword } = this.controller;
        const { ShowHideMainApp } = this;
        this.mainHolder = document.getElementById('mainHolder');
        Input_Behavior_Module.init(changeSearchKeyword, ShowHideMainApp);

        window.addEventListener("keydown", this.hotkeyControlApp);
        window.addEventListener("touchstart", this.gasture.handleTouchStart);
        window.addEventListener("touchend", this.gasture.touchEnd);
    }

    componentWillUnmount(): void
    {
        window.removeEventListener("keydown", this.hotkeyControlApp);
        window.removeEventListener("touchstart", this.gasture.handleTouchStart);
        window.removeEventListener("touchend", this.gasture.touchEnd);
    }

    componentDidUpdate(_previousProps: Readonly<object>, previousState: Readonly<MainAppState>): void
    {
        const { mainAppDisplay } = this.state;

        if (this.mainHolder)
        {
            if (mainAppDisplay && !previousState.mainAppDisplay)
            {
                this.mainHolder.classList.add('hidemainHolder');
                document.body.addEventListener('mousedown', this.gasture.IMCActiveEventHandler);
                document.body.addEventListener('touchstart', this.gasture.IMCActiveEventHandler);
                closeSidebar()
            } else if (!mainAppDisplay && previousState.mainAppDisplay)
            {
                this.mainHolder.classList.remove('hidemainHolder');
                document.body.removeEventListener('mousedown', this.gasture.IMCActiveEventHandler);
                document.body.removeEventListener('touchstart', this.gasture.IMCActiveEventHandler);
                closeSidebar()
            }
        }
    }

    controller = {
        /**
         * @description 更新搜索词
         * @param keyword 
         * @returns 
         */
        changeSearchKeyword: (keyword: string | null) =>
        {
            if (keyword !== null && keyword !== '')
                this.setState({ searchKeyword: keyword });
        }
    }



    private hotkeyControlApp = (event: KeyboardEvent) =>
    {
        if ((event.altKey && event.key === 's') || (event.altKey && event.key === 'S') || (event.altKey && event.key === 'ß'))
        {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement && focusedElement.tagName === 'TEXTAREA')
            {
                focusedElement.blur();
            }
            this.ShowHideMainApp();
        } else if (event.key === 'Escape')
        {
            this.setState({ mainAppDisplay: false });
        }
    }
}