(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const scenes = [...document.querySelectorAll(".scene")];

  const state = {
    passcode:"",
    passcodeValue:"1997",
    memoryIndex:0,
    yesTimer:null,
    candleTimer:null,
    musicStarted:false,
    noMoves:0
  };

  function showScene(id){
    scenes.forEach(s => s.classList.toggle("active", s.id === id));
    window.scrollTo(0,0);
    if(id === "candle") resetCandle();
  }

  /* music */
  const bgMusic = $("bgMusic");
  const musicToggle = $("musicToggle");

  async function startMusic(){
    try{
      bgMusic.volume = .10;
      await bgMusic.play();
      state.musicStarted = true;
      musicToggle.classList.add("playing");
      musicToggle.setAttribute("aria-pressed","true");
      musicToggle.querySelector("span").textContent = "♫";
    }catch{}
  }

  musicToggle.addEventListener("click", async () => {
    if(bgMusic.paused) await startMusic();
    else{
      bgMusic.pause();
      musicToggle.classList.remove("playing");
      musicToggle.setAttribute("aria-pressed","false");
      musicToggle.querySelector("span").textContent = "♪";
    }
  });

  // Music starts from a real navigation gesture, avoiding the
  // old pointerdown race that could immediately pause the first click.

  /* opening */
  const envelopeBtn = $("openEnvelope");
  envelopeBtn.addEventListener("click", () => {
    startMusic();
    envelopeBtn.classList.add("open");
    setTimeout(() => showScene("lock"), 700);
  });

  /* lock */
  const dots = [...$("passDots").children];
  const lockMessage = $("lockMessage");
  const wrongMessages = [
    "Nope 😌 you know this one",
    "Try again, My Love ❤️",
    "I know you know this 🥹",
    "Almost... one more try",
    "That's not the secret number 🤭"
  ];

  function renderPass(){
    dots.forEach((d,i) => d.classList.toggle("filled", i < state.passcode.length));
  }

  function resetPass(){
    state.passcode = "";
    renderPass();
  }

  function checkPass(){
    if(state.passcode === state.passcodeValue){
      lockMessage.textContent = "Okay, that's my girl ❤️";
      setTimeout(() => showScene("play"), 450);
    }else{
      lockMessage.textContent = wrongMessages[Math.floor(Math.random()*wrongMessages.length)];
      $("passDots").classList.remove("shake");
      void $("passDots").offsetWidth;
      $("passDots").classList.add("shake");
      setTimeout(resetPass, 620);
    }
  }

  $("keypad").addEventListener("click", e => {
    const key = e.target.closest(".key");
    if(!key) return;
    if(key.id === "clearKey"){ resetPass(); return; }
    if(key.id === "backKey"){ state.passcode = state.passcode.slice(0,-1); renderPass(); return; }
    if(state.passcode.length >= 4) return;
    state.passcode += key.dataset.key;
    renderPass();
    if(state.passcode.length === 4) checkPass();
  });

  window.addEventListener("keydown", e => {
    if(!$("lock").classList.contains("active")) return;
    if(/^[0-9]$/.test(e.key)){
      e.preventDefault();
      if(state.passcode.length >= 4) return;
      state.passcode += e.key;
      renderPass();
      if(state.passcode.length === 4) checkPass();
    }else if(e.key === "Backspace"){
      e.preventDefault();
      state.passcode = state.passcode.slice(0,-1);
      renderPass();
    }else if(e.key === "Escape"){
      e.preventDefault();
      resetPass();
    }
  });

  /* yes / no */
  const noBtn = $("noBtn");
  const choiceZone = $("choiceZone");
  const playMessage = $("playMessage");
  const noMessages = [
    "That button doesn't feel right 🥺",
    "Hmm... try the other one 😌",
    "You're really going with no? 😭",
    "I don't believe you ❤️",
    "Okay fine... but I'm still asking again 🤭"
  ];

  function resetPlay(){
    state.noMoves = 0;
    noBtn.style.left = "";
    noBtn.style.top = "";
    noBtn.style.right = "0";
    delete noBtn.dataset.lastX;
    delete noBtn.dataset.lastY;
    noBtn.textContent = "not really";
    playMessage.textContent = "";
  }

  function moveNo(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }

    state.noMoves++;

    const zoneW = choiceZone.clientWidth;
    const zoneH = choiceZone.clientHeight;
    const btnW = noBtn.offsetWidth;
    const btnH = noBtn.offsetHeight;

    const pad = 10;
    const maxX = Math.max(pad, zoneW - btnW - pad);
    const maxY = Math.max(0, zoneH - btnH);

    const yesRect = $("yesBtn").getBoundingClientRect();
    const zoneRect = choiceZone.getBoundingClientRect();

    const forbiddenLeft = yesRect.left - zoneRect.left - 24;
    const forbiddenRight = yesRect.right - zoneRect.left + 24;

    const candidates = [];
    const cols = Math.max(6, Math.ceil(maxX / Math.max(btnW * .55, 18)));
    const rows = Math.max(3, Math.ceil(maxY / Math.max(btnH * .55, 12)));

    for(let r=0;r<=rows;r++){
      for(let c=0;c<=cols;c++){
        const x = Math.min(maxX, pad + (maxX-pad)*(c/Math.max(1,cols)));
        const y = Math.min(maxY, maxY*(r/Math.max(1,rows)));

        const overlapsYes =
          x < forbiddenRight &&
          x + btnW > forbiddenLeft;

        if(!overlapsYes){
          candidates.push({x,y});
        }
      }
    }

    if(!candidates.length){
      candidates.push(
        {x:pad,y:0},
        {x:Math.max(pad,maxX),y:0},
        {x:pad,y:maxY},
        {x:Math.max(pad,maxX),y:maxY}
      );
    }

    const lastX = Number(noBtn.dataset.lastX);
    const lastY = Number(noBtn.dataset.lastY);

    let best = candidates[0];
    let bestScore = -Infinity;

    for(const candidate of candidates){
      const dx = Number.isFinite(lastX) ? candidate.x-lastX : candidate.x;
      const dy = Number.isFinite(lastY) ? candidate.y-lastY : candidate.y;

      // Strongly prefer a different location every time.
      const distance = dx*dx + dy*dy;
      const score = distance + Math.random()*8000;

      if(score > bestScore){
        bestScore = score;
        best = candidate;
      }
    }

    const x = Math.min(maxX,Math.max(pad,best.x));
    const y = Math.min(maxY,Math.max(0,best.y));

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.right = "auto";
    noBtn.dataset.lastX = String(x);
    noBtn.dataset.lastY = String(y);

    noBtn.classList.remove("dodge");
    void noBtn.offsetWidth;
    noBtn.classList.add("dodge");

    playMessage.textContent =
      noMessages[Math.min(state.noMoves-1,noMessages.length-1)];

    if(state.noMoves >= 3){
      noBtn.textContent = "nope 😌";
    }

    // Guarantee the next attempt is handled immediately as well.
    return false;
  }

  // Desktop: moving onto No makes it dodge
  // Touch/pen: pressing No makes it dodge
  let noHoverLock = false;

  noBtn.addEventListener("pointerenter", e => {
    if(e.pointerType !== "mouse" || noHoverLock) return;

    noHoverLock = true;
    moveNo(e);

    // Release the lock shortly after the button has moved.
    setTimeout(() => { noHoverLock = false; }, 90);
  });

  noBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    moveNo(e);
  }, {passive:false});

  noBtn.addEventListener("keydown", e => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      moveNo(e);
    }
  });

  const yesOverlay = $("yesOverlay");
  const countdown = $("countdown");

  $("yesBtn").addEventListener("click", () => {
    startMusic();
    yesOverlay.classList.add("show");
    yesOverlay.setAttribute("aria-hidden","false");

    let value = 5;
    countdown.textContent = value;

    clearInterval(state.yesTimer);
    state.yesTimer = setInterval(() => {
      value -= 1;
      countdown.textContent = value;
      if(value <= 0){
        clearInterval(state.yesTimer);
        state.yesTimer = null;
        yesOverlay.classList.remove("show");
        yesOverlay.setAttribute("aria-hidden","true");
        showScene("hero");
      }
    },1000);
  });

  /* hero */
  $("heroNext").addEventListener("click", () => showScene("journey"));

  /* memories */
  const memories = [
    {image:"images/memory1.jpg", date:"ONE OF THOSE DAYS", caption:"I think this is one of those moments I would choose to live again without changing a thing", note:"And somehow, I always want one more moment with you ♡"},
    {image:"images/memory2.jpg", date:"A LITTLE MOMENT", caption:"I could forget the conversation and still remember exactly how it felt to be with you", note:"I still like this version of us 🫶"},
    {image:"images/memory3.jpg", date:"YOU PROBABLY FORGOT", caption:"You may have forgotten this moment, but somehow my heart decided to keep it", note:"Of course I would remember this 😌"},
    {image:"images/memory4.jpg", date:"OUR KIND OF MOMENT", caption:"Sometimes I think the best part of our journey is all these little moments that happened without us even planning them", note:"Just us, being us ❤️"},
    {image:"images/memory5.jpg", date:"JUST US", caption:"This is the kind of moment I wish we had more of — nothing special happening, just you and me", note:"Honestly, that's enough for me 🥹"}
  ];

  const track = $("memoryTrack");
  const dotsWrap = $("memoryDots");
  const count = $("memoryCount");

  memories.forEach((m,i)=>{
    const slide = document.createElement("article");
    slide.className = `memory-slide${i===0 ? " active":""}`;
    slide.innerHTML = `
      <div class="memory-card">
        <img class="memory-img" src="${m.image}" alt="Memory ${i+1}" loading="${i===0 ? "eager":"lazy"}" draggable="false">
        <div class="memory-date">${m.date}</div>
        <div class="memory-caption">${m.caption}</div>
        <div class="memory-note">${m.note}</div>
      </div>`;
    track.appendChild(slide);

    const dot = document.createElement("span");
    dot.dataset.index = i;
    if(i===0) dot.classList.add("active");
    dotsWrap.appendChild(dot);
  });

  function updateMemory(){
    track.style.transform = `translate3d(-${state.memoryIndex*100}%,0,0)`;
    count.textContent = `${String(state.memoryIndex+1).padStart(2,"0")} / ${String(memories.length).padStart(2,"0")}`;
    [...dotsWrap.children].forEach((d,i)=>d.classList.toggle("active",i===state.memoryIndex));
    [...track.children].forEach((s,i)=>s.classList.toggle("active",i===state.memoryIndex));
  }

  function goMemory(i){
    state.memoryIndex=(i+memories.length)%memories.length;
    updateMemory();
  }

  $("memoryPrev").addEventListener("click",()=>goMemory(state.memoryIndex-1));
  $("memoryNext").addEventListener("click",()=>goMemory(state.memoryIndex+1));
  dotsWrap.addEventListener("click",e=>{const d=e.target.closest("[data-index]");if(d)goMemory(Number(d.dataset.index))});

  let sx=0,sy=0;
  $("memoryTrack").addEventListener("touchstart",e=>{sx=e.changedTouches[0].clientX;sy=e.changedTouches[0].clientY},{passive:true});
  $("memoryTrack").addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-sx;
    const dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy))goMemory(state.memoryIndex+(dx<0?1:-1));
  },{passive:true});

  $("journeyNext").addEventListener("click",()=>showScene("hug"));

  /* hug */
  const hugModal = $("hugModal");

  function openHug(){
    hugModal.classList.add("show");
    hugModal.setAttribute("aria-hidden","false");
    document.body.classList.add("hug-open");
  }

  function closeHug(){
    hugModal.classList.remove("show");
    hugModal.setAttribute("aria-hidden","true");
    document.body.classList.remove("hug-open");
  }

  $("hugVisual").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hug = $("hugVisual");
    hug.classList.remove("press-ripple");
    void hug.offsetWidth;
    hug.classList.add("press-ripple");
    openHug();
  });
  let hugPointerHandled = false;
  $("hugVisual").addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    hugPointerHandled = true;
    setTimeout(() => { hugPointerHandled = false; }, 450);
  });


  $("hugClose").addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    closeHug();
  });

  hugModal.addEventListener("click", e => {
    if(e.target === hugModal){
      closeHug();
    }
  });

  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && hugModal.classList.contains("show")){
      closeHug();
    }
  });

  $("hugNext").addEventListener("click",()=>{
    closeHug();
    showScene("candle");
  });

  /* candle */
  const flame = $("flame");
  const candleSmoke = $("candleSmoke");
  const wishModal = $("wishModal");
  const blow = $("blow");

  function resetCandle(){
    state.candleOut=false;
    clearTimeout(state.candleTimer);
    $("candle").classList.remove("smoke-burst");
    flame.classList.remove("out");
    candleSmoke.classList.remove("show");
    wishModal.classList.remove("show");
    wishModal.setAttribute("aria-hidden","true");
    blow.disabled=false;
    blow.textContent="Make the wish ✨";
  }

  blow.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if(state.candleOut)return;
    state.candleOut=true;
    blow.disabled=true;
    $("candle").classList.remove("smoke-burst");
    void $("candle").offsetWidth;
    $("candle").classList.add("smoke-burst");
    candleSmoke.classList.remove("show");
    void candleSmoke.offsetWidth;
    candleSmoke.classList.add("show");
    blow.textContent="Wish made ❤️";
    flame.classList.add("out");

    clearTimeout(state.candleTimer);
    state.candleTimer=setTimeout(()=>{
      wishModal.classList.add("show");
      wishModal.setAttribute("aria-hidden","false");

      state.candleTimer=setTimeout(()=>{
        wishModal.classList.remove("show");
        wishModal.setAttribute("aria-hidden","true");
        showScene("final");
      },2200);
    },550);
 
  });
  let candleTouchTime = 0;
  blow.addEventListener("touchend", (event) => {
    if (Date.now() - candleTouchTime < 500) return;
    candleTouchTime = Date.now();
    event.preventDefault();
    blow.click();
  }, {passive:false});


  /* celebrate / restart */
  $("celebrate").addEventListener("click",()=>burstParticles(42));
  $("restart").addEventListener("click",()=>{
    clearInterval(state.yesTimer);
    clearTimeout(state.candleTimer);

    state.yesTimer=null;
    state.candleTimer=null;
    state.passcode="";
    state.memoryIndex=0;
    state.candleOut=false;
    state.noMoves=0;

    renderPass();
    lockMessage.textContent="💛";
    $("passDots").classList.remove("shake");

    resetPlay();
    closeHug();
    yesOverlay.classList.remove("show");
    yesOverlay.setAttribute("aria-hidden","true");

    flame.classList.remove("out");
    candleSmoke.classList.remove("show");
    wishModal.classList.remove("show");
    wishModal.setAttribute("aria-hidden","true");
    blow.disabled=false;
    blow.textContent="Make the wish ✨";

    envelopeBtn.classList.remove("open");
    updateMemory();
    showScene("opening");
  });

  /* fx canvas */
  const fxCanvas = $("fxCanvas");
  const fx = fxCanvas.getContext("2d");
  let particles=[];

  function resizeFx(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    fxCanvas.width=innerWidth*dpr;
    fxCanvas.height=innerHeight*dpr;
    fxCanvas.style.width=`${innerWidth}px`;
    fxCanvas.style.height=`${innerHeight}px`;
    fx.setTransform(dpr,0,0,dpr,0,0);
  }
  resizeFx();
  addEventListener("resize",resizeFx);

  function burstParticles(amount=36){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const chars=["♡","✦","♡","✧","·"];
    for(let i=0;i<amount;i++){
      particles.push({
        x:innerWidth/2+(Math.random()-.5)*70,
        y:innerHeight*.34,
        vx:(Math.random()-.5)*5.5,
        vy:-Math.random()*5.2-1.8,
        size:10+Math.random()*10,
        char:chars[Math.floor(Math.random()*chars.length)],
        life:0,
        ttl:90+Math.random()*80
      });
    }
  }

  function animateFx(){
    fx.clearRect(0,0,innerWidth,innerHeight);
    particles.forEach(p=>{
      p.vy+=.045;p.x+=p.vx;p.y+=p.vy;p.life++;
      fx.globalAlpha=Math.max(0,1-p.life/p.ttl);
      fx.fillStyle="#d95f75";
      fx.font=`${p.size}px "DM Sans"`;
      fx.fillText(p.char,p.x,p.y);
    });
    fx.globalAlpha=1;
    particles=particles.filter(p=>p.life<p.ttl);
    requestAnimationFrame(animateFx);
  }

  /* initial */
  renderPass();
  updateMemory();
  animateFx();
})();
