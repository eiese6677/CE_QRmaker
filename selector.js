(() => {
  if (window.__ce_qr_selector_active) return;
  window.__ce_qr_selector_active = true;

  // === 오버레이 ===
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'transparent', zIndex: 2147483646, pointerEvents: 'none',
  });
  document.body.appendChild(overlay);

  let tagEl = null;
  let highlightEl = null;
  let currentEl = null;
  let isDraggingTag = false;

  // === 하이라이트 ===
  const makeHighlight = () => {
    const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'fixed', border: '3px solid #1e90ff', background: 'rgba(30,144,255,0.1)',
      zIndex: 2147483647, pointerEvents: 'none',
    });
    document.body.appendChild(div);
    return div;
  };
  highlightEl = makeHighlight();

  // === 요소 찾기 ===
  const getElAt = (x, y) => {
    const els = document.elementsFromPoint(x, y);
    return els.find(e => ![overlay, highlightEl, tagEl].includes(e));
  };

  const updateHighlight = el => {
    if (!el) return (highlightEl.style.display = 'none');
    const r = el.getBoundingClientRect();
    Object.assign(highlightEl.style, {
      display: 'block', top: `${r.top}px`, left: `${r.left}px`,
      width: `${r.width}px`, height: `${r.height}px`,
    });
  };

  // === 선택자 생성 ===
  const getSelector = el => {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      let sel = el.nodeName.toLowerCase();
      if (el.id) { sel += `#${el.id}`; path.unshift(sel); break; }
      if (el.classList.length) sel += '.' + Array.from(el.classList).slice(0,2).join('.');
      const sibs = Array.from(el.parentNode.children).filter(c=>c.nodeName===el.nodeName);
      if(sibs.length>1) sel += `:nth-of-type(${sibs.indexOf(el)+1})`;
      path.unshift(sel); el=el.parentNode;
    }
    return path.join(' > ');
  };

  // === 드래그 ===
  function makeDraggable(el, handle){
    let offsetX=0, offsetY=0;
    handle.addEventListener('mousedown', e=>{
      if(e.button!==0) return;
      isDraggingTag=true;
      offsetX=e.clientX-el.offsetLeft;
      offsetY=e.clientY-el.offsetTop;
      document.body.style.userSelect='none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', e=>{
      if(!isDraggingTag) return;
      el.style.left=`${e.clientX-offsetX}px`;
      el.style.top=`${e.clientY-offsetY}px`;
      el.style.transform='none';
    });
    window.addEventListener('mouseup', ()=>{
      isDraggingTag=false;
      document.body.style.userSelect='';
    });
  }

  // === 선택창 생성 ===
  function createTagBox(el){
    if(tagEl) tagEl.remove();
    tagEl=document.createElement('div');
    Object.assign(tagEl.style,{
      position:'fixed', top:'10%', left:'50%', transform:'translateX(-50%)',
      width:'min(90vw,640px)', maxHeight:'80vh', overflowY:'auto',
      background:'rgba(30,30,30,0.96)', color:'#fff', padding:'16px',
      borderRadius:'10px', zIndex:2147483648, fontFamily:'monospace',
      boxShadow:'0 0 20px rgba(0,0,0,0.5)', backdropFilter:'blur(6px)',
      cursor:'default', pointerEvents:'auto',
    });

    // === 상단바 + 닫기 ===
    const topBar=document.createElement('div');
    Object.assign(topBar.style,{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',cursor:'move'});
    const title=document.createElement('div'); title.textContent=`<${el.tagName.toLowerCase()}>`;
    Object.assign(title.style,{fontWeight:'bold',fontSize:'16px'});
    const closeBtn=document.createElement('button'); closeBtn.textContent='✕';
    Object.assign(closeBtn.style,{background:'transparent',color:'#fff',border:'none',fontSize:'18px',cursor:'pointer'});
    closeBtn.addEventListener('click',cleanup);
    topBar.append(title,closeBtn);
    tagEl.appendChild(topBar);

    // === HTML 출력 ===
    const htmlLabel=document.createElement('div'); htmlLabel.textContent='HTML';
    Object.assign(htmlLabel.style,{fontWeight:'bold',marginBottom:'4px'}); tagEl.appendChild(htmlLabel);
    const htmlBlock=document.createElement('pre');
    htmlBlock.textContent=el.outerHTML.substring(0,2000);
    Object.assign(htmlBlock.style,{background:'rgba(255,255,255,0.05)',padding:'8px',borderRadius:'8px',whiteSpace:'pre-wrap',marginBottom:'8px'});
    tagEl.appendChild(htmlBlock);

    // === 선택자 출력 ===
    const selLabel=document.createElement('div'); selLabel.textContent='CSS 선택자';
    Object.assign(selLabel.style,{fontWeight:'bold',marginBottom:'4px'}); tagEl.appendChild(selLabel);
    const sel=document.createElement('pre');
    sel.textContent=getSelector(el) || '(비어 있음)';
    Object.assign(sel.style,{background:'rgba(255,255,255,0.05)',padding:'8px',borderRadius:'8px',whiteSpace:'pre-wrap',marginBottom:'8px'});
    tagEl.appendChild(sel);

    // === 버튼 ===
    const btnWrap=document.createElement('div'); Object.assign(btnWrap.style,{display:'flex',gap:'8px',marginBottom:'10px',flexWrap:'wrap'});
    const mkBtn=(t,c)=>{ const b=document.createElement('button'); b.textContent=t; Object.assign(b.style,{flex:'1',background:c,color:'#fff',border:'none',borderRadius:'6px',padding:'6px 8px',cursor:'pointer',fontWeight:'600'}); return b;};
    const copyBtn=mkBtn('HTML 복사','#007bff'); 
    const copySel=mkBtn('CSS 선택자 복사','#6f42c1'); 
    btnWrap.append(copyBtn,copySel); tagEl.appendChild(btnWrap);
    copyBtn.onclick=()=>navigator.clipboard.writeText(el.outerHTML||'');
    copySel.onclick=()=>navigator.clipboard.writeText(getSelector(el)||'');

    // === 변수 편집창 항상 표시 ===
    const varPanel=document.createElement('div');
    Object.assign(varPanel.style,{display:'block',background:'rgba(255,255,255,0.05)',padding:'10px',borderRadius:'8px',pointerEvents:'auto',userSelect:'text'});

    // --- 기존 주요 속성 ---
    const idInput=document.createElement('input'); idInput.value=el.id||'';
    const classInput=document.createElement('input'); classInput.value=el.className||'';
    const textInput=document.createElement('textarea'); textInput.value=el.textContent||'';
    const styleInput=document.createElement('textarea'); styleInput.value=el.getAttribute('style')||'';
    const jsInput=document.createElement('textarea'); jsInput.value='';

    [idInput,classInput,textInput,styleInput,jsInput].forEach(i=>{
      i.style.width='100%'; i.style.marginTop='4px'; i.style.background='rgba(255,255,255,0.1)';
      i.style.color='#fff'; i.style.border='1px solid rgba(255,255,255,0.2)'; i.style.borderRadius='4px'; i.style.padding='4px'; i.style.fontFamily='monospace';
      if(i.tagName==='TEXTAREA') i.style.height='80px';
    });

    varPanel.append('id:',idInput,'class:',classInput,'textContent:',textInput,'style:',styleInput,'JS:',jsInput);
    idInput.oninput=()=>el.id=idInput.value;
    classInput.oninput=()=>el.className=classInput.value;
    textInput.oninput=()=>el.textContent=textInput.value;
    styleInput.oninput=()=>el.setAttribute('style',styleInput.value);
    let lastHandler=null;
    jsInput.oninput=()=>{
      if(lastHandler) el.removeEventListener('click',lastHandler);
      try{lastHandler=new Function('event',jsInput.value); el.addEventListener('click',lastHandler);}catch(err){console.error('JS 오류:',err);}
    };

    // === 모든 속성 표시 ===
    const attrContainer=document.createElement('div'); attrContainer.style.marginTop='10px';
    const refreshAttrs=()=>{
      attrContainer.innerHTML='';
      Array.from(el.attributes).forEach(attr=>{
        const wrapper=document.createElement('div'); wrapper.style.display='flex'; wrapper.style.gap='4px'; wrapper.style.marginTop='4px';
        const input=document.createElement('input'); input.value=attr.value; input.style.flex='1';
        input.style.background='rgba(255,255,255,0.1)'; input.style.color='#fff'; input.style.border='1px solid rgba(255,255,255,0.2)'; input.style.borderRadius='4px'; input.style.padding='2px';
        input.oninput=()=>el.setAttribute(attr.name,input.value);
        const label=document.createElement('span'); label.textContent=attr.name; label.style.width='80px';
        wrapper.append(label,input); attrContainer.appendChild(wrapper);
      });
    };
    refreshAttrs();
    varPanel.appendChild(attrContainer);

    // === 새 속성 추가 ===
    const addAttrBtn=document.createElement('button'); addAttrBtn.textContent='속성 추가';
    Object.assign(addAttrBtn.style,{marginTop:'6px',padding:'4px 6px',cursor:'pointer'});
    addAttrBtn.onclick=()=>{
      const name=prompt('속성 이름:'); if(!name) return;
      el.setAttribute(name,''); refreshAttrs();
    };
    varPanel.appendChild(addAttrBtn);

    tagEl.appendChild(varPanel);
    document.body.appendChild(tagEl);
    makeDraggable(tagEl,topBar);
  }

  // === 이벤트 ===
  window.addEventListener('mousemove', e=>{ if(isDraggingTag || tagEl) return; const el=getElAt(e.clientX,e.clientY); currentEl=el; updateHighlight(el); });
  document.addEventListener('click', e=>{ if(tagEl) return; const el=getElAt(e.clientX,e.clientY); if(el) createTagBox(el); }, true);
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') cleanup(); });

  // === 종료 ===
  function cleanup(){ overlay.remove(); highlightEl.remove(); if(tagEl) tagEl.remove(); window.__ce_qr_selector_active=false; }
})();
