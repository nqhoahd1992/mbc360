/*
 * AppHub — nút menu "Apps" cho app con (AppHub repo: docs/01-sso-protocol.md mục 7b).
 *
 * COPY file này vào app con (vd. public/apphub-switcher.js) và nạp từ CHÍNH domain app con — đừng nạp từ AppHub:
 * script chạy với quyền của app con, nạp từ hub thì hub bị chiếm = mọi app con bị chiếm.
 *   <script src="/apphub-switcher.js" data-hub="https://<AppHub>" data-app="<slug của app này>" [data-apps="/api/hub-apps"] defer></script>
 *   <apphub-switcher></apphub-switcher>        (đặt ở chỗ muốn hiện nút)
 *
 * Địa chỉ hub chốt MỘT LẦN trên thẻ <script> (data-hub), không đọc từ từng nút: app con có chỗ hiển thị HTML người dùng
 * nhập thì một thẻ <apphub-switcher> chèn vào cũng không trỏ được sang trang giả.
 *
 * App KHÁC domain gốc với hub (vd. app *.mbcstaging.com, hub *.maxbiocare.com): trình duyệt không gửi cookie hub vào
 * iframe → thêm data-apps="/api/hub-apps" (route của app này, server ký và hỏi hub — connector listHubApps, docs/07).
 *
 * Bấm nút → iframe phủ màn hình trỏ tới <AppHub>/embed/switcher. AppHub vẽ toàn bộ menu trong iframe (khác origin: không
 * đọc được gì của app con, app con không đọc được gì của hub); danh sách lấy bằng phiên hub (cookie) hoặc, có data-apps,
 * do trang này hỏi route của app rồi chuyển vào. Iframe có sandbox: không được
 * điều hướng trang app con. Sửa giao diện menu ở AppHub là mọi app con đổi theo; file này chỉ là nút + khung.
 * Menu không tải được (hub sập, bị chặn nhúng) → sau 8 giây gỡ khung, mở AppHub ở tab mới; trang app con không bị khoá.
 * Màu nút: CSS --apphub-accent trên thẻ (mặc định xanh AppHub). Nút riêng: window.AppHubSwitcher.open().
 * App giữ phiên bằng token (Bearer) thay cookie: window.AppHubSwitcher.setAuth(() => 'Bearer ' + token) để data-apps gửi kèm.
 * The menu's close (X) button is drawn exactly over the button that opened it: its position goes to the menu as ?anchor=
 * on first open and in the apphub:open message after that (an older copy of this file sends none: X stays in the rail).
 */
