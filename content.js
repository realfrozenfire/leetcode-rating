// 在LeetCode页面上显示问题的难度分
const DATA_URL = 'https://zerotrac.github.io/leetcode_problem_rating/data.json';

LANG = 'zh';
problemsbyslug = new Map();
problemsbytitle = new Map();
function fetchRatingData() {
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) {
                console.log('Response not ok:', response.status);
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            data.forEach(item => {
                // problems.set(item.ID, item);
                problemsbyslug.set(item.TitleSlug, item);
                if (LANG === 'zh') {
                    problemsbytitle.set(item.TitleZH, item);
                } else {
                    problemsbytitle.set(item.Title, item);
                }
            });
            // 数据加载完成后，开始监听 DOM 变化
            const config = { attributes: true, childList: true, subtree: true };
            const targetNode = document.body || document.documentElement;
            const observer = new MutationObserver(function (mutationsList, observer) {
                // console.log('DOM changed');
                observer.disconnect(); // 停止监听，避免重复监听
                displayRating();
                observer.observe(targetNode, config); // 重新开始监听
            });
            observer.observe(targetNode, config);
        })
        .catch(error => {
            console.error('Error fetching rating data:', error);
        });
}

function displayRating() {
    url = window.location.href;
    if (url.includes('/problems/')) {
        displayRatingOnDesc();
    } else if (url.includes('/problemset/') || url.includes('/search/')) {
        displayRatingOnTable();
    } else if (url.includes('/problem-list/')) {
        displayRatingOnList();
    } else if (url.includes('/studyplan/')) {
        displayRatingOnPlan();
    } else {
        displayRatingOnLinks();
    }
}

// 在“题库”和“搜索”页面的问题列表中显示难度分
function displayRatingOnTable() {
    if (problemsbyslug.size === 0 || !document.querySelector('[role="table"]')) {
        return;
    }
    // 获取所有 role="row" 的元素
    const rows = document.querySelectorAll('[role="row"]');
    // 找到第一个 role="row" 并添加新的列名
    const firstRow = document.querySelector('[role="row"]');
    if (window.location.href.includes('/search/')) {
        const lastColumn = firstRow.children[firstRow.children.length - 1];
        lastColumn.style.width = `60px`;
        lastColumn.style.flex = `60 0 auto`;
    }
    headerCell = firstRow.querySelector('[name="rating"]');
    if (!headerCell) {
        headerCell = document.createElement('div');
        headerCell.setAttribute('role', 'columnheader');
        headerCell.setAttribute('name', 'rating');
        headerCell.style.boxSizing = 'border-box';
        headerCell.style.flex = '60 0 auto';
        headerCell.style.minWidth = '0px';
        headerCell.style.width = '60px';
        if (window.location.href.includes('/search/')) {
            headerCell.classList.add('mx-2', 'py-[11px]', 'font-normal');
        } else {
            headerCell.classList.add('mx-2', 'py-[11px]', 'font-normal', 'text-label-3', 'dark:text-dark-label-3');
        }
        if (LANG === 'zh') {
            headerCell.textContent = '难度分';
        } else {
            headerCell.textContent = 'Rating';    
        }
        firstRow.appendChild(headerCell);
    }

    // 遍历所有 role="row" 的元素，并为每个元素添加新的列
    rows.forEach(row => {
        if (window.location.href.includes('/search/')) {
            const lastColumn = row.children[row.children.length - 1];
            lastColumn.style.width = `60px`;
            lastColumn.style.flex = `60 0 auto`;
        }
        link = row.querySelector('.truncate a');
        // id的提取容易出错，换成slug
        /*var id;
        if (link) {
            const match = link.textContent.match(/\d+/);
            if (match) {
                id = parseInt(match[0], 10);
            }
        }*/
        var slug;
        if (link) {
            slug = extractTitleSlug(link.getAttribute('href'));
        }
        if (slug) {
            ratingCell = row.querySelector('[name="rating"]');
            if (!ratingCell) {
                ratingCell = document.createElement('div');
                ratingCell.setAttribute('role', 'cell');
                ratingCell.setAttribute('name', 'rating');
                ratingCell.style.boxSizing = 'border-box';
                ratingCell.style.flex = '60 0 auto';
                ratingCell.style.minWidth = '0px';
                ratingCell.style.width = '60px';
                ratingCell.classList.add('mx-2', 'flex', 'items-center', 'py-[11px]');
                row.appendChild(ratingCell);
            }
            if (problemsbyslug.has(slug)) {
                ratingCell.textContent = Math.floor(problemsbyslug.get(slug).Rating);
            } else {
                ratingCell.textContent = '';
            }
        }
    });
}

// 在问题描述页显示难度分
function displayRatingOnDesc() {
    if (problemsbyslug.size === 0 || !document.querySelector('.text-title-large a') || document.querySelector('[name="rating"]')) {
        return;
    }
    url = window.location.href;
    slug = extractTitleSlug(url);
    if (!problemsbyslug.has(slug)) {
        console.log('No rating data found for the problem.');
        return;
    }
    targetDiv = document.querySelector('.text-difficulty-easy');
    if (!targetDiv) {
        targetDiv = document.querySelector('.text-difficulty-medium');
    }
    if (!targetDiv) {
        targetDiv = document.querySelector('.text-difficulty-hard');
    }
    if (!targetDiv) {
        console.log('No difficulty level found.');
        return;
    }
    rating = Math.floor(problemsbyslug.get(slug).Rating);
    var ratingDiv = document.createElement('div');
    ratingDiv.setAttribute('name', 'rating');
    ratingDiv.className = 'relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary cursor-pointer transition-colors hover:bg-fill-primary hover:text-text-primary text-sd-secondary-foreground hover:opacity-80';
    ratingDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="h-3.5 w-3.5"><path fill-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6h2zm-2 2h2v2h-2z" clip-rule="evenodd"></path></svg>${rating}`;
    targetDiv.parentElement.insertBefore(ratingDiv, targetDiv.nextSibling);
}

