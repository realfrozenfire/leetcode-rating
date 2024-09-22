// 在LeetCode页面上显示问题的难度分
const DATA_URL = 'https://zerotrac.github.io/leetcode_problem_rating/data.json';

LANG = 'zh';
problemsbyslug = new Map();
problemsbytitle = new Map();
problemsStatus = new Map();

async function fetchRatingData() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            console.log('Response not ok:', response.status);
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        data.forEach(item => {
            // problems.set(item.ID, item);
            problemsbyslug.set(item.TitleSlug, item);
            if (LANG === 'zh') {
                problemsbytitle.set(item.TitleZH, item);
            } else {
                problemsbytitle.set(item.Title, item);
            }
        });
        return data;
    } catch (error) {
        console.error('Error fetching rating data:', error);
    }
}

async function fetchProblems(skip, pageSize, status) {
    try {
        const response = await fetch(`https://${window.location.host}/graphql/`, {
            "headers": {
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache"
            },
            "referrer": `https://${window.location.host}/problemset/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": `{\"query\":\"\\n    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {\\n  problemsetQuestionList(\\n    categorySlug: $categorySlug\\n    limit: $limit\\n    skip: $skip\\n    filters: $filters\\n  ) {\\n    hasMore\\n    total\\n    questions {\\n      status\\n      titleSlug\\n      }\\n  }\\n}\\n    \",\"variables\":{\"categorySlug\":\"all-code-essentials\",\"skip\":${skip},\"limit\":${pageSize},\"filters\":{\"status\":\"${status}\"}},\"operationName\":\"problemsetQuestionList\"}`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // console.log(data.data.problemsetQuestionList.questions.length);
        return data.data.problemsetQuestionList.questions;
    } catch (error) {
        console.error('Error fetching problems:', error);
    }
}

async function fetchAllACProblems() {
    let allData = [];
    let currentPage = 0;
    let pageSize = 100;
    while (true) {
        try {
            const data = await fetchProblems(currentPage * pageSize, pageSize, 'AC');
            allData = allData.concat(data);
            if (data.length < pageSize) {
                break; // 没有数据了，退出循环
            }
            currentPage++;
        } catch (error) {
            console.error(`Error fetching problems for page ${currentPage}:`, error);
            break; // 出现错误，退出循环
        }
    }
    console.log('Total AC problems: ', allData.length);
    allData.forEach(item => {
        problemsStatus.set(item.titleSlug, item.status);
        // console.log(item.titleSlug, item.status);
    });
    return allData;
}

function loadProblemsSatus() {
    chrome.storage.local.get(['ex-rating-problems-status', 'ex-rating-problems-status-ts'], function(items) {
        if (items['ex-rating-problems-status']) {
            allData = items['ex-rating-problems-status'];
            console.log('Total problems status from local: ', allData.length);
            allData.forEach(item => {
                problemsStatus.set(item.titleSlug, item.status);
            });
        }
        if (items['ex-rating-problems-status-ts'] < Date.now() - 600000) {
            fetchAllACProblems().then(data => {
                chrome.storage.local.set({'ex-rating-problems-status': data, 'ex-rating-problems-status-ts': Date.now()}, function() {
                    console.log('Problems status saved.');
                });
                displayRating();
            });
        }
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
    } else if (url.includes('/progress/')) {
        displayRatingOnProgress();
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
        prevElement = link;
        const slug = extractTitleSlug(link.getAttribute('href'));
        if (slug && problemsStatus.get(slug) === 'AC') {
            if (!prevElement.nextSibling || typeof prevElement.nextSibling.getAttribute !== 'function' || prevElement.nextSibling.getAttribute('id') !== 'status') {
                const checkmark = document.createElement('span');
                checkmark.setAttribute('id', 'status');
                checkmark.style.paddingLeft = '1px';
                checkmark.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="transform: translateY(20%);" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="h-[18px] w-[18px] cursor-pointer text-green-s dark:text-dark-green-s"><path fill-rule="evenodd" d="M20 12.005v-.828a1 1 0 112 0v.829a10 10 0 11-5.93-9.14 1 1 0 01-.814 1.826A8 8 0 1020 12.005zM8.593 10.852a1 1 0 011.414 0L12 12.844l8.293-8.3a1 1 0 011.415 1.413l-9 9.009a1 1 0 01-1.415 0l-2.7-2.7a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`;
                prevElement.parentNode.insertBefore(checkmark, prevElement.nextSibling);
                prevElement = checkmark;
            } else {
                prevElement = prevElement.nextSibling;
            }
        }
        if (!slug || !problemsbyslug.has(slug)) {
            return;
        }
        // 创建一个新的文本节点，并添加到当前超链接之后
        const rating = Math.floor(problemsbyslug.get(slug).Rating);
        const existingTextNode = prevElement.nextSibling;
        if (!existingTextNode || existingTextNode.textContent.trim() != rating) {
            const ratingElement = document.createElement('span');
            ratingElement.textContent = `${rating}`;
            prevElement.parentNode.insertBefore(ratingElement, prevElement.nextSibling);
            // 美化样式
            // ratingElement.style.fontSize = '14px';
            ratingElement.style.padding = '2px 5px';
            ratingElement.style.marginLeft = '5px';
            ratingElement.style.backgroundColor = '#f0f0f0';
            ratingElement.style.borderRadius = '5px';
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

//在做题分析（进度，所有提交）页面上显示难度分
function displayRatingOnProgress() {
    if (problemsbyslug.size === 0) {
        return;
    }
    rows = document.querySelectorAll('tbody tr[data-row-key]');
    rows.forEach(row => {
        const slug = extractTitleSlug(row.querySelector('a').getAttribute('href'));
        if (!slug || !problemsbyslug.get(slug)) return;
        const rating = Math.floor(problemsbyslug.get(slug).Rating);
        const difficultyCell = row.querySelector('.ant-table-cell.progress-level');
        const difficultyElement = difficultyCell.querySelector('span');
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
    })
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
    // 等待页面加载完成之后开始获取数据
    if (window.location.href.includes('/discuss/')) {
        loadProblemsSatus();
    }
    fetchRatingData()
        .then(data => {
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
        });
});