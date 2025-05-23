import { Component } from 'preact';
import { IIROSEUtils } from '../../../iirose_func/IIROSEUtils';

interface MediaSearchBarProps
{
    searchKeyword: string | null; // 用于显示在搜索栏的keyword
    currentPage: number; // 当前页面
    totalPage: number; // 总页面
    isCurrentInMultiPage: boolean;
    mediaSearchBarActions: MediaSearchBarActions;
}

interface MediaSearchBarActions
{
    changeSearchKeyword: (keyword: string | null) => void
    changecurrentPage: (page: number) => void
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
        const { changecurrentPage } = this.props.mediaSearchBarActions;
        if (currentPage < totalPage)
        {
            await changecurrentPage(currentPage + 1);
        }
    }

    public async prevPage(currentPage: number)
    {
        const { changecurrentPage } = this.props.mediaSearchBarActions;
        if (currentPage > 1)
        {
            await changecurrentPage(currentPage - 1);
        }
    }

    render()
    {
        const { searchKeyword, currentPage, totalPage, isCurrentInMultiPage, mediaSearchBarActions } = this.props;
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


                <div
                    className="mediaSearchBarRightWrapper"
                    style={{
                        width: isCurrentInMultiPage ? '100%' : '', // 根据 isCurrentInMultiPage 的值设置宽度
                        justifyContent: isCurrentInMultiPage ? 'flex-end' : '' // 根据 isCurrentInMultiPage 的值设置对齐方式
                    }}
                >
                    <div className='paginationWrapper'>
                        <div className='paginationIcon'></div>
                        <div className='pagination'>{pages}</div>
                    </div>

                    <div className='controllerWrapper'>

                        {
                            isCurrentInMultiPage &&
                            <div className='returnButtonWrapper PaginationControllerButtonWrapper' onClick={() => mediaSearchBarActions.switchToOutFromMultiPage}>
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


            </div>
        );
    }

}
