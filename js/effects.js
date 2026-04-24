/* ============================================
   Formax Racing Website - Advanced Effects
   ============================================ */

(function () {
    'use strict';

    /* Skip all animations if user prefers reduced motion */
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Scroll Reveal + Counter (combined Observer) ---------- */
    function initScrollReveal() {
        var revealEls = document.querySelectorAll('[data-reveal], [data-reveal-left], [data-reveal-right], [data-reveal-stagger], .count-up');
        if (!revealEls.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;

                /* Handle scroll-reveal elements */
                if (el.hasAttribute('data-reveal') || el.hasAttribute('data-reveal-left') || el.hasAttribute('data-reveal-right') || el.hasAttribute('data-reveal-stagger')) {
                    if (prefersReducedMotion) {
                        el.classList.add('revealed');
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    } else {
                        el.classList.add('revealed');
                    }
                    observer.unobserve(el);
                }

                /* Handle counter elements */
                if (el.classList.contains('count-up') && !el.dataset.animated) {
                    el.dataset.animated = '1';
                    var target = parseInt(el.getAttribute('data-count')) || 0;
                    var suffix = el.getAttribute('data-suffix') || '';
                    var duration = prefersReducedMotion ? 0 : 1200;
                    var startTime = null;

                    function animate(now) {
                        if (!startTime) startTime = now;
                        var progress = Math.min((now - startTime) / duration, 1);
                        var eased = 1 - Math.pow(1 - progress, 3);
                        if (progress < 1) {
                            el.textContent = Math.floor(eased * target) + suffix;
                            requestAnimationFrame(animate);
                        } else {
                            el.textContent = target + suffix;
                        }
                    }

                    if (prefersReducedMotion) {
                        el.textContent = target + suffix;
                    } else {
                        requestAnimationFrame(animate);
                    }
                    observer.unobserve(el);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -30px 0px'
        });

        revealEls.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* ---------- Parallax Effect ---------- */
    function initParallax() {
        if (prefersReducedMotion) return;

        var heroEls = document.querySelectorAll('[data-parallax]');
        if (!heroEls.length) return;

        var ticking = false;

        function updateParallax() {
            var scrollY = window.pageYOffset;
            heroEls.forEach(function (el) {
                var speed = parseFloat(el.getAttribute('data-parallax')) || 0.3;
                var rect = el.getBoundingClientRect();
                var windowH = window.innerHeight;
                if (rect.bottom > 0 && rect.top < windowH) {
                    el.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
                }
            });
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }, { passive: true });

        updateParallax();
    }

    /* ---------- Nav Scroll Effect ---------- */
    function initNavScroll() {
        var header = document.querySelector('header');
        if (!header) return;

        var ticking = false;

        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    if (window.pageYOffset > 60) {
                        header.classList.add('nav-scrolled');
                    } else {
                        header.classList.remove('nav-scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* ---------- Init All ---------- */
    function init() {
        initScrollReveal();
        initParallax();
        initNavScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
