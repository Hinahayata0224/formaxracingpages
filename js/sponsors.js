/**
 * 赞助商墙：从 data/sponsors.json 渲染
 * 结构：{ tiers: [ { key, class, title, title_en, items: [ { name, img, url, width, height } ] } ] }
 */
(function () {
    'use strict';

    var mount = document.getElementById('sponsorsList');
    if (!mount) return;

    var cache = null;
    var TIER_CLASS = { diamond: 'platinum-sponsors', gold: 'gold-sponsors', silver: 'silver-sponsors' };

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
        return /^https?:\/\//i.test(u) ? u : '';
    }

    function renderTier(tier) {
        var title = (lang() === 'en' && tier.title_en) ? tier.title_en : tier.title;
        var cls = tier.class || TIER_CLASS[tier.key] || 'silver-sponsors';
        var items = (tier.items || []).map(function (s) {
            var img = '<img src="' + esc(s.img) + '" alt="' + esc(s.name || '') + '"' +
                (s.width ? ' width="' + esc(s.width) + '"' : '') +
                (s.height ? ' height="' + esc(s.height) + '"' : '') +
                ' loading="lazy" decoding="async">';
            var url = safeUrl(s.url);
            return '<div class="sponsor">' + (url
                ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + img + '</a>'
                : img) + '</div>';
        }).join('');

        return '<div class="sponsors-level ' + esc(cls) + '">' +
            '<h3>' + esc(title) + '</h3>' +
            '<div class="sponsors-container" data-reveal-stagger>' + items + '</div>' +
            '</div>';
    }

    function render() {
        if (!cache) return;
        mount.innerHTML = cache.tiers.map(renderTier).join('');
    }

    fetch('data/sponsors.json', { cache: 'no-cache' })
        .then(function (resp) {
            if (!resp.ok) throw new Error('sponsors.json ' + resp.status);
            return resp.json();
        })
        .then(function (data) {
            cache = { tiers: Array.isArray(data.tiers) ? data.tiers : [] };
            render();
        })
        .catch(function (err) {
            console.warn('[sponsors] 加载失败：', err.message);
        });

    if (window.I18n && typeof window.I18n.onChange === 'function') {
        window.I18n.onChange(function () { render(); });
    }
})();
