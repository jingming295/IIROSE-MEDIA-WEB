import { Attributes, Component, ComponentChild, ComponentChildren, h, Ref, render } from 'preact';
import { IMC } from './IMC';

interface IIROSE_MEDIA_CONTAINER_STATE
{
    active: boolean
    init: boolean

}
export class IIROSE_MEDIA_CONTAINER extends Component<{}, IIROSE_MEDIA_CONTAINER_STATE>
{
    startY: number = 0;
    state = {
        active: false,
        init: false
    }

    componentDidMount(): void
    {
        window.addEventListener("keydown", this.KeyBoardCallApp.bind(this));
        window.addEventListener("touchstart", this.handleTouchStart.bind(this));
        window.addEventListener("touchmove", this.handleTouchMove.bind(this));
    }

    componentDidUpdate(previousProps: Readonly<{}>, previousState: Readonly<IIROSE_MEDIA_CONTAINER_STATE>, snapshot: any): void
    {

        const { active } = this.state;
        const mainHolder = document.getElementById('mainHolder');

        if (mainHolder)
        {
            if (active)
            {
                mainHolder.classList.add('hidemainHolder'); // 如果 active 为 true，添加类
            } else
            {
                mainHolder.classList.remove('hidemainHolder'); // 如果 active 为 false，移除类
            }
        }
    }

    render(props?: Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<any> | undefined; }> | undefined, state?: Readonly<IIROSE_MEDIA_CONTAINER_STATE> | undefined, context?: any): ComponentChild
    {
        const { active, init } = this.state;
        const activeClass = active ? 'ShowIIROSE_MEDIA_CONTAINER' : 'IIROSE_MEDIA_CONTAINER';
        return (
            <div id="IIROSE_MEDIA_CONTAINER" class={`IIROSE_MEDIA_CONTAINER ${activeClass}`}>
                {
                    init ? <IMC ShowOrHideIMC={this.ShowOrHideIMC.bind(this)} /> : null
                }

            </div>

        );
    }

    private async ShowOrHideIMC()
    {
        const { active, init } = this.state
        if (!init) this.setState({ init: true })
        this.setState({ active: !active })

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private handleTouchStart(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            this.startY = event.touches[0].clientY;
        }
    }

    private handleTouchMove(event: TouchEvent)
    {
        if (event.touches.length === 2)
        {
            if (this.startY === 0) return;
            const deltaY = event.touches[0].clientY - this.startY;
            const screenHeight = window.innerHeight;
            const threshold = screenHeight / 4;
            if (deltaY > threshold)
            {
                this.startY = 0
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                this.ShowOrHideIMC()
            }
        }
    }

    private KeyBoardCallApp(event: KeyboardEvent)
    {
        // 检查是否按下 Alt 键同时按下了 S 键，macos 下的 S 键是 ß 键
        if ((event.altKey && event.key === 's') || (event.altKey && event.key === 'ß'))
        {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const focusedElement = document.activeElement as HTMLElement;
            if (focusedElement && focusedElement.tagName === 'TEXTAREA')
            {
                focusedElement.blur();
            }
            this.ShowOrHideIMC()
        } else if (event.key === 'Escape')
        {
            this.setState({ active: false })

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
