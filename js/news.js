/* ============================================
   Formax Racing Website - News Feed Renderer
   数据源：data/news.json（公众号推文清单）
   换语言时会跟着重渲染（监听 I18n.onChange）
   ============================================ */

(function () {
    'use strict';

    var listEl = document.getElementById('newsList');
    if (!listEl) return;

    var limit = parseInt(listEl.getAttribute('data-count'), 10) || 4;
    var items = [];
    var loaded = false;

    function lang() {
        return (window.I18n && I18n.getLocale) ? I18n.getLocale() : 'zh';
    }

    function pick(item, base) {
        var localized = lang() === 'en' ? item[base + '_en'] : item[base];
        return localized || item[base] || '';
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function safeUrl(url) {
        return /^https:\/\//i.test(url || '') ? url : 'https://mp.weixin.qq.com/';
    }

    function render() {
        // 数据还没回来时先留空，避免出现「请关注公众号」的闪烁
        if (!loaded && !items.length) {
            listEl.innerHTML = '';
            return;
        }

        if (!items.length) {
            var fallback = lang() === 'en'
                ? 'Follow our WeChat account for the latest news'
                : '最新动态请关注我们的微信公众号';
            listEl.innerHTML =
                '<div class="news-item"><div class="news-date">News</div>' +
                '<h3 class="news-title"><a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener">' +
                esc(fallback) + '</a></h3></div>';
            return;
        }

        var html = '';
        items.slice(0, limit).forEach(function (item) {
            var tag = pick(item, 'tag');
            html += '<div class="news-item">';
            html += '<div class="news-date">' + esc(item.date || '') + (tag ? ' · ' + esc(tag) : '') + '</div>';
            html += '<h3 class="news-title"><a href="' + esc(safeUrl(item.url)) + '" target="_blank" rel="noopener">' +
                esc(pick(item, 'title')) + '</a></h3>';
            html += '</div>';
        });
        listEl.innerHTML = html;
    }

    function load() {
        fetch('data/news.json', { cache: 'no-cache' })
            .then(function (resp) {
                if (!resp.ok) throw new Error('news.json ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                items = (data.items || []).slice().sort(function (a, b) {
                    return String(b.date || '').localeCompare(String(a.date || ''));
                });
                loaded = true;
                render();
            })
            .catch(function () {
                loaded = true;
                items = [];
                render();
            });
    }

    // 语言切换后按新语言重渲染
    if (window.I18n && I18n.onChange) {
        I18n.onChange(function () { render(); });
    }

    load();

    window.FormaxNews = {
        reload: function () { load(); },
        count: function () { return items.length; },
        isLoaded: function () { return loaded; }
    };
})();
