// 在LeetCode页面上显示问题的难度分
const DATA_URL = 'https://zerotrac.github.io/leetcode_problem_rating/data.json';

LANG = 'zh';
const RATING_DATA_KEY = 'lc-rating-data';
const RATING_DATA_TS_KEY = 'lc-rating-data-ts';
const PROBLEM_STATUS_KEY = 'lc-problems-status';
const PROBLEM_STATUS_TS_KEY = 'lc-problems-status-ts';
const LC_SESSION_KEY = 'lc-session';

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

function loadRatingData(callback) {
    chrome.storage.local.get([RATING_DATA_KEY, RATING_DATA_TS_KEY], function(items) {
        if (items[RATING_DATA_KEY]) {
            data = items[RATING_DATA_KEY];
            console.log('Load rating data from local: ', data.length);
            data.forEach(item => {
                problemsbyslug.set(item.TitleSlug, item);
                if (LANG === 'zh') {
                    problemsbytitle.set(item.TitleZH, item);
                } else {
                    problemsbytitle.set(item.Title, item);
                }
            });
        }
        // 间隔12小时以上，重新fetch一次
        if (!items[RATING_DATA_TS_KEY] || items[RATING_DATA_TS_KEY] < Date.now() - 43200000) {
            console.log('Fetch rating data from remote.');
            fetchRatingData().then(data => {
                chrome.storage.local.set({[RATING_DATA_KEY]: data, [RATING_DATA_TS_KEY]: Date.now()}, function() {
                    console.log('Rating data saved.');
                });
                callback();
            });
        } else {
            callback();
        }
    });
}

async function fetchProblems(skip, pageSize, status) {
    try {
        host = window.location.host;
        const response = await fetch(`https://${host}/graphql/`, {
            "headers": {
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache"
            },
            "referrer": `https://${host}/problemset/`,
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
            return null; // 出现错误，退出
        }
    }
    console.log('Total AC problems: ', allData.length);
    allData.forEach(item => {
        problemsStatus.set(item.titleSlug, item.status);
        // console.log(item.titleSlug, item.status);
    });
    return allData;
}

function loadProblemStatus(callback) {
    chrome.storage.local.get([
        PROBLEM_STATUS_KEY,
        PROBLEM_STATUS_TS_KEY,
        LC_SESSION_KEY
    ], function(items) {
        if (items[PROBLEM_STATUS_KEY]) {
            allData = items[PROBLEM_STATUS_KEY];
            console.log('Total problems status from local: ', allData.length);
            allData.forEach(item => {
                problemsStatus.set(item.titleSlug, item.status);
            });
        }
        // 只能在 leetcode 域下才从远程获取，其他域从本地获取
        if (!window.location.host.includes('leetcode')) {
            console.log('Not leetcode domain. Problem status can only be loaded from local storage.');
            callback();
            return;
        }
        // 满足以下条件之一才会从远程刷新数据：
        // 1. 本地没有数据
        // 2. Leetcode session变化
        // 3. 本地数据过期，超过30分钟
        let session = document.cookie.split('; ').find(row => row.startsWith('LEETCODE_SESSION=')) || '';
        if (!items[PROBLEM_STATUS_KEY] ||
            items[PROBLEM_STATUS_KEY].size === 0 ||
            items[LC_SESSION_KEY] !== session ||
            items[PROBLEM_STATUS_TS_KEY] < Date.now() - 1800000) {
            fetchAllACProblems().then(data => {
                if (data) {
                    chrome.storage.local.set({
                        [PROBLEM_STATUS_KEY]: data,
                        [PROBLEM_STATUS_TS_KEY]: Date.now(),
                        [LC_SESSION_KEY] : session
                    }, function() {
                        console.log('Problems status saved.');
                    });
                }
                callback();
            });
        } else {
            callback();
        }
    });
}

function display() {
    url = window.location.href;
    if (url.includes('/problems/')) {
        if (url.includes('/description/')) displayRatingOnDesc();
    } else if (url.includes('/search/')) {
        displayRatingOnTable();
    } else if (url.includes('/problemset/') || url.includes('/problem-list/')) {
        displayRatingOnList();
    } else if (url.includes('/studyplan/')) {
        displayRatingOnPlan();
    } else if (url.includes('/progress/')) {
        displayRatingOnProgress();
    } else if (url.includes('/leetcode_problem_rating/')) {
        displayStatusOnRating();
    } else if (window.location.pathname !== '/') { // 不对首页做改动
        displayRatingOnLinks();
    }
    if (isUserProfilePage()) {
        addStatsButtonToUserStatsCard();
    }
}

// 在“搜索”页面的问题列表中显示难度分
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
        // console.log('No rating data found for the problem.');
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
    const excludeElement = document.querySelector('nav');
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

// 在题库和题单页面的列表上显示难度分
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
            // ratingElement.style.margin = '5px';
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
    rows = document.querySelectorAll('div[role="row"]');
    rows.forEach(row => {
        if (!row.querySelector('a')) return;
        const slug = extractTitleSlug(row.querySelector('a').getAttribute('href'));
        if (!slug || !problemsbyslug.get(slug)) return;
        const rating = Math.floor(problemsbyslug.get(slug).Rating);
        difficultyElement = row.querySelector('div.text-sd-easy');
        if (!difficultyElement) {
            difficultyElement = row.querySelector('div.text-sd-medium');
        }
        if (!difficultyElement) {
            difficultyElement = row.querySelector('div.text-sd-hard');
        }
        if (!difficultyElement) {
            return;
        }
        const existingTextNode = difficultyElement.querySelector('span.text-sd-accent');
        if (!existingTextNode) {
            // 创建一个新的元素来显示分数值
            const ratingElement = document.createElement('span');
            ratingElement.textContent = `${rating}`;
            ratingElement.classList.add('text-[14px]', 'text-sd-accent');
            difficultyElement.insertBefore(ratingElement, difficultyElement.textContent.nextSibling);
            // 美化样式
            ratingElement.style.display = 'inline-block';
            ratingElement.style.paddingLeft = '5px';
            ratingElement.style.margin = '5px';
            ratingElement.style.borderLeft = '1px solid #ccc';
        }
    })
}

