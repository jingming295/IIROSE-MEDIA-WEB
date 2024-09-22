import { Attributes, Component, ComponentChild, ComponentChildren, h, Ref, render } from 'preact';
import { IMC } from './IMC';

interface IIROSE_MEDIA_CONTAINER_STATE
{
    active: boolean;
    init: boolean;
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

    public touchEnd(event: TouchEvent): void
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

export class IIROSE_MEDIA_CONTAINER extends Component<{}, IIROSE_MEDIA_CONTAINER_STATE>
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
        init: false
    };

    componentDidMount(): void
    {
        window.addEventListener("keydown", this.KeyBoardCallApp.bind(this.gasture));
        window.addEventListener("touchstart", this.gasture.handleTouchStart.bind(this.gasture));
        window.addEventListener("touchend", this.gasture.touchEnd.bind(this.gasture));
        this.mainHolder = document.getElementById('mainHolder');
    }

    componentDidUpdate(previousProps: Readonly<{}>, previousState: Readonly<IIROSE_MEDIA_CONTAINER_STATE>, snapshot: any): void
    {
        const { active } = this.state;

        if (this.mainHolder)
        {
            if (active && !previousState.active)
            {
                this.mainHolder.classList.add('hidemainHolder');
                document.body.addEventListener('mousedown', this.IMCActiveEvent);
                document.body.addEventListener('touchstart', this.IMCActiveEvent);
            } else if (!active && previousState.active)
            {
                this.mainHolder.classList.remove('hidemainHolder');
                document.body.removeEventListener('mousedown', this.IMCActiveEvent);
                document.body.removeEventListener('touchstart', this.IMCActiveEvent);
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
        const { active, init } = this.state;
        if (!init) this.setState({ init: true });
        this.setState({ active: !active });
        await new Promise(resolve => setTimeout(resolve, 100));
    }



    private KeyBoardCallApp(event: KeyboardEvent)
    {
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