// 在未归类页面上查找问题链接，在链接后面显示难度分
function displayRatingOnLinks() {
    if (problemsbyslug.size === 0) {
        return;
    }
    const links = document.querySelectorAll('a');
    // 排除导航栏
    const excludeElement = document.querySelector('[id="leetcode-navbar"]');
    links.forEach(link => {
        if (excludeElement && excludeElement.contains(link)) {
            return;
        }
        const slug = extractTitleSlug(link.getAttribute('href'));
        // console.log(slug);
        if (slug && problemsbyslug.get(slug)) {
            // 创建一个新的文本节点，并添加到当前超链接之后
            const rating = Math.floor(problemsbyslug.get(slug).Rating);
            const existingTextNode = link.nextSibling;
            if (!existingTextNode || existingTextNode.textContent.trim() != rating) {
                // const textNode = document.createTextNode(` ${rating}`);
                // link.parentNode.insertBefore(textNode, link.nextSibling);
                const ratingElement = document.createElement('span');
                ratingElement.textContent = `${rating}`;
                link.parentNode.insertBefore(ratingElement, link.nextSibling);
                // 美化样式
                // ratingElement.style.fontSize = '14px';
                ratingElement.style.padding = '2px 5px';
                ratingElement.style.marginLeft = '5px';
                ratingElement.style.backgroundColor = '#f0f0f0';
                ratingElement.style.borderRadius = '5px';
            }
        }
    });
}

// 在题单页面的列表上显示难度分
function displayRatingOnList() {
    if (problemsbyslug.size === 0) {
        return;
    }
    const links = document.querySelectorAll('a');
    const excludeElement = document.querySelector('[id="leetcode-navbar"]');
    links.forEach(link => {
        if (excludeElement && excludeElement.contains(link)) {
            return;
        }
        const slug = extractTitleSlug(link.getAttribute('href'));
        // console.log(slug);
        if (!slug || !problemsbyslug.get(slug)) return;
        const rating = Math.floor(problemsbyslug.get(slug).Rating);
        difficultyElement = link.querySelector('.text-sd-hard');
        if (!difficultyElement) {
            difficultyElement = link.querySelector('.text-sd-medium');
        }
        if (!difficultyElement) {
            difficultyElement = link.querySelector('.text-sd-easy');
        }
        if (!difficultyElement) {
            return;
        }
        const existingTextNode = difficultyElement.nextSibling;
        if (!existingTextNode || existingTextNode.textContent.trim() != rating) {
            // 创建一个新的元素来显示分数值
            const ratingElement = document.createElement('span');
            ratingElement.textContent = `${rating}`;
            ratingElement.classList.add('text-[14px]', 'text-sd-accent');
            difficultyElement.parentNode.insertBefore(ratingElement, difficultyElement.nextSibling);
            // 美化样式
            ratingElement.style.display = 'inline-block';
            ratingElement.style.paddingLeft = '5px';
            ratingElement.style.margin = '5px';
            ratingElement.style.borderLeft = '1px solid #ccc';
        }
    });
}

// 在学习计划页面上显示难度分
function displayRatingOnPlan() {
    if (problemsbytitle.size === 0) {
        return;
    }
    titles = document.querySelectorAll('.truncate');
    titles.forEach(title => {
        if (!title.textContent || !problemsbytitle.get(title.textContent)) return;
        rating = Math.floor(problemsbytitle.get(title.textContent).Rating);
        difficultyElement = title.parentNode.parentNode.parentNode.querySelector('.text-lc-green-60');
        if (!difficultyElement) {
            difficultyElement = title.parentNode.parentNode.parentNode.querySelector('.text-lc-yellow-60');
        }
        if (!difficultyElement) {
            difficultyElement = title.parentNode.parentNode.parentNode.querySelector('.text-lc-red-60');
        }
        if (!difficultyElement) {
            return;
        }
        const existingTextNode = difficultyElement.nextSibling;
        if (!existingTextNode || existingTextNode.textContent.trim() != rating) {
            // 创建一个新的元素来显示分数值
            const ratingElement = document.createElement('span');
            ratingElement.textContent = `${rating}`;
            ratingElement.classList.add('text-[14px]', 'text-sd-accent');
            difficultyElement.parentNode.insertBefore(ratingElement, difficultyElement.nextSibling);
            // 美化样式
            ratingElement.style.display = 'inline-block';
            ratingElement.style.paddingLeft = '5px';
            ratingElement.style.margin = '5px';
            ratingElement.style.borderLeft = '1px solid #ccc';
        }
    });
}

function extractTitleSlug(url) {
    if (!url) {
        return null;
    }
    // 正则表达式用于匹配问题名称
    const regex = /\/problems\/([^/?]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
        return match[1];
    } else {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 页面 DOM 加载完成后执行此函数
    // LeetCode页面是完全动态生成的，此监听不生效，不知道是什么原因
    console.log('DOMContentLoaded');
});

window.addEventListener('load', function () {
    console.log('Page fully loaded');
    LANG = document.documentElement.lang;
    // 等待页面加载完成之后调用fetchRatingData
    fetchRatingData();
});