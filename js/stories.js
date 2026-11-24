/* ============================================
   Formax Racing Website - Alumni Stories Renderer
   数据源：data/stories.json（公众号人物专访清单）
   ============================================ */

(function () {
    'use strict';

    var listEl = document.getElementById('storiesList');
    if (!listEl) return;

    var limit = parseInt(listEl.getAttribute('data-count'), 10) || 3;
    var items = [];
    var loaded = false;

    var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

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

    // ISO 日期按语言展示：2026-09-08 -> 2026年9月8日 / September 8, 2026
    function formatDate(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
        if (!m) return String(iso || '');
        var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
        if (lang() === 'en') return MONTHS_EN[mo - 1] + ' ' + d + ', ' + y;
        return y + '年' + mo + '月' + d + '日';
    }

    function render() {
        if (!loaded && !items.length) {
            listEl.innerHTML = '';
            return;
        }

        if (!items.length) {
            var fallback = lang() === 'en'
                ? 'Read more team stories on our WeChat account'
                : '更多人物故事请关注我们的微信公众号';
            listEl.innerHTML =
                '<div class="story-card"><a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener" class="read-more">' +
                '<div class="story-content"><h3>' + esc(fallback) + '</h3></div></a></div>';
            return;
        }

        var html = '';
        items.slice(0, limit).forEach(function (item) {
            html += '<div class="story-card">'
                + '<a href="' + esc(safeUrl(item.url)) + '" target="_blank" rel="noopener" class="read-more">'
                + '<div class="story-content">'
                + '<div class="story-date">' + esc(formatDate(item.date)) + '</div>'
                + '<h3>' + esc(pick(item, 'title')) + '</h3>'
                + '<p class="story-excerpt">' + esc(pick(item, 'excerpt')) + '</p>'
                + '</div></a></div>';
        });
        listEl.innerHTML = html;
    }

    function load() {
        fetch('data/stories.json', { cache: 'no-cache' })
            .then(function (resp) {
                if (!resp.ok) throw new Error('stories.json ' + resp.status);
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

    if (window.I18n && I18n.onChange) {
        I18n.onChange(function () { render(); });
    }

    load();

    window.FormaxStories = {
        reload: function () { load(); },
        count: function () { return items.length; },
        isLoaded: function () { return loaded; }
    };
})();
