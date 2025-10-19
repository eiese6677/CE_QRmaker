(function () {
  // Avoid double injection
  if (window.__ce_qr_selector_active) return;
  window.__ce_qr_selector_active = true;

  const style = document.createElement("style");
  style.textContent = `
    .__ce_qr_overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483646;background:transparent}
    .__ce_qr_highlight{
      outline:3px solid #1e90ff;
      box-shadow:0 0 0 3px rgba(30,144,255,0.15), inset 0 0 0 9999px rgba(30,144,255,0.12);
      -webkit-box-shadow:0 0 0 3px rgba(30,144,255,0.15), inset 0 0 0 9999px rgba(30,144,255,0.12);
    }
  .__ce_qr_tag{position:fixed;z-index:2147483647;background:#111;color:#fff;padding:6px 8px;border-radius:4px;font-size:13px;font-family:sans-serif;max-width:420px;white-space:pre-wrap;pointer-events:auto}
  .__ce_qr_tag button.__ce_qr_close{position:absolute;right:6px;top:6px;border:none;background:transparent;color:#fff;font-size:12px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:3px}
  .__ce_qr_tag button.__ce_qr_close:hover{background:rgba(255,255,255,0.06)}
  .__ce_qr_tag .__ce_qr_buttons{display:flex;gap:6px;margin-top:6px}
  .__ce_qr_tag button.__ce_qr_copy{border:1px solid rgba(255,255,255,0.08);background:transparent;color:#fff;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px}
  .__ce_qr_tag button.__ce_qr_copy:hover{background:rgba(255,255,255,0.03)}
  .__ce_qr_block{position:relative}
  .__ce_qr_block_header{display:flex;justify-content:space-between;align-items:center}
  .__ce_qr_block .block-title{font-size:11px;color:#ddd}
  .__ce_qr_block button.copy-btn{border:1px solid rgba(255,255,255,0.06);background:transparent;color:#fff;padding:2px 6px;border-radius:3px;cursor:pointer}
  .__ce_qr_copyall{position:absolute;right:36px;top:6px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#fff;padding:2px 6px;border-radius:3px;cursor:pointer}
    .__ce_qr_tag button.__ce_qr_toggle{border:1px solid rgba(255,255,255,0.08);background:transparent;color:#fff;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px}
    .__ce_qr_varpanel{margin-top:8px;background:rgba(255,255,255,0.02);padding:8px;border-radius:6px;max-width:420px}
    .__ce_qr_varpanel input[type="text"], .__ce_qr_varpanel textarea{width:100%;background:transparent;border:1px solid rgba(255,255,255,0.06);color:#fff;padding:6px;border-radius:4px}
    .__ce_qr_varpanel .var-row{display:flex;gap:6px;margin-top:6px}
    .__ce_qr_varpanel .var-row input{flex:1}
    .__ce_qr_varpanel .var-row button{flex:0}
    .__ce_qr_varpanel .var-actions{display:flex;gap:6px;margin-top:8px}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "__ce_qr_overlay";
  // overlay should capture pointer events so underlying page doesn't react to clicks
  overlay.style.pointerEvents = "auto";
  overlay.style.cursor = "crosshair";
  overlay.style.userSelect = "none";
  overlay.style.webkitUserSelect = "none";
  document.documentElement.appendChild(overlay);

  // Ignore any click that immediately follows injection (e.g., the popup button click)
  // This prevents the selector from firing as soon as it's injected.
  let ignoreInitialClick = true;
  setTimeout(() => {
    ignoreInitialClick = false;
  }, 300);

  function onKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    }
  }

  let lastEl = null;
  let tagEl = null;
  let previewEl = null;
  let selected = false;

  function buildSelector(el) {
    if (!el) return "";
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.classList && node.classList.length > 0) {
        part +=
          "." +
          Array.from(node.classList)
            .slice(0, 2)
            .map((c) => CSS.escape(c))
            .join(".");
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (ch) => ch.tagName === node.tagName
        );
        if (siblings.length > 1) {
          const index = Array.prototype.indexOf.call(parent.children, node) + 1;
          part += `:nth-child(${index})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
      if (parts.length > 6) break;
    }
    return parts.join(" > ");
  }

  function highlight(el) {
    if (lastEl && lastEl !== el) lastEl.classList.remove("__ce_qr_highlight");
    lastEl = el;
    if (
      lastEl &&
      lastEl.nodeType === 1 &&
      lastEl !== document.body &&
      lastEl !== document.documentElement
    ) {
      lastEl.classList.add("__ce_qr_highlight");
    }
    // update preview content/position when highlight changes
    updatePreviewForElement(lastEl);
  }

  function ensurePreview() {
    if (previewEl) return;
    previewEl = document.createElement('div');
    previewEl.style.position = 'fixed';
    previewEl.style.zIndex = 2147483647;
    previewEl.style.background = 'rgba(0,0,0,0.75)';
    previewEl.style.color = '#fff';
    previewEl.style.padding = '4px 6px';
    previewEl.style.fontSize = '12px';
    previewEl.style.borderRadius = '4px';
    previewEl.style.maxWidth = '420px';
    previewEl.style.whiteSpace = 'nowrap';
    previewEl.style.overflow = 'hidden';
    previewEl.style.textOverflow = 'ellipsis';
    previewEl.style.pointerEvents = 'none';
    previewEl.style.userSelect = 'none';
    previewEl.style.webkitUserSelect = 'none';
    document.documentElement.appendChild(previewEl);
    // add datalist for CSS properties
    if (!document.getElementById('__ce_qr_css_props')) {
      const dl = document.createElement('datalist'); dl.id='__ce_qr_css_props';
      const props = ['color','background-color','border','border-radius','width','height','padding','margin','font-size','font-weight','display','position','top','left','right','bottom','opacity','z-index','transform'];
      props.forEach(p=>{ const opt=document.createElement('option'); opt.value=p; dl.appendChild(opt); });
      document.documentElement.appendChild(dl);
    }
  }

  function updatePreviewForElement(el) {
    if (!el) {
      if (previewEl) previewEl.style.display = 'none';
      return;
    }
    ensurePreview();
    const selector = buildSelector(el) || '';
    previewEl.textContent = selector || '(no selector)';
    previewEl.style.display = 'block';
    const rect = el.getBoundingClientRect();
    const prefWidth = Math.min(420, window.innerWidth - 16);
    previewEl.style.maxWidth = prefWidth + 'px';
    // position above if there's space, otherwise below
    const above = rect.top - 8 - 24 > 0;
    if (above) {
      previewEl.style.left = Math.min(window.innerWidth - prefWidth - 8, Math.max(8, rect.left)) + 'px';
      previewEl.style.top = Math.max(8, rect.top - 8 - 24) + 'px';
    } else {
      previewEl.style.left = Math.min(window.innerWidth - prefWidth - 8, Math.max(8, rect.left)) + 'px';
      previewEl.style.top = Math.min(window.innerHeight - 32, rect.bottom + 8) + 'px';
    }
  }

  function cleanup() {
    if (lastEl) lastEl.classList.remove("__ce_qr_highlight");
    if (tagEl) {
      tagEl.remove();
      tagEl = null;
    }
    if (previewEl) {
      previewEl.remove();
      previewEl = null;
    }
    overlay.remove();
    style.remove();
    try {
      overlay.removeEventListener("mousemove", onMouseMove, true);
      overlay.removeEventListener("click", onClick, true);
    } catch (e) {}
    try {
      document.removeEventListener('keydown', onKeyDown, true);
    } catch (e) {}
    window.__ce_qr_selector_active = false;
  }

  function getUnderlyingElement(x, y) {
    if (!document.elementsFromPoint) return document.elementFromPoint(x, y);
    const elems = document.elementsFromPoint
      ? document.elementsFromPoint(x, y)
      : document.elementsFromPoint(x, y);
    for (const el of elems) {
      if (!el) continue;
      if (el === overlay) continue;
      if (el === tagEl) continue;
      if (el.nodeType !== 1) continue;
      return el;
    }
    return null;
  }

  function onMouseMove(e) {
    const el = getUnderlyingElement(e.clientX, e.clientY);
    if (!el) return;
    if (el === lastEl) return;
    highlight(el);
  }

  function onClick(e) {
    if (ignoreInitialClick) return;
    if (selected) return; // only allow one selection per injection
    e.preventDefault();
    e.stopPropagation();
    const el = getUnderlyingElement(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body) {
      // do not auto-cleanup; keep selector active until ESC
      return;
    }

    const selector = buildSelector(el);
    const jsCommand = selector
      ? `const el = document.querySelector('${selector.replace(/'/g, "\\'")}');`
      : "";

    let outer = "";
    try {
      outer = el && el.outerHTML ? el.outerHTML : "";
    } catch (err) {
      outer = "";
    }
    const maxLen = 800;
    const outerShort =
      outer.length > maxLen ? outer.slice(0, maxLen) + "...(truncated)" : outer;

    // remove any existing result tags to avoid piling up from repeated selections
    try {
      document.querySelectorAll('.__ce_qr_tag').forEach((t) => t.remove());
    } catch (e) {}

      tagEl = document.createElement("div");
      tagEl.className = "__ce_qr_tag";
      // make the result box non-selectable for text, but allow interactions for buttons
      tagEl.style.userSelect = "none";
      tagEl.style.webkitUserSelect = "none";
      // insert selector text as three distinct blocks: HTML / CSS / JS
      const contentWrap = document.createElement('div');
      contentWrap.style.display = 'flex';
      contentWrap.style.flexDirection = 'column';
      contentWrap.style.gap = '8px';
      contentWrap.style.paddingRight = '28px';

      function escapeHtml(s){
        return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }
      function highlightHTML(s){
        const t = escapeHtml(s);
        // very small highlight: tags and attributes
        return t.replace(/(&lt;\/?.*?&gt;)/g, '<span style="color:#9ad0ff">$1</span>').replace(/(\b[a-z-]+)(=)/gi, '<span style="color:#ffd59a">$1</span>$2');
      }
      function highlightCSS(s){
        const t = escapeHtml(s);
        return t.replace(/([.#]?[a-zA-Z0-9_\-\:\[\]\>\s,>]+)/g, '<span style="color:#9ad0ff">$1</span>');
      }
      function highlightJS(s){
        const t = escapeHtml(s);
        return t.replace(/(const|let|var|function|return|=>|if|else|new|document|window)/g, '<span style="color:#ffd59a">$1</span>');
      }
      function makeBlock(title, code, lang){
        const block = document.createElement('div');
        block.className = '__ce_qr_block';
        const header = document.createElement('div'); header.className = '__ce_qr_block_header';
        const titleEl = document.createElement('div'); titleEl.className='block-title'; titleEl.textContent = title;
        const copyBtn = document.createElement('button'); copyBtn.className = 'copy-btn'; copyBtn.textContent = '복사';
        header.appendChild(titleEl); header.appendChild(copyBtn);
        const pre = document.createElement('pre');
        pre.textContent = code || '';
        pre.style.margin = '0'; pre.style.whiteSpace = 'pre-wrap';
        pre.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Segoe UI Mono", monospace';
        pre.style.fontSize = '12px'; pre.style.background = 'rgba(255,255,255,0.02)'; pre.style.padding = '6px';
        pre.style.borderRadius = '4px'; pre.style.maxHeight = '180px'; pre.style.overflow = 'auto'; pre.style.color = '#fff';
        pre.style.userSelect = 'text'; pre.style.cursor='text'; pre.setAttribute('tabindex','0');
        // apply syntax highlight
        try{
          if(lang==='html') pre.innerHTML = highlightHTML(code||'');
          else if(lang==='css') pre.innerHTML = highlightCSS(code||'');
          else if(lang==='js') pre.innerHTML = highlightJS(code||'');
        }catch(e){ pre.textContent = code||'' }
        // copy handler
        copyBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); ev.preventDefault(); tryCopy(code||''); showTempMessage(copyBtn,'복사됨'); });
        block.appendChild(header); block.appendChild(pre);
        return block;
      }

      const htmlBlock = makeBlock('HTML', outerShort);
    const cssText = selector ? `${selector} { /* styles */ }` : '';
    const cssBlock = makeBlock('CSS', cssText, 'css');
    const jsText = selector ? jsCommand : '';
    const jsBlock = makeBlock('JS', jsText, 'js');

      contentWrap.appendChild(htmlBlock);
      contentWrap.appendChild(cssBlock);
      contentWrap.appendChild(jsBlock);
    // add copy-all button
    const copyAllBtn = document.createElement('button'); copyAllBtn.className='__ce_qr_copyall'; copyAllBtn.textContent='전체 복사';
    copyAllBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); ev.preventDefault(); const allText = (outer||'') + '\n\n' + (cssText||'') + '\n\n' + (jsText||''); tryCopy(allText); showTempMessage(copyAllBtn,'복사됨'); });
    tagEl.appendChild(copyAllBtn);
    tagEl.appendChild(contentWrap);
      // buttons container
      const btnWrap = document.createElement('div');
      btnWrap.className = '__ce_qr_buttons';
      // copy helpers
      function tryCopy(text) {
        (async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e2) {}
            ta.remove();
          }
        })();
      }
      function showTempMessage(btn, msg) {
        const orig = btn.textContent;
        btn.textContent = msg;
        setTimeout(() => (btn.textContent = orig), 900);
      }
      const copyHtmlBtn = document.createElement('button');
      copyHtmlBtn.className = '__ce_qr_copy';
      copyHtmlBtn.textContent = 'HTML 복사';
      copyHtmlBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        tryCopy(outer);
        showTempMessage(copyHtmlBtn, '복사됨');
      });
      const copyCssBtn = document.createElement('button');
      copyCssBtn.className = '__ce_qr_copy';
      copyCssBtn.textContent = 'CSS 복사';
      copyCssBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        // a simple CSS selector output (selector + simple rule placeholder)
        const cssText = selector ? `${selector} { /* styles */ }` : '';
        tryCopy(cssText);
        showTempMessage(copyCssBtn, '복사됨');
      });
      const copyJsBtn = document.createElement('button');
      copyJsBtn.className = '__ce_qr_copy';
      copyJsBtn.textContent = 'JS 복사';
      copyJsBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const jsText = selector ? jsCommand : '';
        tryCopy(jsText);
        showTempMessage(copyJsBtn, '복사됨');
      });
    btnWrap.appendChild(copyHtmlBtn);
    btnWrap.appendChild(copyCssBtn);
    btnWrap.appendChild(copyJsBtn);
      tagEl.appendChild(btnWrap);
      // close button
      const closeBtn = document.createElement('button');
      closeBtn.className = '__ce_qr_close';
      closeBtn.title = '닫기 (Esc)';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        cleanup();
      });
      tagEl.appendChild(closeBtn);
      tagEl.style.maxWidth = '420px';  // 기존과 같음
      tagEl.style.maxHeight = '60vh';  // 높이 고정 (뷰포트 기준)
      tagEl.style.overflow = 'auto';   // 내용이 많으면 스크롤
      tagEl.style.background = '#111'; // 배경 그대로
      tagEl.style.padding = '6px 8px';
      tagEl.style.borderRadius = '4px';

      document.documentElement.appendChild(tagEl);

      // variable editor toggle button
      const varToggle = document.createElement('button');
      varToggle.className = '__ce_qr_toggle';
      varToggle.textContent = '변수 편집';
      varToggle.addEventListener('click', (ev) => {
        ev.stopPropagation(); ev.preventDefault();
        const panel = tagEl.querySelector('.__ce_qr_varpanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
      tagEl.insertBefore(varToggle, btnWrap);

  // variable editor panel
      const varPanel = document.createElement('div');
      varPanel.className = '__ce_qr_varpanel';
      varPanel.style.display = 'none';

      // id/class/text fields
      const idLabel = document.createElement('div'); idLabel.textContent = 'id';
      const idInput = document.createElement('input'); idInput.type = 'text'; idInput.value = el.id || '';
      const classLabel = document.createElement('div'); classLabel.textContent = 'class';
      const classInput = document.createElement('input'); classInput.type = 'text'; classInput.value = el.className || '';
      const textLabel = document.createElement('div'); textLabel.textContent = 'textContent';
      const textInput = document.createElement('textarea'); textInput.rows = 2; textInput.value = el.textContent || '';
      varPanel.appendChild(idLabel); varPanel.appendChild(idInput);
      varPanel.appendChild(classLabel); varPanel.appendChild(classInput);
      varPanel.appendChild(textLabel); varPanel.appendChild(textInput);

      // CSS custom properties editor
    const varsLabel = document.createElement('div'); varsLabel.textContent = 'CSS 변수 (name, value)';
      varPanel.appendChild(varsLabel);
      const varsWrap = document.createElement('div');
      const existingStyles = window.getComputedStyle(el);
      // show any --custom props present inline or computed (limited)
      function addVarRow(name, value) {
        const row = document.createElement('div'); row.className = 'var-row';
        const k = document.createElement('input'); k.type = 'text'; k.value = name || '';
        const v = document.createElement('input'); v.type = 'text'; v.value = value || '';
        const rem = document.createElement('button'); rem.textContent = '삭제';
        rem.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); row.remove(); });
        row.appendChild(k); row.appendChild(v); row.appendChild(rem);
        varsWrap.appendChild(row);
      }
      // prepopulate with inline style custom props if any
      try {
        if (el.style) {
          for (let i=0;i<el.style.length;i++){
            const prop = el.style[i];
            if (prop && prop.startsWith('--')) addVarRow(prop, el.style.getPropertyValue(prop));
          }
        }
      } catch (e) {}
    varPanel.appendChild(varsWrap);
    const addVarBtn = document.createElement('button'); addVarBtn.textContent = '변수 추가';
      addVarBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); ev.preventDefault(); addVarRow('--name','value'); });
      varPanel.appendChild(addVarBtn);

    // general CSS properties editor
    const propsLabel = document.createElement('div'); propsLabel.textContent = '일반 CSS 속성 (name, value)'; varPanel.appendChild(propsLabel);
    const propsWrap = document.createElement('div');
    function addPropRow(name, value){
      const row = document.createElement('div'); row.className='var-row';
  const k = document.createElement('input'); k.type='text'; k.value = name||'';
  // enable datalist autocomplete for property names
  k.setAttribute('list','__ce_qr_css_props');
  const v = document.createElement('input'); v.type='text'; v.value = value||'';
  // color picker element (hidden unless property looks like color)
  const colorPicker = document.createElement('input'); colorPicker.type='color'; colorPicker.style.marginLeft='6px'; colorPicker.style.display='none';
  const rem = document.createElement('button'); rem.textContent='삭제'; rem.addEventListener('click',(ev)=>{ ev.stopPropagation(); ev.preventDefault(); row.remove(); });
  row.appendChild(k); row.appendChild(v); row.appendChild(colorPicker); row.appendChild(rem); propsWrap.appendChild(row);
  // helper to detect color-like properties
  function isColorProp(name){ if(!name) return false; const n=name.toLowerCase(); return n.includes('color')||n.includes('background')||n.includes('border')||n==='fill' || n==='stroke'; }
  // robust color parsing -> returns hex #rrggbb or null
  function parseToHex(input) {
    try {
      if (!input) return null;
      let s = input.trim();
      // already hex
      if (s[0] === '#') {
        // expand shorthand
        if (s.length === 4) {
          const r = s[1]; const g = s[2]; const b = s[3];
          return ('#' + r + r + g + g + b + b).toLowerCase();
        }
        if (s.length === 7) return s.toLowerCase();
      }
      // rgb/rgba
      const rgbm = s.match(/rgba?\(([^)]+)\)/i);
      if (rgbm) {
        const parts = rgbm[1].split(',').map(p => p.trim());
        let r = parseFloat(parts[0]);
        let g = parseFloat(parts[1]);
        let b = parseFloat(parts[2]);
        let a = parts.length > 3 ? parseFloat(parts[3]) : 1;
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        // handle percentage
        if (String(parts[0]).includes('%')) { r = Math.round(r * 2.55); g = Math.round(g * 2.55); b = Math.round(b * 2.55); }
        // composite over white if alpha < 1
        if (!isNaN(a) && a < 1) {
          r = Math.round(r * a + 255 * (1 - a));
          g = Math.round(g * a + 255 * (1 - a));
          b = Math.round(b * a + 255 * (1 - a));
        }
        const hx = (v) => ('0' + v.toString(16)).slice(-2);
        return '#' + hx(r) + hx(g) + hx(b);
      }
      // hsl/hsla -> convert to rgb
      const hslm = s.match(/hsla?\(([^)]+)\)/i);
      if (hslm) {
        const parts = hslm[1].split(',').map(p => p.trim());
        let h = parseFloat(parts[0]);
        let sPer = parseFloat(parts[1]);
        let lPer = parseFloat(parts[2]);
        let a = parts.length > 3 ? parseFloat(parts[3]) : 1;
        if (String(parts[1]).endsWith('%')) sPer = sPer / 100; else sPer = sPer;
        if (String(parts[2]).endsWith('%')) lPer = lPer / 100; else lPer = lPer;
        h = ((h % 360) + 360) % 360 / 360;
        const sN = sPer, lN = lPer;
        function hue2rgb(p, q, t) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        }
        let r, g, b;
        if (sN === 0) { r = g = b = lN; }
        else {
          const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
          const p = 2 * lN - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        let R = Math.round(r * 255), G = Math.round(g * 255), B = Math.round(b * 255);
        if (!isNaN(a) && a < 1) {
          R = Math.round(R * a + 255 * (1 - a));
          G = Math.round(G * a + 255 * (1 - a));
          B = Math.round(B * a + 255 * (1 - a));
        }
        const hx = (v) => ('0' + v.toString(16)).slice(-2);
        return '#' + hx(R) + hx(G) + hx(B);
      }
      // named colors or other keywords: use computed style fallback
      try {
        const d = document.createElement('div');
        d.style.color = s;
        document.documentElement.appendChild(d);
        const cs = getComputedStyle(d).color;
        d.remove();
        if (cs) return parseToHex(cs); // recursive parse of rgb(...) returned
      } catch (e) {}
    } catch (e) {}
    return null;
  }
  // when property name changes, show/hide color picker and try to populate it
  k.addEventListener('input', ()=>{ try{ const val = v.value; if(k.value) el.style.setProperty(k.value, val); if(isColorProp(k.value)){ try{ colorPicker.style.display='inline-block'; const comp = window.getComputedStyle(el).getPropertyValue(k.value) || v.value; const hex = parseToHex(comp); if(hex) colorPicker.value = hex; }catch(e){ colorPicker.style.display='inline-block'; } } else { colorPicker.style.display='none'; } }catch(e){} });
  // when value changes, update style and sync color picker if applicable
  v.addEventListener('input', ()=>{ try{ const key=k.value; if(key) el.style.setProperty(key, v.value); if(isColorProp(key)){ try{ // try to set colorPicker to the value if parseable
    const hx = parseToHex(v.value); if(hx) colorPicker.value = hx; colorPicker.style.display='inline-block'; }catch(e){} } }catch(e){} });
  // color picker change
  colorPicker.addEventListener('input', ()=>{ try{ const key=k.value; if(key) { el.style.setProperty(key, colorPicker.value); v.value = colorPicker.value; } }catch(e){} });
    }
    // prepopulate some common props (if present inline)
    try{ if(el.style){ if(el.style.color) addPropRow('color', el.style.color); if(el.style.backgroundColor) addPropRow('background-color', el.style.backgroundColor); } }catch(e){}
    varPanel.appendChild(propsWrap);
    const addPropBtn = document.createElement('button'); addPropBtn.textContent='속성 추가'; addPropBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); ev.preventDefault(); addPropRow('property','value'); });
    varPanel.appendChild(addPropBtn);

      // actions
      // snapshot original state for reset/undo
      const originalSnapshot = {
        id: el.id || '',
        className: el.className || '',
        textContent: el.textContent || '',
        styleCssText: el.getAttribute('style') || ''
      };
      const history = [ JSON.parse(JSON.stringify(originalSnapshot)) ];

      const actions = document.createElement('div'); actions.className = 'var-actions';
      const applyBtn = document.createElement('button'); applyBtn.textContent = '적용';
      const resetBtn = document.createElement('button'); resetBtn.textContent = '초기화';
    // live preview: apply on input
      idInput.addEventListener('input', ()=>{ try{ el.id = idInput.value.trim(); }catch(e){} });
      classInput.addEventListener('input', ()=>{ try{ el.className = classInput.value.trim(); }catch(e){} });
      textInput.addEventListener('input', ()=>{ try{ el.textContent = textInput.value; }catch(e){} });

      applyBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation(); ev.preventDefault();
        try {
          // already applied via live preview; but add to history
          const snap = { id: el.id||'', className: el.className||'', textContent: el.textContent||'', styleCssText: el.getAttribute('style')||'' };
          history.push(JSON.parse(JSON.stringify(snap)));
          showTempMessage(applyBtn, '적용됨');
        } catch (e) {}
      });
      resetBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation(); ev.preventDefault();
        try {
          // restore original snapshot
          el.id = originalSnapshot.id;
          el.className = originalSnapshot.className;
          el.textContent = originalSnapshot.textContent;
          if (originalSnapshot.styleCssText) el.setAttribute('style', originalSnapshot.styleCssText);
          else el.removeAttribute('style');
          // update inputs
          idInput.value = originalSnapshot.id;
          classInput.value = originalSnapshot.className;
          textInput.value = originalSnapshot.textContent;
          varsWrap.innerHTML = '';
          propsWrap.innerHTML = '';
          showTempMessage(resetBtn, '초기화됨');
        } catch (e) {}
      });
      // undo button
      const undoBtn = document.createElement('button'); undoBtn.textContent='되돌리기';
      undoBtn.addEventListener('click',(ev)=>{ ev.stopPropagation(); ev.preventDefault(); try{ if(history.length>1){ history.pop(); const s = history[history.length-1]; el.id = s.id; el.className = s.className; el.textContent = s.textContent; if(s.styleCssText) el.setAttribute('style', s.styleCssText); else el.removeAttribute('style'); idInput.value=s.id; classInput.value=s.className; textInput.value=s.textContent; showTempMessage(undoBtn,'되돌려짐'); } }catch(e){} });
      actions.appendChild(undoBtn);
      actions.appendChild(applyBtn); actions.appendChild(resetBtn);
      varPanel.appendChild(actions);
      tagEl.appendChild(varPanel);

      // add '새로 선택' button to allow re-selecting without reopening popup
      const newSelectBtn = document.createElement('button');
      newSelectBtn.className = '__ce_qr_copy';
      newSelectBtn.textContent = '새로 선택';
      newSelectBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation(); ev.preventDefault();
        try {
          // remove current tag and allow overlay to capture clicks again
          if (tagEl) { tagEl.remove(); tagEl = null; }
          selected = false;
          overlay.style.pointerEvents = 'auto';
        } catch (e) {}
      });
      tagEl.insertBefore(newSelectBtn, tagEl.firstChild);

      // make tag draggable
      (function makeDraggable(elm) {
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let origX = 0;
        let origY = 0;
        function onPointerDown(ev) {
          // ignore pointerdown when clicking buttons
          if (ev.target && (ev.target.tagName === 'BUTTON' || ev.target.closest('.__ce_qr_buttons'))) return;
          isDown = true;
          startX = ev.clientX;
          startY = ev.clientY;
          const rect = elm.getBoundingClientRect();
          origX = rect.left;
          origY = rect.top;
          ev.preventDefault();
        }
        function onPointerMove(ev) {
          if (!isDown) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          elm.style.left = Math.min(window.innerWidth - 20, Math.max(8, origX + dx)) + 'px';
          elm.style.top = Math.min(window.innerHeight - 20, Math.max(8, origY + dy)) + 'px';
        }
        function onPointerUp() {
          isDown = false;
        }
        elm.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      })(tagEl);

    const rect = el.getBoundingClientRect
      ? el.getBoundingClientRect()
      : { left: 8, top: 8 };
    tagEl.style.left =
      Math.min(window.innerWidth - 420, Math.max(8, rect.left)) + "px";
    tagEl.style.top = Math.max(8, rect.top - 60) + "px";

    const toCopy = selector ? `${selector}\n${jsCommand}\n${outer}` : "";
    (async () => {
      try {
        await navigator.clipboard.writeText(toCopy);
        try {
          const sel = window.getSelection && window.getSelection();
          if (sel && sel.removeAllRanges) sel.removeAllRanges();
        } catch (e) {}
        try {
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        } catch (e) {}
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = toCopy;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        try {
          const sel = window.getSelection && window.getSelection();
          if (sel && sel.removeAllRanges) sel.removeAllRanges();
        } catch (e) {}
        try {
          ta.blur();
        } catch (e) {}
        ta.remove();
      }
    })();

    // mark as selected and disable further selections until user re-opens
    selected = true;
    // allow page interactions again while keeping preview/result visible
    try {
      overlay.style.pointerEvents = 'none';
    } catch (e) {}
  }

  // attach listeners on the overlay so underlying page doesn't receive clicks
  overlay.addEventListener("mousemove", onMouseMove, true);
  overlay.addEventListener("click", onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();