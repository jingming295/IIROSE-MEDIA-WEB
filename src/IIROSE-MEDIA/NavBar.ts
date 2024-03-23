import { MusicMediaContainer } from "../UpdateDOM/MusicMediaContainer";
import { VideoMediaContainer } from "../UpdateDOM/VideoMediaContainer";
import { UpdateDom } from "../UpdateDOM/index";

interface NavBarButton
{
    ButtonClass?: string;
    ButtonID?: string;
    IconID?: string;
    Text?: string;
    active?: boolean;
    onClick?: () => void;
}


export class CreateNavBar
{


    public createNavBar()
    {
        const NavBar = document.createElement('div');
        NavBar.className = 'NavBar';

        NavBar.appendChild(this.CreateLeftComponent());
        NavBar.appendChild(this.CreateRightComponent());
        return NavBar;
    }

    private CreateLeftComponent()
    {
        function createNavBarButton(Button: NavBarButton)
        {
            const NavBarButton = document.createElement('div');
            if(Button.active) NavBarButton.classList.add('NavBarButtonActive');
            if (Button.ButtonClass) NavBarButton.classList.add(Button.ButtonClass);
            else NavBarButton.classList.add('NavBarButton')
            if (Button.ButtonID) NavBarButton.id = Button.ButtonID;
            if (Button.onClick) NavBarButton.onclick = Button.onClick;

            if (Button.IconID)
            {
                const Icon = document.createElement('div');
                Icon.className = 'NavBarButtonIcon';
                Icon.id = Button.IconID;
                NavBarButton.appendChild(Icon);
            }

            const Text = document.createElement('div');
            Text.className = 'NavBarButtonText';
            if (Button.Text) Text.innerText = Button.Text;

            NavBarButton.appendChild(Text);
            return NavBarButton;
        }
        const LeftComponent = document.createElement('div');
        LeftComponent.className = 'LeftComponent';

        const LeftComponentButton: NavBarButton[] = [{
            IconID: 'BackIcon',
            ButtonID: 'BackButton',
            active: true,
            onClick: () =>
            {
                const updateDOM = new UpdateDom();
                updateDOM.changeStatusIIROSE_MEDIA();
            }
        }, {
            ButtonClass: 'NavBarTitle',
            ButtonID: 'NavBarTitle',
            IconID: 'TitleIcon',
            Text: 'IIROSE-MEDIA'
        }];

        LeftComponentButton.forEach((Button) =>
        {
            LeftComponent.appendChild(createNavBarButton(Button));
        });
        return LeftComponent;
    }

    private CreateRightComponent()
    {
        function createNavBarButton(Button: NavBarButton) {
            const NavBarButton = document.createElement('div');
            NavBarButton.classList.add('NavBarButton');
        
            if (Button.active) {
                NavBarButton.classList.add('NavBarButtonActive');
            }
        
            if (Button.ButtonID) {
                NavBarButton.id = Button.ButtonID;
            }
        
            if (Button.onClick) {
                NavBarButton.onclick = () => {
                    if (Button.onClick)
                    Button.onClick()
        
                    // 然后执行额外的逻辑
                    const parent = NavBarButton.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(child => child !== NavBarButton);
                        siblings.forEach(sibling => sibling.classList.remove('NavBarButtonActive'));
                        NavBarButton.classList.add('NavBarButtonActive');
                    }
                };
            }
        
            if (Button.IconID) {
                const Icon = document.createElement('div');
                Icon.className = 'NavBarButtonIcon';
                Icon.id = Button.IconID;
                NavBarButton.appendChild(Icon);
            }
        
            const Text = document.createElement('div');
            Text.className = 'NavBarButtonText';
            if (Button.Text) {
                Text.innerText = Button.Text;
            }
        
            NavBarButton.appendChild(Text);
        
            return NavBarButton;
        }
        

        const RightComponent = document.createElement('div');
        RightComponent.className = 'RightComponent';
        const RightComponentButton: NavBarButton[] = [{
            ButtonID: 'MusicButton',
            IconID: 'MusicIcon',
            Text: '音乐',
            active: true,
            onClick: () =>
            {
                const musicMediaContainer = new MusicMediaContainer();
                musicMediaContainer.showMusicMediaContainer();
            }
        },
        {
            ButtonID: 'VideoButton',
            IconID: 'VideoIcon',
            Text: '视频',
            onClick: () =>
            {
                const videoMediaContainer = new VideoMediaContainer();
                videoMediaContainer.showVideoMediaContainer();
            }
        },
        {
            ButtonID: 'SettingButton',
            IconID: 'SettingIcon',
            Text: '设置'
        }];

        RightComponentButton.forEach((Button) =>
        {
            RightComponent.appendChild(createNavBarButton(Button));
        });

        return RightComponent;
    }
}