import { Attributes, Component, ComponentChild, ComponentChildren, h, Ref, render } from 'preact';
import { IMC } from './IMC';
import { Input_Behavior_Module } from '../input-behavior-module/Input-Behavior-Module';
import { closeSidebar } from '../iirose_func/CloseSideBar';

interface IIROSE_MEDIA_CONTAINER_STATE
{
    active: boolean;
    init: boolean;
    searchKeyword: string;
}

class Gesture
{
    startY: number = 0;

    ShowOrHideIMC: () => void;

    constructor(ShowOrHideIMC: () => void)
    {
        this.ShowOrHideIMC = ShowOrHideIMC;
    }

    public IMCActiveEventHandler(event: MouseEvent | TouchEvent): void
    {
        event.stopImmediatePropagation();
        if (event instanceof TouchEvent)
        {
            this.handleTouchStart(event);
        }
    }

    public touchEnd(): void
    {
        this.startY = 0;
        window.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    }

    public handleTouchStart(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            this.startY = event.touches[0].clientY;
            window.addEventListener("touchmove", this.handleTouchMove.bind(this));
        }
    }

    private handleTouchMove(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            if (this.startY === 0) return;
            const deltaY = event.touches[0].clientY - this.startY;
            const screenHeight = window.innerHeight;
            const threshold = screenHeight / 5;
            if (deltaY > threshold)
            {
                this.startY = 0;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                this.ShowOrHideIMC();
            }
        }
    }



}

export class IIROSE_MEDIA_CONTAINER extends Component<object, IIROSE_MEDIA_CONTAINER_STATE>
{
    private IMCActiveEvent: (event: MouseEvent | TouchEvent) => void;
    private mainHolder: HTMLElement | null = null;
    gasture = new Gesture(this.ShowOrHideIMC.bind(this));

    constructor(props: undefined)
    {
        super(props);
        this.IMCActiveEvent = this.gasture.IMCActiveEventHandler.bind(this.gasture);
    }

    state = {
        active: false,
        init: false,
        searchKeyword: ''
    }

    componentDidMount(): void
    {
        const { changeSearchKeyword } = this.controller;
        const { ShowOrHideIMC } = this;
        window.addEventListener("keydown", this.KeyBoardCallApp.bind(this.gasture));
        window.addEventListener("touchstart", this.gasture.handleTouchStart.bind(this.gasture));
        window.addEventListener("touchend", this.gasture.touchEnd.bind(this.gasture));
        this.mainHolder = document.getElementById('mainHolder');
        Input_Behavior_Module.init(changeSearchKeyword.bind(this), ShowOrHideIMC.bind(this));
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

    componentDidUpdate(previousProps: Readonly<object>, previousState: Readonly<IIROSE_MEDIA_CONTAINER_STATE>): void
    {
        const { active } = this.state;

        if (this.mainHolder)
        {
            if (active && !previousState.active)
            {
                this.mainHolder.classList.add('hidemainHolder');
                document.body.addEventListener('mousedown', this.IMCActiveEvent);
                document.body.addEventListener('touchstart', this.IMCActiveEvent);
                closeSidebar()
            } else if (!active && previousState.active)
            {
                this.mainHolder.classList.remove('hidemainHolder');
                document.body.removeEventListener('mousedown', this.IMCActiveEvent);
                document.body.removeEventListener('touchstart', this.IMCActiveEvent);
                closeSidebar()
            }
        }
    }

    render(): ComponentChild
    {
        const { active, init, searchKeyword } = this.state;
        const { changeSearchKeyword } = this.controller;
        const activeClass = active ? 'ShowIIROSE_MEDIA_CONTAINER' : 'IIROSE_MEDIA_CONTAINER';
        return (
            <div id="IIROSE_MEDIA_CONTAINER" class={`IIROSE_MEDIA_CONTAINER ${activeClass}`}>
                {
                    init ? <IMC
                        ShowOrHideIMC={this.ShowOrHideIMC.bind(this)}
                        searchKeyword={searchKeyword}
                        changeSearchKeyword={changeSearchKeyword}
                        active={active}
                    /> : null
                }
            </div>
        );
    }



    private async ShowOrHideIMC()
    {
        const { active, init } = this.state;
        if (!init) await this.setState({ init: true });
        await this.setState({ active: !active });
        await new Promise(resolve => setTimeout(resolve, 100));
    }



    private KeyBoardCallApp(event: KeyboardEvent)
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
            this.ShowOrHideIMC();
        } else if (event.key === 'Escape')
        {
            this.setState({ active: false });
        }
    }
}

export class IMCInit
{
    constructor(mainContainer: HTMLDivElement)
    {
        this.init(mainContainer);
    }

    init(mc: HTMLDivElement)
    {
        const container = document.createElement('div');
        mc.appendChild(container);
        render(<IIROSE_MEDIA_CONTAINER />, container);
    }
}
