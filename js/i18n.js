/* ============================================
   Formax Racing Website - i18n Translation Engine
   ============================================ */

var I18n = (function () {
    'use strict';

    var currentLocale = 'zh';
    var translations = {};
    var fallbackLocale = 'zh';
    var supportedLocales = ['zh', 'en'];
    var localeNames = { zh: '中', en: 'EN' };

    // ---------- 获取当前语言 ----------
    function detectLocale() {
        // 1) Check localStorage
        var stored = localStorage.getItem('formax-lang');
        if (stored && supportedLocales.indexOf(stored) !== -1) {
            return stored;
        }
        // 2) Check URL parameter
        var params = new URLSearchParams(window.location.search);
        var urlLang = params.get('lang');
        if (urlLang && supportedLocales.indexOf(urlLang) !== -1) {
            return urlLang;
        }
        // 3) Check browser language
        var browserLang = (navigator.language || navigator.userLanguage || '').split('-')[0];
        if (browserLang === 'zh') return 'zh';
        if (browserLang === 'en') return 'en';
        // 4) Default
        return fallbackLocale;
    }

    // ---------- 加载翻译文件 ----------
    function loadLocale(locale) {
        return fetch('locales/' + locale + '.json')
            .then(function (resp) {
                if (!resp.ok) throw new Error('Failed to load locale: ' + locale);
                return resp.json();
            })
            .then(function (data) {
                translations[locale] = data;
                return data;
            });
    }

    // ---------- 获取嵌套翻译 ----------
    function getTranslation(locale, key) {
        var parts = key.split('.');
        var obj = translations[locale];
        if (!obj) return null;
        for (var i = 0; i < parts.length; i++) {
            if (obj[parts[i]] === undefined) return null;
            obj = obj[parts[i]];
        }
        return typeof obj === 'string' ? obj : null;
    }

    // ---------- 翻译单个元素 ----------
    function translateElement(el, locale) {
        // data-i18n (textContent)
        var key = el.getAttribute('data-i18n');
        if (key) {
            var text = getTranslation(locale, key);
            if (!text) text = getTranslation(fallbackLocale, key);
            if (text) el.textContent = text;
        }

        // data-i18n-placeholder
        var phKey = el.getAttribute('data-i18n-placeholder');
        if (phKey) {
            var phText = getTranslation(locale, phKey);
            if (!phText) phText = getTranslation(fallbackLocale, phKey);
            if (phText) el.setAttribute('placeholder', phText);
        }

        // data-i18n-alt
        var altKey = el.getAttribute('data-i18n-alt');
        if (altKey) {
            var altText = getTranslation(locale, altKey);
            if (!altText) altText = getTranslation(fallbackLocale, altKey);
            if (altText) el.setAttribute('alt', altText);
        }

        // data-i18n-title
        var titleKey = el.getAttribute('data-i18n-title');
        if (titleKey) {
            var titleText = getTranslation(locale, titleKey);
            if (!titleText) titleText = getTranslation(fallbackLocale, titleKey);
            if (titleText) el.setAttribute('title', titleText);
        }

        // data-i18n-html (innerHTML)
        var htmlKey = el.getAttribute('data-i18n-html');
        if (htmlKey) {
            var htmlText = getTranslation(locale, htmlKey);
            if (!htmlText) htmlText = getTranslation(fallbackLocale, htmlKey);
            if (htmlText) el.innerHTML = htmlText;
        }
    }

    // ---------- 翻译整个页面 ----------
    function translatePage(locale) {
        var all = document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-alt], [data-i18n-title], [data-i18n-html]');
        all.forEach(function (el) {
            translateElement(el, locale);
        });

        // Update <html lang>
        document.documentElement.setAttribute('lang', locale === 'zh' ? 'zh-CN' : 'en');

        // Update language switcher
        updateSwitcherUI(locale);
    }

    // ---------- 更新语言切换器 UI ----------
    function updateSwitcherUI(locale) {
        var links = document.querySelectorAll('.lang-switch a, .lang-float a');
        links.forEach(function (link) {
            var linkLang = link.getAttribute('data-lang');
            if (linkLang === locale) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // ---------- 构建语言切换器 HTML ----------
    function buildSwitcher(inNav) {
        var html = '';
        if (inNav) {
            html += '<div class="lang-switch">';
            supportedLocales.forEach(function (loc, i) {
                if (i > 0) html += '<span class="lang-sep">|</span>';
                html += '<a href="javascript:void(0)" data-lang="' + loc + '">' + localeNames[loc] + '</a>';
            });
            html += '</div>';
        } else {
            html += '<div class="lang-float">';
            supportedLocales.forEach(function (loc) {
                html += '<a href="javascript:void(0)" data-lang="' + loc + '">' + localeNames[loc] + '</a>';
            });
            html += '</div>';
        }
        return html;
    }

    // ---------- 注入语言切换器 ----------
    function injectSwitcher() {
        // Inject into nav
        var navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            var switcherContainer = document.createElement('li');
            switcherContainer.innerHTML = buildSwitcher(true);
            var switcherDiv = switcherContainer.firstChild;
            navLinks.appendChild(switcherDiv);
        }

        // Always inject floating switcher as mobile fallback
        var floatDiv = document.createElement('div');
        floatDiv.innerHTML = buildSwitcher(false);
        document.body.appendChild(floatDiv.firstChild);
    }

    // ---------- 绑定语言切换事件 ----------
    function bindSwitcherEvents() {
        document.addEventListener('click', function (e) {
            var target = e.target;
            if (target.hasAttribute('data-lang') || (target.parentElement && target.parentElement.hasAttribute('data-lang'))) {
                var link = target.hasAttribute('data-lang') ? target : target.parentElement;
                var newLocale = link.getAttribute('data-lang');
                if (newLocale && supportedLocales.indexOf(newLocale) !== -1 && newLocale !== currentLocale) {
                    setLocale(newLocale);
                }
            }
        });
    }

    // ---------- 设置语言 ----------
    function setLocale(locale, instant) {
        if (supportedLocales.indexOf(locale) === -1) return;

        var prev = currentLocale;
        currentLocale = locale;
        localStorage.setItem('formax-lang', locale);

        // Load translation if not loaded yet
        var promise;
        if (translations[locale]) {
            promise = Promise.resolve(translations[locale]);
        } else {
            promise = loadLocale(locale);
        }

        return promise.then(function () {
            if (instant) {
                translatePage(locale);
            } else {
                // Smooth transition
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.15s ease';
                setTimeout(function () {
                    translatePage(locale);
                    document.body.style.opacity = '1';
                    setTimeout(function () {
                        document.body.style.transition = '';
                    }, 200);
                }, 150);
            }
        });
    }

    // ---------- 公共 API: t() ----------
    function t(key, locale) {
        var loc = locale || currentLocale;
        var text = getTranslation(loc, key);
        if (!text) text = getTranslation(fallbackLocale, key);
        return text || key;
    }

    // ---------- 初始化 ----------
    function init() {
        var detected = detectLocale();
        currentLocale = detected;

        // Inject language switcher
        injectSwitcher();
        bindSwitcherEvents();

        // Load default locale and translate
        return loadLocale(detected).then(function () {
            // Also preload the other locale in background
            var other = supportedLocales.filter(function (l) { return l !== detected; })[0];
            loadLocale(other).catch(function () {});

            // Set html lang
            document.documentElement.setAttribute('lang', detected === 'zh' ? 'zh-CN' : 'en');

            return detected;
        });
    }

    // ---------- 导出公共 API ----------
    return {
        init: init,
        setLocale: setLocale,
        getLocale: function () { return currentLocale; },
        t: t,
        translatePage: function () { translatePage(currentLocale); },
        supported: supportedLocales,
        localeNames: localeNames
    };
})();
