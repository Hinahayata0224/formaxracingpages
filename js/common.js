/* ============================================
   Formax Racing Website - Shared JavaScript
   ============================================ */

(function () {
    'use strict';

    // ---------- 平滑滚动 ----------
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                var targetId = this.getAttribute('href');
                if (targetId === '#') return;

                var target = document.querySelector(targetId);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });

                    // 关闭移动端菜单
                    var navLinks = document.querySelector('.nav-links');
                    if (navLinks && navLinks.classList.contains('active')) {
                        navLinks.classList.remove('active');
                    }
                }
            });
        });
    }

    // ---------- 汉堡菜单切换 ----------
    function initMobileMenu() {
        var hamburger = document.querySelector('.hamburger');
        var navLinks = document.querySelector('.nav-links');

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', function () {
                navLinks.classList.toggle('active');
            });

            // 点击导航链接后关闭菜单
            navLinks.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    navLinks.classList.remove('active');
                });
            });
        }
    }

    // ---------- 微信公众号二维码模态框 ----------
    function initWechatModal() {
        document.addEventListener('DOMContentLoaded', function () {
            var showQrBtn = document.getElementById('showWechatQr');
            var qrModal = document.getElementById('wechatQrModal');
            var closeModal = qrModal ? qrModal.querySelector('.close-modal') : null;

            if (!showQrBtn || !qrModal) return;

            function openModal() {
                qrModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }

            function closeModalFn() {
                qrModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }

            showQrBtn.addEventListener('click', openModal);
            if (closeModal) {
                closeModal.addEventListener('click', closeModalFn);
            }

            qrModal.addEventListener('click', function (e) {
                if (e.target === qrModal) closeModalFn();
            });

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && qrModal.style.display === 'flex') {
                    closeModalFn();
                }
            });
        });
    }

    // ---------- 返回按钮滚动行为 ----------
    function initBackButtonScroll() {
        var backBtn = document.querySelector('.back-button');
        if (!backBtn) return;

        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                backBtn.style.position = 'fixed';
                backBtn.style.top = '20px';
                backBtn.style.left = '20px';
                backBtn.style.zIndex = '1000';
                backBtn.style.background = 'rgba(255, 255, 255, 0.9)';
                backBtn.style.padding = '10px 15px';
                backBtn.style.borderRadius = '5px';
                backBtn.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            } else {
                backBtn.style.position = 'static';
                backBtn.style.background = 'transparent';
                backBtn.style.padding = '0';
                backBtn.style.boxShadow = 'none';
            }
        });
    }

    // ---------- 页面初始化 ----------
    document.addEventListener('DOMContentLoaded', function () {
        initSmoothScroll();
        initMobileMenu();
        initWechatModal();
        initBackButtonScroll();
    });
})();
