# LeetCode Rating Extension for Chrome
 Chrome extension to display the rating of the problems in leetcode

## About

在LeetCode页面上显示题目的详细难度分，用于帮助用户更好地理解和评估题目的难度

支持的页面包括：
1. 题目描述页
2. 题库页面的题目列表
3. 搜索页面的题目列表
4. 题单页面的题目列表
5. 学习计划页面的题目列表
6. 做题分析页面
7. 其他页面，主要是讨论帖子里如果嵌入了题目链接，会在链接后显示难度分，同时会显示题目的完成状态，在刷各位大神的题单时能更直观的看到自己的进度
8. 反向在难度分页面上（https://zerotrac.github.io/leetcode_problem_rating/）显示题目完成状态，能帮助用户更好的按照难度分刷题。因为LeetCode的API禁止跨域访问，在难度分页面上无法直接调用LeetCode API来获取题目完成状态，所以为了使用该功能，用户需要先访问LeetCode页面，插件会将获取到的题目状态数据缓存到浏览器的localStorage，这样在难度分页面上就能从本地获取到数据。

难度分数据来自：https://zerotrac.github.io/leetcode_problem_rating/

原始数据里难度分是浮点数，页面上显示的数字为下取整  
部分题目没有难度分数据（745以前的老题，近一个月出现的新题）

## Install
目前此插件没有正式发布，需要以开发者模式安装
1. 将此项目Clone到本地
2. 打开Chrome的扩展程序管理页面：chrome://extensions/
3. 在右上角打开“开发者模式”
4. 点击“加载已解压的扩展程序”，选择clone的项目文件夹，打开

初步测试，此插件也可以支持Edge浏览器（或者其他与Chrome同内核的浏览器）
