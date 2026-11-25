/**
 * 赛场动态渲染：读 data/race-days.json，按「比赛日 × 两辆车」渲染横向叠卡
 * 数据由 tools/sync-wechat.mjs 生成/更新
 */
(function () {
    'use strict';

    var grid = document.getElementById('raceGrid');
    if (!grid) return;

    var cache = null;

    function lang() {
        return document.documentElement.lang === 'en' ? 'en' : 'zh';
    }

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeUrl(url) {
        var u = String(url || '');
        return /^https?:\/\//i.test(u) ? u : '#';
    }

    function carLabel(car) {
        if (lang() === 'en') return car === 'ev' ? 'FSEC · Electric' : 'FSAC · Driverless';
        return car === 'ev' ? 'FSEC · 电车' : 'FSAC · 无人车';
    }

    function shortDate(date) {
        // 2025-11-24 -> 11.24
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
        return m ? m[2] + '.' + m[3] : '';
    }

    function titleOf(item) {
        if (!item) return '';
        return lang() === 'en' && item.title_en ? item.title_en : (item.short || item.title || '');
    }

    function card(item, car) {
        if (!item) return '';
        return '<a class="race-card ' + car + '" href="' + esc(safeUrl(item.url)) + '" target="_blank" rel="noopener">' +
            '<div class="race-cover" style="background-image:url(\'' + esc(item.local) + '\')"></div>' +
            '<div class="race-body">' +
            '<div class="race-tag"><i class="dot"></i>' + esc(carLabel(car)) + '</div>' +
            '<h3>' + esc(titleOf(item)) + '</h3>' +
            '</div></a>';
    }

    function render(days) {
        if (!days || !days.length) {
            grid.innerHTML = '';
            return;
        }
        grid.innerHTML = days.map(function (d) {
            return '<div class="race-day">' +
                '<div class="race-head"><b>DAY ' + esc(d.day) + '</b><span>' + esc(shortDate(d.date)) + '</span></div>' +
                '<div class="race-cell">' + card(d.ev, 'ev') + card(d.av, 'av') + '</div>' +
                '</div>';
        }).join('');
    }

    function load() {
        fetch('data/race-days.json', { cache: 'no-cache' })
            .then(function (resp) {
                if (!resp.ok) throw new Error('race-days.json ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                cache = Array.isArray(data.days) ? data.days.slice().sort(function (a, b) {
                    return String(b.date).localeCompare(String(a.date));
                }) : [];
                render(cache);
            })
            .catch(function (err) {
                console.warn('[race] 加载失败：', err.message);
                grid.innerHTML = '';
            });
    }

    if (window.I18n && typeof window.I18n.onChange === 'function') {
        window.I18n.onChange(function () {
            if (cache) render(cache);
        });
    }

    load();
})();