(function () {
  'use strict';
  if (!window.customElements || window.customElements.get('apphub-switcher')) return;

  /** Chỉ nhận http(s), lấy đúng origin (bỏ path). */
  function originOf(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
    } catch {
      return null;
    }
  }

  var script = document.currentScript;
  var HUB = script ? originOf(script.getAttribute('data-hub')) : null;
  if (!HUB) {
    console.warn('apphub-switcher: add data-hub="https://<AppHub>" to the <script> tag');
    return;
  }
  var APP = script.getAttribute('data-app'); // slug app này: menu không liệt kê chính nó
  var APPS = sameOriginUrl(script.getAttribute('data-apps')); // route của app này trả danh sách (app khác domain gốc với hub)
  var READY_TIMEOUT_MS = 8000;
  var APPS_TIMEOUT_MS = 10000;

  /** data-apps chỉ nhận đường dẫn trên CHÍNH domain app này (cookie phiên app đi theo; không gửi đi nơi khác). */
  function sameOriginUrl(value) {
    if (!value) return null;
    try {
      var url = new URL(value, window.location.href);
      return url.origin === window.location.origin ? url.toString() : null;
    } catch {
      return null;
    }
  }

  /**
   * App giữ phiên bằng token (localStorage + header Authorization) thay vì cookie: app gọi
   * window.AppHubSwitcher.setAuth(function () { return 'Bearer ' + token; }) — hàm được gọi MỖI lần hỏi danh sách (lấy token
   * mới nhất), trả null/'' khi chưa đăng nhập. Header chỉ gắn vào request data-apps (luôn cùng domain app), không đi nơi khác.
   */
  var authHeader = null;

  function currentAuth() {
    try {
      var value = authHeader ? authHeader() : null;
      return typeof value === 'string' && value && value.length < 8192 ? value : null;
    } catch {
      return null;
    }
  }

  /**
   * Menu hỏi danh sách (data-apps): gọi route của app này bằng phiên app, gửi kết quả vào iframe — chỉ tới origin hub.
   * Trả lời: { apps } | { error: 'signed_out' (401) | 'no_account' (403) | 'error' }. Menu tự lọc lại dữ liệu.
   */
  function answerApps(id) {
    var signal = window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(APPS_TIMEOUT_MS) : undefined;
    var headers = { Accept: 'application/json' };
    var auth = currentAuth();
    if (auth) headers.Authorization = auth;
    fetch(APPS, { credentials: 'same-origin', cache: 'no-store', headers: headers, signal: signal })
      .then(function (res) {
        if (res.status === 401) return { error: 'signed_out' };
        if (res.status === 403) return { error: 'no_account' };
        if (!res.ok) return { error: 'error' };
        return res.json().then(function (body) {
          return body && Array.isArray(body.apps) ? { apps: body.apps } : { error: 'error' };
        });
      })
      .catch(function () {
        return { error: 'error' };
      })
      .then(function (data) {
        if (frame) frame.contentWindow.postMessage(Object.assign({ type: 'apphub:apps', id: id }, data), HUB);
      });
  }

  var frame = null; // một iframe cho cả trang
  var ready = false; // trang menu đã báo apphub:ready
  var readyTimer = 0;
  var isOpen = false;
  var lastFocus = null;
  var savedOverflow = '';

  function setExpanded(value) {
    var buttons = document.querySelectorAll('apphub-switcher');
    for (var i = 0; i < buttons.length; i++) if (buttons[i]._apphubExpanded) buttons[i]._apphubExpanded(value);
  }

  function release() {
    isOpen = false;
    document.documentElement.style.overflow = savedOverflow;
    setExpanded(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  /** Menu không lên (bị chặn nhúng, hub sập, mạng lỗi): gỡ khung để trang dùng tiếp, mở AppHub ở tab mới. */
  function fail() {
    clearTimeout(readyTimer);
    if (frame) frame.remove();
    frame = null;
    ready = false;
    if (isOpen) {
      release();
      window.open(HUB + '/', '_blank', 'noopener');
    }
  }

  /**
   * Where the Apps button sits on screen, "x,y,width,height" in CSS pixels of the viewport. The menu draws its close (X)
   * button exactly there, so X replaces the button the person just pressed. The iframe covers the viewport (inset:0), so
   * these coordinates are the iframe's too. Null when opened without a button (AppHubSwitcher.open()).
   */
  function anchorOf(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return null;
    var rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return [rect.left, rect.top, rect.width, rect.height]
      .map(function (n) {
        return Math.round(n * 10) / 10;
      })
      .join(',');
  }

  function open(app, focusBack) {
    if (isOpen) return;
    isOpen = true;
    var anchor = anchorOf(focusBack);
    lastFocus = focusBack || document.activeElement;
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    setExpanded(true);
    if (!frame) {
      var url = new URL('/embed/switcher', HUB);
      url.searchParams.set('from', window.location.origin);
      if (app) url.searchParams.set('app', app);
      if (APPS) url.searchParams.set('list', 'app'); // menu xin danh sách từ trang này thay vì dùng cookie hub
      if (anchor) url.searchParams.set('anchor', anchor); // menu đặt nút X đúng chỗ nút này
      ready = false;
      frame = document.createElement('iframe');
      frame.title = 'Switch app';
      frame.src = url.toString();
      // sandbox: chạy script + phiên hub (same-origin) + mở tab mới; KHÔNG allow-top-navigation (không đổi trang app con).
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
      frame.setAttribute('allow', ''); // không cấp camera, micro, định vị…
      frame.setAttribute('referrerpolicy', 'strict-origin');
      frame.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;z-index:2147483000;background:transparent;color-scheme:light;display:block');
      frame.addEventListener('error', fail);
      readyTimer = setTimeout(function () {
        if (!ready) fail();
      }, READY_TIMEOUT_MS);
      document.body.appendChild(frame);
    } else {
      frame.style.display = 'block';
      // The button may have moved since the last open (scroll, resize, another button): send where it is now.
      frame.contentWindow.postMessage({ type: 'apphub:open', anchor: anchor }, HUB);
    }
    frame.focus();
  }

  function hide() {
    if (!frame || !isOpen) return;
    frame.style.display = 'none';
    release();
  }

  // Chỉ nghe đúng iframe menu, đúng origin hub. Tin: ready (menu đã lên), close (đóng xong), need-apps (xin danh sách).
  window.addEventListener('message', function (event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== HUB || !event.data) return;
    if (event.data.type === 'apphub:need-apps') {
      if (APPS && typeof event.data.id === 'string') answerApps(event.data.id.slice(0, 64));
    } else if (event.data.type === 'apphub:ready') {
      ready = true;
      clearTimeout(readyTimer);
      if (isOpen) frame.focus(); // trang menu tự đặt con trỏ vào ô tìm kiếm khi khung đã có focus
    } else if (event.data.type === 'apphub:close') {
      hide();
    }
  });
  // Esc khi focus còn ở trang app con (menu chưa lên kịp).
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !isOpen) return;
    if (ready) hide();
    else fail();
  });

  // Nút: ô trắng bo tròn, lưới 9 chấm NHIỀU MÀU (bảng màu icon app của hub) — nhìn là biết "danh sách ứng dụng" như MISA,
  // Google. Rê chuột: nền xám nhạt, các chấm nở ra lần lượt. Đang mở: nền màu nhấn (--apphub-accent), chấm trắng.
  var ACCENT = 'var(--apphub-accent,#0b7a75)';
  var STYLE =
    ':host{display:inline-flex;vertical-align:middle}' +
    'button{all:unset;box-sizing:border-box;position:relative;display:inline-flex;align-items:center;justify-content:center;' +
    'width:var(--apphub-size,40px);height:var(--apphub-size,40px);border-radius:10px;cursor:pointer;' +
    'border:1px solid var(--apphub-border,rgb(0 0 0 / .08));background:var(--apphub-surface,#fff);' +
    'box-shadow:0 1px 0 rgb(0 0 0 / .05);' +
    'transition:background-color .15s,border-color .15s,transform .1s}' +
    'button:hover{background:#f6f6f7;border-color:rgb(0 0 0 / .14)}' +
    'button:active{transform:scale(.96)}' +
    'button[aria-expanded="true"]{background:' + ACCENT + ';border-color:' + ACCENT + ';box-shadow:none}' +
    'button[aria-expanded="true"] circle{fill:#fff}' +
    'button:focus-visible{outline:3px solid color-mix(in srgb,' + ACCENT + ' 35%,transparent);outline-offset:2px}' +
    'svg{width:18px;height:18px;display:block;overflow:visible}' +
    'circle{transform-box:fill-box;transform-origin:center;transition:transform .25s cubic-bezier(.34,1.56,.64,1),fill .2s}' +
    'button:hover circle{transform:scale(1.12)}' +
    '@media (prefers-reduced-motion:reduce){button,circle{transition:none}button:hover{transform:none}button:hover circle{transform:none}}';
  // Màu từng chấm theo bảng màu icon app (teal, indigo, amber / rose, sky, emerald / violet, orange, slate).
  var COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9', '#10b981', '#8b5cf6', '#f97316', '#64748b'];
  var DOTS = '';
  [3, 10, 17].forEach(function (cy, row) {
    [3, 10, 17].forEach(function (cx, col) {
      var i = row * 3 + col;
      DOTS += '<circle cx="' + cx + '" cy="' + cy + '" r="2.4" fill="' + COLORS[i] + '" style="transition-delay:' + i * 18 + 'ms"/>';
    });
  });

  class AppHubSwitcherElement extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      // Nội dung cố định (không chèn thuộc tính nào của thẻ vào HTML).
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + STYLE + '</style>' +
        '<button type="button" part="button" aria-label="Switch apps" title="Switch apps" aria-haspopup="dialog" aria-expanded="false">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true">' + DOTS + '</svg></button>';
      const button = root.querySelector('button');
      button.addEventListener('click', () => open(this.getAttribute('app') || APP, button));
      this._apphubExpanded = (value) => button.setAttribute('aria-expanded', value ? 'true' : 'false');
    }
  }
  window.customElements.define('apphub-switcher', AppHubSwitcherElement);

  window.AppHubSwitcher = {
    open: (app) => open(app || APP),
    /** App dùng token thay cookie: hàm trả giá trị header Authorization (vd. 'Bearer …') hoặc null. Xem currentAuth(). */
    setAuth: (fn) => {
      authHeader = typeof fn === 'function' ? fn : null;
    },
  };
})();
