import { Component } from 'preact';
import { IIROSEUtils } from '../../iirose_func/IIROSEUtils';

interface MediaSearchBarProps
{
    searchKeyword: string | null;
    currentPage: number;
    totalPage: number;
    isCurrentInMultiPage: boolean;
    mediaSearchBarActions: MediaSearchBarActions;
}

interface MediaSearchBarActions
{
    changeSearchKeyword: (keyword: string | null) => void
    changecurrentPage: (page: number) => void
    currentSubNavBarAction: () => void
    switchToOutFromMultiPage: () => void
}

export class MediaSearchBar extends Component<MediaSearchBarProps>
{
    public searchInput()
    {
        const iiroseUtils = new IIROSEUtils();
        const changeSearchKeyWord = this.props.mediaSearchBarActions.changeSearchKeyword;
        iiroseUtils.sync(2, ['搜索', '', 100], changeSearchKeyWord)
    }

    public async nextPage(currentPage: number, totalPage: number)
    {
        const { changecurrentPage, currentSubNavBarAction } = this.props.mediaSearchBarActions;
        if (currentPage < totalPage)
        {
            await changecurrentPage(currentPage + 1);
            currentSubNavBarAction();
        }
    }

    public async prevPage(currentPage: number)
    {
        const { changecurrentPage, currentSubNavBarAction } = this.props.mediaSearchBarActions;
        if (currentPage > 1)
        {
            await changecurrentPage(currentPage - 1);
            currentSubNavBarAction();
        }
    }

    public async outFromMultiPage()
    {
        const { switchToOutFromMultiPage } = this.props.mediaSearchBarActions;
        await switchToOutFromMultiPage();
    }

    render()
    {
        const { searchKeyword, currentPage, totalPage, isCurrentInMultiPage } = this.props;
        let pages = '-/-';

        if (totalPage)
        {
            pages = `${currentPage}/${totalPage}`;
        }

        return (
            <div className='MediaSearchBar'>

                {
                    !isCurrentInMultiPage &&
                    <div className='inputWrapper' onClick={() => this.searchInput()}>
                        <div className='inputIcon'></div>
                        <div className='mediaSearchBarInput'>{searchKeyword}</div>
                    </div>
                }

                <div className='paginationWrapper'>
                    <div className='paginationIcon'></div>
                    <div className='pagination'>{pages}</div>
                </div>

                <div className='controllerWrapper'>

                    {
                        isCurrentInMultiPage &&
                        <div className='returnButtonWrapper PaginationControllerButtonWrapper' onClick={() =>
                        {
                            this.outFromMultiPage();
                        }}>
                            <div className='returnIcon'></div>
                            <div className='PaginationControllerButton'>返回</div>
                        </div>
                    }

                    <div className='prevButtonWrapper PaginationControllerButtonWrapper' onClick={() =>
                    {
                        this.prevPage(currentPage);
                    }}>
                        <div className='prevIcon'></div>
                        <div className='PaginationControllerButton'>上一页</div>
                    </div>

                    <div className='nextButtonWrapper PaginationControllerButtonWrapper' onClick={() =>
                    {
                        this.nextPage(currentPage, totalPage);
                    }}>
                        <div className='nextIcon'></div>
                        <div className='PaginationControllerButton'>下一页</div>
                    </div>

                </div>
            </div>
        );
    }

}
