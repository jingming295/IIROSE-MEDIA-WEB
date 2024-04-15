export class SettingContainer{

    public showSettingContainer(){
        const prevmediaContainer = document.querySelector('.MediaContainer') as HTMLDivElement | null;
        if(!prevmediaContainer || prevmediaContainer.id === 'SettingContainer') return;
    }
}