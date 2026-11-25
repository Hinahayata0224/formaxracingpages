/**
 * 团队分组卡片链接：从 data/groups.json 覆盖（由 tools/sync-groups.mjs 维护）
 * 卡片上有 data-group="elec|aero|chassis|driverless|marketing|secretary|qc|driver"
 */
(function () {
    'use strict';

    var nodes = document.querySelectorAll('[data-group]');
    if (!nodes.length) return;

    fetch('data/groups.json', { cache: 'no-cache' })
        .then(function (resp) {
            if (!resp.ok) throw new Error('groups.json ' + resp.status);
            return resp.json();
        })
        .then(function (data) {
            var items = (data && data.items) || {};
            Array.prototype.forEach.call(nodes, function (a) {
                var key = a.getAttribute('data-group');
                var item = items[key];
                if (item && item.url) a.setAttribute('href', item.url);
            });
        })
        .catch(function (err) {
            // 加载失败时保留页面里写死的链接
            console.warn('[groups] 加载失败：', err.message);
        });
})();
