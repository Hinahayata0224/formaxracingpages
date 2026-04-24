/* ============================================
   Formax Racing Website - Shared Components
   ============================================ */

var Components = (function () {
    'use strict';

    var NAV_ITEMS = [
        { key: 'nav.home', href: '/#home', section: 'home' },
        { key: 'nav.about', href: '/#about', section: 'about' },
        { key: 'nav.achievements', href: '/#achievements', section: 'achievements' },
        { key: 'nav.cars', href: '/#car', section: 'car' },
        { key: 'nav.team', href: '/#team', section: 'team' },
        { key: 'nav.groups', href: '/#groups', section: 'groups' },
        { key: 'nav.news', href: '/#news', section: 'news' },
        { key: 'nav.sponsors', href: '/#sponsors', section: 'sponsors' },
        { key: 'nav.contact', href: '/#contact', section: 'contact' }
    ];

    function buildNav(isHomePage) {
        var base = isHomePage ? '' : '/';
        var html = '';
        html += '<header>';
        html += '<div class="container">';
        html += '<nav>';
        html += '<div class="logo">';
        html += '<a href="' + (isHomePage ? '#home' : '/') + '">';
        html += '<img src="image/logo/logo.png" alt="Formax" data-i18n-alt="common.logoAlt">';
        html += '</a>';
        html += '</div>';
        html += '<ul class="nav-links">';

        NAV_ITEMS.forEach(function (item) {
            var href = isHomePage ? ('#' + item.section) : (base + '#' + item.section);
            html += '<li><a href="' + href + '" data-i18n="' + item.key + '">' + item.key + '</a></li>';
        });

        html += '</ul>';
        html += '<div class="hamburger">';
        html += '<i class="fas fa-bars"></i>';
        html += '</div>';
        html += '</nav>';
        html += '</div>';
        html += '</header>';
        return html;
    }

    function buildFooter() {
        var html = '';
        html += '<footer>';
        html += '<div class="container">';
        html += '<div class="social-links">';
        html += '<a href="https://weibo.com/u/7822135530" target="_blank" title="Weibo"><i class="fab fa-weibo"></i></a>';
        html += '<a href="https://mp.weixin.qq.com/s/4kNCS-z1ISjhzN9l_gPppA" target="_blank" title="WeChat"><i class="fab fa-weixin"></i></a>';
        html += '<a href="https://www.douyin.com/user/MS4wLjABAAAASI_A4qRxl4_qRsqXSEQ-MmYTEQxgWa0QbR-hhTGfYvo" target="_blank" title="Douyin"><i class="fab fa-instagram"></i></a>';
        html += '<a href="https://space.bilibili.com/398023708?spm_id_from=333.337.search-card.all.click" target="_blank" title="Bilibili"><i class="fab fa-bilibili"></i></a>';
        html += '</div>';
        html += '<p><span data-i18n="footer.copyright">&copy; 2009-2026 Formax Racing</span> <span data-i18n="footer.rights">All rights reserved.</span></p>';
        html += '</div>';
        html += '</footer>';
        return html;
    }

    return {
        injectHeader: function (isHomePage) {
            var navHtml = buildNav(isHomePage === true);
            var body = document.body;
            var placeholder = document.getElementById('nav-placeholder') || document.createElement('div');
            if (!placeholder.id) {
                placeholder.id = 'nav-placeholder';
                body.insertBefore(placeholder, body.firstChild);
            }
            placeholder.outerHTML = navHtml;
        },

        injectFooter: function () {
            var footerHtml = buildFooter();
            var body = document.body;
            var placeholder = document.getElementById('footer-placeholder') || document.createElement('div');
            if (!placeholder.id) {
                placeholder.id = 'footer-placeholder';
                body.appendChild(placeholder);
            }
            placeholder.outerHTML = footerHtml;
        },

        injectAll: function (isHomePage) {
            this.injectHeader(isHomePage);
            this.injectFooter();
        }
    };
})();
