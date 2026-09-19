(() => {
  'use strict';
  const DATA = window.STUDY_DATA;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const circled = ['①','②','③','④'];
  const STATE_KEY = 'programmingTechnicianStudyLab.v1';
  const defaultState = {summaryDone:[], summaryPage:1, examAnswers:{}, examGrades:{}, customAnswers:{}, theme:'light'};
  let state = loadState();
  let currentView='dashboard', currentExam=1, timerSec=0, timerId=null;
  let customFilter='all', customOrder=DATA.customQuestions.map(q=>q.id), customIndex=0;

  function loadState(){
    try { return {...defaultState, ...JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}; }
    catch { return JSON.parse(JSON.stringify(defaultState)); }
  }
  function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); updateDashboard(); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1800); }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function pageFile(n){ return `page-${pad2(n)}.png`; }
  function setTheme(theme){ state.theme=theme; document.documentElement.dataset.theme=theme; saveState(); }

  // Navigation
  const titles={dashboard:'학습 대시보드',summary:'핵심 요약',mock:'원본 모의고사',custom:'추가 문제 60'};
  function go(view){
    currentView=view;
    $$('.view').forEach(v=>v.classList.remove('active'));
    $(`#${view}View`).classList.add('active');
    $$('.nav-item,.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $('#viewTitle').textContent=titles[view];
    window.scrollTo({top:0,behavior:'smooth'});
    if(view==='summary') renderSummary();
    if(view==='mock') renderExam();
    if(view==='custom') renderCustom();
    if(view==='dashboard') updateDashboard();
  }
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

  // Dashboard
  const subjectGroups=[
    {name:'1과목 · 프로그래밍', pages:[1,2,3,4,5,6,7,8,9]},
    {name:'2과목 · 응용 SW', pages:[10,11,12,13,14,15,16,17,18]},
    {name:'3과목 · SQL', pages:[19,20,21]},
    {name:'4과목 · 정보시스템', pages:[22,23,24,25,26,27,28,29,30]},
  ];
  function updateDashboard(){
    const done=new Set(state.summaryDone||[]);
    $('#summaryDoneStat').textContent=`${done.size} / 30`;
    $('#subjectProgress').innerHTML=subjectGroups.map(g=>{
      const n=g.pages.filter(p=>done.has(p)).length, pct=Math.round(n/g.pages.length*100);
      return `<div class="progress-row"><span>${g.name}</span><div class="progress-track"><i style="width:${pct}%"></i></div><b>${n}/${g.pages.length}</b></div>`;
    }).join('');
    $('#examRecords').innerHTML=[1,2,3,4,5].map(e=>{
      const gr=state.examGrades?.[e];
      const answered=(state.examAnswers?.[e]||[]).filter(Boolean).length;
      return `<div class="record-row"><div class="record-badge">${e}회</div><div><strong>${gr?`${gr.score} / 60`:(answered?`${answered}문항 응답`:'미응시')}</strong><small>${gr?`오답 ${gr.wrong.length}문항`:'답안은 자동 저장됩니다'}</small></div><span>${gr?'완료':'—'}</span></div>`;
    }).join('');
    const examWrong=[1,2,3,4,5].map(e=>state.examGrades?.[e]?.wrong?.length||0);
    const customVals=Object.values(state.customAnswers||{}); const customWrong=customVals.filter(x=>!x.correct).length;
    $('#wrongSummary').innerHTML=[1,2,3,4,5].map((e,i)=>`<div class="wrong-tile"><span>${e}회 모의고사</span><strong>${examWrong[i]}</strong><span>오답</span></div>`).join('')+`<div class="wrong-tile"><span>추가 문제</span><strong>${customWrong}</strong><span>오답</span></div>`;
    const examDone=[1,2,3,4,5].filter(e=>state.examGrades?.[e]).length;
    const customDone=Object.keys(state.customAnswers||{}).length;
    const overall=Math.round((done.size+examDone*6+customDone/2)/(30+30+30)*100);
    $('#overallPercent').textContent=`${Math.min(100,overall)}%`;
    $('#overallRing').style.setProperty('--p',`${Math.min(360,overall*3.6)}deg`);
  }

  // Summary reader
  function renderRail(){
    const done=new Set(state.summaryDone||[]), current=Number(state.summaryPage)||1;
    $('#summaryRail').innerHTML=Array.from({length:30},(_,i)=>i+1).map(p=>`<button class="page-thumb ${p===current?'active':''} ${done.has(p)?'done':''}" data-p="${p}">페이지 ${p}</button>`).join('');
    $$('#summaryRail [data-p]').forEach(b=>b.addEventListener('click',()=>setSummaryPage(+b.dataset.p)));
    $('#summaryRail .active')?.scrollIntoView({block:'nearest'});
  }
  function setSummaryPage(p){
    p=Math.max(1,Math.min(30,p)); state.summaryPage=p; saveState(); renderSummary();
  }
  function renderSummary(){
    const p=Number(state.summaryPage)||1; const done=(state.summaryDone||[]).includes(p);
    $('#summaryImage').src=`assets/summary/${pageFile(p)}`; $('#summaryImage').alt=`핵심요약 ${p}페이지`;
    $('#summaryPageTitle').textContent=`핵심 요약 · ${p}페이지`; $('#summaryPageInput').value=p;
    $('#summaryCompleteBadge').textContent=done?'학습 완료':'미완료'; $('#summaryCompleteBadge').className=`status-badge ${done?'done':''}`;
    $('#markSummary').textContent=done?'완료 취소':'학습 완료'; renderRail();
  }
  $('#summaryPrev').addEventListener('click',()=>setSummaryPage((+state.summaryPage||1)-1));
  $('#summaryNext').addEventListener('click',()=>setSummaryPage((+state.summaryPage||1)+1));
  $('#summaryPageInput').addEventListener('change',e=>setSummaryPage(+e.target.value));
  $('#markSummary').addEventListener('click',()=>{
    const p=+state.summaryPage||1, s=new Set(state.summaryDone||[]); s.has(p)?s.delete(p):s.add(p); state.summaryDone=[...s].sort((a,b)=>a-b); saveState(); renderSummary(); toast(s.has(p)?'학습 완료로 표시했습니다.':'완료 표시를 취소했습니다.');
  });
  $$('#subjectTabs [data-page]').forEach(b=>b.addEventListener('click',()=>{ $$('#subjectTabs .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); setSummaryPage(+b.dataset.page); }));
  $('#summarySearch').addEventListener('input',e=>{
    const q=e.target.value.trim().toLowerCase(), box=$('#searchResults');
    if(!q){box.classList.add('hidden');box.innerHTML='';return;}
    const hits=DATA.summaryPages.filter(x=>x.text.toLowerCase().includes(q));
    box.innerHTML=hits.length?hits.map(x=>{
      const flat=x.text.replace(/\s+/g,' '); const idx=flat.toLowerCase().indexOf(q); const snip=flat.slice(Math.max(0,idx-55),idx+q.length+80);
      return `<button class="search-hit" data-p="${x.page}"><strong>${x.page}페이지</strong><small>…${escapeHtml(snip)}…</small></button>`;
    }).join(''):`<div class="search-hit"><strong>검색 결과 없음</strong><small>다른 키워드로 검색해 보세요.</small></div>`;
    box.classList.remove('hidden');
    $$('.search-hit[data-p]',box).forEach(b=>b.addEventListener('click',()=>{setSummaryPage(+b.dataset.p);box.classList.add('hidden');}));
  });

  // Original mock exams
  function ensureExamAnswers(e){
    if(!state.examAnswers[e]) state.examAnswers[e]=Array(60).fill(null);
    if(state.examAnswers[e].length<60) state.examAnswers[e]=[...state.examAnswers[e],...Array(60-state.examAnswers[e].length).fill(null)];
    return state.examAnswers[e];
  }
  function renderExam(){
    const e=currentExam, cfg=DATA.examPages[e], ua=ensureExamAnswers(e), grade=state.examGrades?.[e];
    $('#examTitle').textContent=`${e}회 최종점검 모의고사`;
    $$('#examTabs .exam-tab').forEach(b=>b.classList.toggle('active',+b.dataset.exam===e));
    $('#examPages').innerHTML=cfg.questions.map((p,i)=>{
      const startQ=i*10+1, endQ=Math.min((i+1)*10,60);
      const key=DATA.examAnswers[e];
      const pageOMR=Array.from({length:endQ-startQ+1},(_,j)=>{
        const qn=startQ+j, chosen=ua[qn-1], correct=key[qn-1], isCorrect=grade&&chosen===correct;
        return `<div class="inline-omr-row ${grade?'graded':''} ${grade?(isCorrect?'correct-row':'wrong-row'):''}" data-q="${qn}">
          <span class="qnum">${qn}</span>
          ${[1,2,3,4].map(v=>`<button class="omr-opt ${chosen===v?'selected':''} ${grade&&correct===v?'correct-answer':''} ${grade&&chosen===v&&chosen!==correct?'user-wrong':''}" data-v="${v}">${v}</button>`).join('')}
        </div>`;
      }).join('');
      return `<div class="exam-page">
        <span class="page-tag">${e}회 · ${i+1}/6</span>
        <img loading="lazy" src="assets/mock_all/${pageFile(p)}" alt="${e}회 모의고사 원본 ${i+1}페이지">
        <div class="inline-omr-panel">
          <div class="inline-omr-header"><strong>문제 ${startQ}~${endQ}</strong><span>답안 선택</span></div>
          <div class="inline-omr-grid">${pageOMR}</div>
        </div>
      </div>`;
    }).join('');
    attachInlineOMRListeners();
    renderOMR();
    const exp=$('#explanationBlock');
    if(grade){
      showExamResult(grade); exp.classList.remove('hidden');
      $('#explanationPages').innerHTML=cfg.explanations.map((p,i)=>`<div class="exam-page"><span class="page-tag">해설 ${i+1}/${cfg.explanations.length}</span><img loading="lazy" src="assets/mock_all/${pageFile(p)}" alt="${e}회 모의고사 원본 해설 ${i+1}페이지"></div>`).join('');
    } else { $('#examResult').classList.add('hidden'); exp.classList.add('hidden'); $('#explanationPages').innerHTML=''; }
    $('#answeredCount').textContent=`${ua.filter(Boolean).length} / 60`;
  }
  function attachInlineOMRListeners(){
    $$('.inline-omr-panel .omr-opt').forEach(b=>b.addEventListener('click',()=>{
      const row=b.closest('.inline-omr-row'), q=+row.dataset.q; 
      ensureExamAnswers(currentExam)[q-1]=+b.dataset.v;
      if(state.examGrades[currentExam]) delete state.examGrades[currentExam]; 
      saveState(); renderExam(); 
      $('#examResult').classList.add('hidden'); 
      $('#explanationBlock').classList.add('hidden');
    }));
  }
  function renderOMR(){
    const ua=ensureExamAnswers(currentExam), grade=state.examGrades?.[currentExam], key=DATA.examAnswers[currentExam];
    $('#omrGrid').innerHTML=Array.from({length:60},(_,i)=>{
      const chosen=ua[i], correct=key[i], isCorrect=grade&&chosen===correct;
      return `<div class="omr-row ${grade?'graded':''} ${grade?(isCorrect?'correct-row':'wrong-row'):''}" data-q="${i+1}"><span class="qnum">${i+1}</span>${[1,2,3,4].map(v=>`<button class="omr-opt ${chosen===v?'selected':''} ${grade&&correct===v?'correct-answer':''} ${grade&&chosen===v&&chosen!==correct?'user-wrong':''}" data-v="${v}">${v}</button>`).join('')}</div>`;
    }).join('');
    $$('.omr-opt').forEach(b=>b.addEventListener('click',()=>{
      const row=b.closest('.omr-row'), q=+row.dataset.q; ensureExamAnswers(currentExam)[q-1]=+b.dataset.v;
      if(state.examGrades[currentExam]) delete state.examGrades[currentExam]; saveState(); renderOMR(); $('#examResult').classList.add('hidden'); $('#explanationBlock').classList.add('hidden');
      $('#answeredCount').textContent=`${ensureExamAnswers(currentExam).filter(Boolean).length} / 60`;
    }));
  }
  function gradeExam(){
    const ua=ensureExamAnswers(currentExam), key=DATA.examAnswers[currentExam];
    const wrong=[], unanswered=[]; let score=0;
    key.forEach((ans,i)=>{ if(!ua[i]) unanswered.push(i+1); else if(ua[i]===ans) score++; else wrong.push(i+1); });
    const grade={score,wrong,unanswered,gradedAt:new Date().toISOString()}; state.examGrades[currentExam]=grade; saveState(); renderExam();
    setTimeout(()=>$('#examResult').scrollIntoView({behavior:'smooth',block:'center'}),50);
  }
  function showExamResult(g){
    const box=$('#examResult'); box.innerHTML=`<div><span class="section-label">RESULT · ${currentExam}회</span><strong>${g.score} / 60</strong><small>오답 ${g.wrong.length}문항 · 미응답 ${g.unanswered.length}문항</small></div><div><b>${g.wrong.length?`오답: ${g.wrong.join(', ')}`:'전 문항 정답'}</b></div>`; box.classList.remove('hidden');
  }
  $$('#examTabs .exam-tab').forEach(b=>b.addEventListener('click',()=>{ currentExam=+b.dataset.exam; stopTimer();timerSec=0;updateTimer();renderExam(); }));
  $('#submitExam').addEventListener('click',()=>{const n=ensureExamAnswers(currentExam).filter(Boolean).length;if(n<60&&!confirm(`${60-n}문항이 비어 있습니다. 그대로 채점할까요?`))return;gradeExam();});
  $('#clearExam').addEventListener('click',()=>{if(!confirm(`${currentExam}회 답안을 모두 지울까요?`))return;state.examAnswers[currentExam]=Array(60).fill(null);delete state.examGrades[currentExam];saveState();renderExam();toast('답안을 지웠습니다.');});
  function updateTimer(){ $('#examTimer').textContent=`${pad2(Math.floor(timerSec/60))}:${pad2(timerSec%60)}`; }
  function startTimer(){ if(timerId)return; $('#timerToggle').textContent='타이머 정지'; $('.pulse').classList.add('live'); timerId=setInterval(()=>{timerSec++;updateTimer()},1000); }
  function stopTimer(){ if(timerId){clearInterval(timerId);timerId=null;} $('#timerToggle').textContent='타이머 시작'; $('.pulse').classList.remove('live'); }
  $('#timerToggle').addEventListener('click',()=>timerId?stopTimer():startTimer());

  // Additional questions
  function filteredCustom(){
    const byId=new Map(DATA.customQuestions.map(q=>[q.id,q]));
    let arr=customOrder.map(id=>byId.get(id)).filter(Boolean);
    if(customFilter==='wrong') arr=arr.filter(q=>state.customAnswers[q.id]&&!state.customAnswers[q.id].correct);
    else if(customFilter!=='all') arr=arr.filter(q=>q.subject===customFilter);
    return arr;
  }
  function renderCustom(){
    const arr=filteredCustom();
    if(!arr.length){
      $('#questionCard').innerHTML=`<div style="padding:60px 20px;text-align:center"><span class="section-label">EMPTY</span><h2>${customFilter==='wrong'?'현재 오답이 없습니다.':'해당 조건의 문제가 없습니다.'}</h2><button class="primary-btn" id="backAll">전체 문제 보기</button></div>`;
      $('#backAll')?.addEventListener('click',()=>{customFilter='all';customIndex=0; $$('#customFilters .chip').forEach(x=>x.classList.toggle('active',x.dataset.subject==='all')); renderCustom();});
      renderCustomMap(arr); updateCustomStats(); return;
    }
    customIndex=Math.max(0,Math.min(customIndex,arr.length-1)); const q=arr[customIndex], saved=state.customAnswers[q.id];
    $('#questionCard').innerHTML=`
      <div class="question-meta"><div><span class="subject-badge">${escapeHtml(q.subject.split(' ')[0])}</span><span class="source-ref">핵심요약 ${q.source}</span></div><span>${customIndex+1} / ${arr.length}</span></div>
      <h2>${escapeHtml(q.question)}</h2>
      <div class="option-list">${q.options.map((o,i)=>`<button class="option-btn ${saved?.choice===i+1?'selected':''} ${saved&&q.answer===i+1?'correct':''} ${saved?.choice===i+1&&saved.choice!==q.answer?'wrong':''}" data-v="${i+1}"><i>${circled[i]}</i><span>${escapeHtml(o)}</span></button>`).join('')}</div>
      <div class="feedback ${saved?(saved.correct?'correct':'wrong'):'hidden'}">${saved?`<b>${saved.correct?'정답입니다.':`정답은 ${circled[q.answer-1]}입니다.`}</b>${escapeHtml(q.explanation)}`:''}</div>
      <div class="question-nav"><button class="ghost-btn" id="customPrev" ${customIndex===0?'disabled':''}>← 이전</button><button class="primary-btn" id="customNext">${customIndex===arr.length-1?'처음으로':'다음 →'}</button></div>`;
    $$('.option-btn',$('#questionCard')).forEach(b=>b.addEventListener('click',()=>{const choice=+b.dataset.v;state.customAnswers[q.id]={choice,correct:choice===q.answer};saveState();renderCustom();}));
    $('#customPrev').addEventListener('click',()=>{customIndex=Math.max(0,customIndex-1);renderCustom();window.scrollTo({top:0,behavior:'smooth'});});
    $('#customNext').addEventListener('click',()=>{customIndex=customIndex===arr.length-1?0:customIndex+1;renderCustom();window.scrollTo({top:0,behavior:'smooth'});});
    renderCustomMap(arr); updateCustomStats();
  }
  function renderCustomMap(arr){
    $('#customMapCount').textContent=arr.length;
    $('#customMap').innerHTML=arr.map((q,i)=>{const a=state.customAnswers[q.id];return `<button data-i="${i}" class="${i===customIndex?'current':''} ${a?(a.correct?'correct':'wrong'):''}">${q.id}</button>`}).join('');
    $$('#customMap button').forEach(b=>b.addEventListener('click',()=>{customIndex=+b.dataset.i;renderCustom();}));
  }
  function updateCustomStats(){
    const vals=Object.values(state.customAnswers||{}), correct=vals.filter(x=>x.correct).length, wrong=vals.length-correct, acc=vals.length?Math.round(correct/vals.length*100):0;
    $('#customAnswered').textContent=vals.length; $('#customCorrect').textContent=correct; $('#customWrong').textContent=wrong; $('#accuracyFill').style.width=`${acc}%`; $('#accuracyText').textContent=`정답률 ${acc}%`;
  }
  $$('#customFilters .chip').forEach(b=>b.addEventListener('click',()=>{customFilter=b.dataset.subject;customIndex=0;$$('#customFilters .chip').forEach(x=>x.classList.toggle('active',x===b));renderCustom();}));
  $('#shuffleCustom').addEventListener('click',()=>{for(let i=customOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[customOrder[i],customOrder[j]]=[customOrder[j],customOrder[i]];}customIndex=0;renderCustom();toast('문항 순서를 섞었습니다.');});
  $('#resetCustom').addEventListener('click',()=>{if(!confirm('추가 문제 60문항의 응답 기록을 초기화할까요?'))return;state.customAnswers={};saveState();renderCustom();toast('추가 문제 기록을 초기화했습니다.');});

  // Theme / reset
  $('#themeToggle').addEventListener('click',()=>setTheme(state.theme==='dark'?'light':'dark'));
  $('#resetProgress').addEventListener('click',()=>{if(!confirm('핵심요약 완료 체크, 모의고사 답안/점수, 추가 문제 기록을 모두 초기화할까요?'))return;state=JSON.parse(JSON.stringify(defaultState));state.theme=document.documentElement.dataset.theme||'light';saveState();renderSummary();renderExam();renderCustom();toast('학습 기록을 초기화했습니다.');});
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  document.documentElement.dataset.theme=state.theme||'light';
  updateDashboard(); renderSummary(); renderExam(); renderCustom(); updateTimer();
})();