function displayStatusOnRating() {
    if (problemsStatus.size === 0) {
        return;
    }
    const tableBody = document.querySelector('.el-table tbody');
    // 添加表头
    const colGroup = document.querySelector('.el-table colgroup');
    col = colGroup.querySelector('[name="rating"]');
    if (!col) {
        col = document.createElement('col');
        col.setAttribute('name', 'rating');
        col.style.width = '60px';
        colGroup.insertBefore(col, colGroup.firstChild);
    }
    const headerRow = document.querySelector('.el-table thead tr');
    headerCell = headerRow.querySelector('[name="rating"]');
    if (!headerCell) {
        headerCell = document.createElement('th');
        headerCell.setAttribute('name', 'rating');
        headerRow.insertBefore(headerCell, headerRow.firstChild);
    }
    headerCell.innerHTML = '<div class="cell">状态</div>'
    headerCell.className = 'el-table__cell';

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        link = row.querySelector('.el-table_1_column_2 a');
        var slug;
        if (link) {
            slug = extractTitleSlug(link.getAttribute('href'));
        }
        statusCell = row.querySelector('[name="rating"]');
        if (!statusCell) {
            statusCell = document.createElement('td');
            statusCell.setAttribute('name', 'rating');
            row.insertBefore(statusCell, row.firstChild);
        }
        statusCell.className = 'el-table__cell';
        if (slug && problemsStatus.get(slug) === 'AC') {
            statusCell.innerHTML = `<div class="cell"><span><svg xmlns="http://www.w3.org/2000/svg" style="transform: translateY(20%);" viewBox="0 0 24 24" width="1em" height="1em" fill="rgb(45 181 93)"><path fill-rule="evenodd" d="M20 12.005v-.828a1 1 0 112 0v.829a10 10 0 11-5.93-9.14 1 1 0 01-.814 1.826A8 8 0 1020 12.005zM8.593 10.852a1 1 0 011.414 0L12 12.844l8.293-8.3a1 1 0 011.415 1.413l-9 9.009a1 1 0 01-1.415 0l-2.7-2.7a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg></span></div>`;
        } else {
            statusCell.innerHTML = '';
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

// 检查是否在用户页面
function isUserProfilePage() {
    return window.location.href.includes('/u/');
}

// 在用户统计卡片上添加按钮
function addStatsButtonToUserStatsCard() {
    // 查找统计卡片
    // 因为leetcode页面元素没有id，所以只能用class来查找，注意以后可能会变化
    const statsCard = document.querySelector('.bg-layer-1.dark\\:bg-dark-layer-1.shadow-down-01.dark\\:shadow-dark-down-01.rounded-lg.min-w-max.max-w-full.w-full.flex-1');
    if (!statsCard) {
        setTimeout(addStatsButtonToUserStatsCard, 1000);
        return;
    }

    // 避免重复添加按钮
    if (document.getElementById('leetcode-rating-stats-btn')) {
        return;
    }

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = '10px';
    buttonContainer.style.left = '10px';
    buttonContainer.style.zIndex = '10';

    // 创建按钮
    const statsButton = document.createElement('button');
    statsButton.id = 'leetcode-rating-stats-btn';
    statsButton.className = 'rounded-full p-1 bg-layer-2 dark:bg-dark-layer-2 hover:bg-fill-3 dark:hover:bg-dark-fill-3 transition-colors';
    statsButton.style.width = '32px';
    statsButton.style.height = '32px';
    statsButton.style.display = 'flex';
    statsButton.style.alignItems = 'center';
    statsButton.style.justifyContent = 'center';
    statsButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
    
    // 添加图标
    const icon = document.createElement('img');
    icon.src = 'https://zerotrac.github.io/leetcode_problem_rating/favicon.ico';
    icon.style.width = '20px';
    icon.style.height = '20px';
    
    // 添加点击事件
    statsButton.addEventListener('click', function(event) {
        event.stopPropagation(); // 阻止事件冒泡
        showRatingStats(this);
    });
    
    // 组装按钮
    statsButton.appendChild(icon);
    buttonContainer.appendChild(statsButton);
    
    // 添加到统计卡片
    statsCard.style.position = 'relative';
    statsCard.appendChild(buttonContainer);
}

// 显示分数段统计信息
function showRatingStats(buttonElement) {
    // 移除已存在的统计信息面板
    const existingPanel = document.getElementById('leetcode-rating-stats-container');
    if (existingPanel) {
        existingPanel.remove();
    } else {
        // 创建统计信息面板
        const statsContainer = document.createElement('div');
        statsContainer.id = 'leetcode-rating-stats-container';
        statsContainer.style.position = 'absolute';
        statsContainer.style.zIndex = '1000';
        statsContainer.style.backgroundColor = '#fff';
        statsContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        statsContainer.style.borderRadius = '8px';
        statsContainer.style.padding = '15px';
        statsContainer.style.width = '350px';
        statsContainer.style.maxHeight = '80vh';
        statsContainer.style.overflowY = 'auto';
        statsContainer.style.border = '1px solid #eee';
        
        // 设置面板位置 - 在按钮右侧显示
        const buttonRect = buttonElement.getBoundingClientRect();
        statsContainer.style.top = `${buttonRect.top}px`;
        statsContainer.style.left = `${buttonRect.right + 10}px`;
        
        // 添加暗色模式支持
        statsContainer.classList.add('dark:bg-dark-layer-1', 'dark:border-dark-border');
        
        // 显示统计数据
        displayRatingStats(statsContainer);
        
        // 添加到页面
        document.body.appendChild(statsContainer);
        
        // 点击页面其他部分时关闭面板
        document.addEventListener('click', function closePanel(e) {
            if (!statsContainer.contains(e.target) && e.target !== buttonElement) {
                statsContainer.remove();
                document.removeEventListener('click', closePanel);
            }
        });
    }
}

// 显示统计结果
function displayRatingStats(container) {
    // 模拟数据 - 实际使用时应该从 problemsbyslug 和 problemsStatus 中获取
    const statsData = calculateRatingStats();
    
    let html = '<h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; font-weight: 600;">题目分数段完成比例</h3>';
    html += '<div>';
    
    // 创建表格
    html += `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">分数段</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">已解决</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">总题数</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">完成比例</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    statsData.forEach(stat => {
        html += `
            <tr>
                <td style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">${stat.label}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${stat.solved}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">${stat.total}</td>
                <td style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">
                    <div style="display: flex; align-items: center;">
                        <span style="margin-right: 8px;">${stat.percentage.toFixed(2)}%</span>
                        <div style="flex-grow: 1; background-color: #eee; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background-color: #5cb85c; height: 100%; width: ${stat.percentage}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    html += '</div>';
    container.innerHTML = html;
}

// 计算不同分数段的完成比例
function calculateRatingStats() {
    // 定义分数段
    const ratingBrackets = [
        { min: 1000, max: 1400, label: '1000-1400' },
        { min: 1400, max: 1800, label: '1400-1800' },
        { min: 1800, max: 2000, label: '1800-2000' },
        { min: 2000, max: 2300, label: '2000-2300' },
        { min: 2300, max: 2500, label: '2300-2500' },
        { min: 2500, max: 2700, label: '2500-2700' },
        { min: 2700, max: 3000, label: '2700-3000' },
        { min: 3000, max: 10000, label: '3000+' }
    ];
    
    // 初始化统计数据
    const stats = ratingBrackets.map(bracket => ({
        ...bracket,
        total: 0,
        solved: 0,
        percentage: 0
    }));
    
    // 统计每个分数段的题目总数和已解决数
    problemsbyslug.forEach((problem, slug) => {
        if (!problem.Rating) return;
        
        const rating = problem.Rating;
        const isSolved = problemsStatus.get(slug) === 'AC';
        
        for (const stat of stats) {
            if (rating >= stat.min && rating < stat.max) {
                stat.total++;
                if (isSolved) {
                    stat.solved++;
                }
                break;
            }
        }
    });
    
    // 计算百分比
    stats.forEach(stat => {
        stat.percentage = stat.total > 0 ? (stat.solved / stat.total * 100) : 0;
    });
    
    return stats;
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
    loadProblemStatus(function() {
        display();
    });

    loadRatingData(function () {
        // 数据加载完成后，开始监听 DOM 变化
        const config = { childList: true, subtree: true, characterData: true };
        const targetNode = document.body || document.documentElement;
        const observer = new MutationObserver(function (mutationsList, observer) {
            // console.log('DOM changed');
            observer.disconnect(); // 停止监听，避免重复监听
            display();
            observer.observe(targetNode, config); // 重新开始监听
        });
        observer.observe(targetNode, config);
    });
});