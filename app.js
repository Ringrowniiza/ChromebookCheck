const steps = ["開始","キーボード","スピーカー","カメラ","マイク","液晶","タッチパネル","タッチパッド / Wi-Fi","完了"];
let idx = 0;
let results = {};
let cameraStream = null;
let micStream = null;
let audioCtxForMic = null;

const keyboardRows = [
  [{id:"Escape",label:"Esc",cls:"special"},{id:"BrowserBack",label:"戻る",cls:"special"},{id:"BrowserForward",label:"進む",cls:"special"},{id:"BrowserRefresh",label:"更新",cls:"special"},{id:"F4",label:"全画面",cls:"special"},{id:"F5",label:"概要",cls:"special"},{id:"BrightnessDown",label:"明るさ-",cls:"special"},{id:"BrightnessUp",label:"明るさ+",cls:"special"},{id:"AudioVolumeMute",label:"消音",cls:"special"},{id:"AudioVolumeDown",label:"音量-",cls:"special"},{id:"AudioVolumeUp",label:"音量+",cls:"special"}],
  [{id:"Backquote",label:"`"},{id:"Digit1",label:"1"},{id:"Digit2",label:"2"},{id:"Digit3",label:"3"},{id:"Digit4",label:"4"},{id:"Digit5",label:"5"},{id:"Digit6",label:"6"},{id:"Digit7",label:"7"},{id:"Digit8",label:"8"},{id:"Digit9",label:"9"},{id:"Digit0",label:"0"},{id:"Minus",label:"-"},{id:"Equal",label:"="},{id:"Backspace",label:"Back",cls:"wide"}],
  [{id:"Tab",label:"Tab",cls:"wide"},{id:"KeyQ",label:"Q"},{id:"KeyW",label:"W"},{id:"KeyE",label:"E"},{id:"KeyR",label:"R"},{id:"KeyT",label:"T"},{id:"KeyY",label:"Y"},{id:"KeyU",label:"U"},{id:"KeyI",label:"I"},{id:"KeyO",label:"O"},{id:"KeyP",label:"P"},{id:"BracketLeft",label:"["},{id:"BracketRight",label:"]"},{id:"Backslash",label:"\\"}],
  [{id:"CapsLock",label:"Search",cls:"wide special"},{id:"KeyA",label:"A"},{id:"KeyS",label:"S"},{id:"KeyD",label:"D"},{id:"KeyF",label:"F"},{id:"KeyG",label:"G"},{id:"KeyH",label:"H"},{id:"KeyJ",label:"J"},{id:"KeyK",label:"K"},{id:"KeyL",label:"L"},{id:"Semicolon",label:";"},{id:"Quote",label:"'"},{id:"Enter",label:"Enter",cls:"xwide"}],
  [{id:"ShiftLeft",label:"Shift",cls:"xwide"},{id:"KeyZ",label:"Z"},{id:"KeyX",label:"X"},{id:"KeyC",label:"C"},{id:"KeyV",label:"V"},{id:"KeyB",label:"B"},{id:"KeyN",label:"N"},{id:"KeyM",label:"M"},{id:"Comma",label:","},{id:"Period",label:"."},{id:"Slash",label:"/"},{id:"ShiftRight",label:"Shift",cls:"xwide"}],
  [{id:"ControlLeft",label:"Ctrl",cls:"wide"},{id:"MetaLeft",label:"検索",cls:"wide special"},{id:"AltLeft",label:"Alt",cls:"wide"},{id:"Space",label:"Space",cls:"space"},{id:"AltRight",label:"Alt",cls:"wide"},{id:"ControlRight",label:"Ctrl",cls:"wide"},{id:"ArrowLeft",label:"←",cls:"special"},{id:"ArrowUp",label:"↑",cls:"special"},{id:"ArrowDown",label:"↓",cls:"special"},{id:"ArrowRight",label:"→",cls:"special"}]
];
const requiredKeys = keyboardRows.flat().map(k => k.id);
const pressed = new Set();

function updateFrame(){
  document.getElementById("stepText").textContent = `Step ${Math.min(idx,steps.length-1)}/${steps.length-1}`;
  document.getElementById("stepName").textContent = steps[idx];
  document.getElementById("bar").style.width = `${(idx/(steps.length-1))*100}%`;
  document.getElementById("statusPill").textContent = idx === 0 ? "待機" : steps[idx];
}
function render(){
  stopMedia();
  updateFrame();
  const c = document.getElementById("content");

  if(idx===0){
    c.innerHTML = `<div class="center"><div class="big">Chromebook Check</div><p class="sub">画面の指示に従って、OK / NG を選ぶだけ。</p><button class="btn start" onclick="next()">▶ START</button></div>`;
    return;
  }
  if(idx===1){
    c.innerHTML = `<div class="keyboard-head"><div><h2>キーボード</h2><div class="sub">押したキーが緑になります。全部緑になったら自動で次へ。</div></div><div class="counter" id="keyCounter">残り ${requiredKeys.length}</div></div><input id="keyInput" autofocus><div class="keyboard" id="keyboard"></div><div class="note">※ 上段キーはChromeOS仕様で拾えない場合があります。拾えない時は「OK」で進めます。</div><div class="actions"><button class="btn ng" onclick="fail('キーボード')">❌ NG</button><button class="btn ok" onclick="passStep('キーボード')">✅ OK</button></div>`;
    drawKeyboard(); setTimeout(()=>document.getElementById("keyInput")?.focus(),100); return;
  }
  if(idx===2){
    c.innerHTML = `<h2>スピーカー</h2><div class="sub">左「ド・ソ・シ」→右「ド・ソ・シ」を自動再生します。</div><div class="speaker-box"><div class="speaker" id="leftSpeaker"><h2>左</h2><div class="tone" id="leftTone">待機</div></div><div class="speaker" id="rightSpeaker"><h2>右</h2><div class="tone" id="rightTone">待機</div></div></div><div class="center"><button class="btn start" onclick="playSpeakerTest()">▶ テスト開始</button></div><div class="actions"><button class="btn ng" onclick="fail('スピーカー')">❌ NG</button><button class="btn ok" onclick="passStep('スピーカー')">✅ OK</button></div>`;
    return;
  }
  if(idx===3){
    c.innerHTML = `<h2>カメラ</h2><div class="sub">カメラ映像が映るか確認します。</div><button class="btn start" onclick="startCamera()">▶ カメラ起動</button><video id="cameraPreview" class="preview" autoplay playsinline muted></video><div class="actions"><button class="btn ng" onclick="fail('カメラ')">❌ NG</button><button class="btn ok" onclick="passStep('カメラ')">✅ OK</button></div>`;
    return;
  }
  if(idx===4){
    c.innerHTML = `<h2>マイク</h2><div class="sub">声を出して、メーターが反応するか確認します。</div><button class="btn start" onclick="startMic()">▶ マイク起動</button><div class="meter"><div class="meter-bar" id="micBar"></div></div><div class="actions"><button class="btn ng" onclick="fail('マイク')">❌ NG</button><button class="btn ok" onclick="passStep('マイク')">✅ OK</button></div>`;
    return;
  }
  if(idx===5){
    c.innerHTML = `<h2>液晶</h2><div class="sub">白→黒→赤→緑→青を全画面で確認します。画面タップで次の色。</div><div class="center"><button class="btn start" onclick="showColor()">▶ 色テスト開始</button></div><div class="actions"><button class="btn ng" onclick="fail('液晶')">❌ NG</button><button class="btn ok" onclick="passStep('液晶')">✅ OK</button></div>`;
    return;
  }
  if(idx===6){
    c.innerHTML = `<h2>タッチパネル</h2><div class="sub">画面の5か所を指でタッチします。全部緑になったら自動で次へ。</div><div class="touch-screen" id="touchScreen"><div class="touch-dot" data-touch="tl">左上</div><div class="touch-dot" data-touch="tr">右上</div><div class="touch-dot" data-touch="c">中央</div><div class="touch-dot" data-touch="bl">左下</div><div class="touch-dot" data-touch="br">右下</div></div><div class="note">※ マウスクリックでも反応しますが、実機検査では必ず指でタッチしてください。</div><div class="actions"><button class="btn ng" onclick="fail('タッチパネル')">❌ NG</button><button class="btn ok" onclick="passStep('タッチパネル')">✅ OK</button></div>`;
    setTimeout(setupTouchPanel,100);
    return;
  }
  if(idx===7){
    c.innerHTML = `<h2>タッチパッド / Wi-Fi</h2><div class="sub">カーソルを丸まで動かし、Wi-Fi接続状態も確認します。</div><div class="note">Wi-Fi状態: <strong>${navigator.onLine ? "接続中" : "未接続"}</strong></div><div class="target-area" onmousemove="checkPointer(event)"><div class="target" id="target">○</div></div><div class="actions"><button class="btn ng" onclick="fail('タッチパッド / Wi-Fi')">❌ NG</button><button class="btn ok" onclick="passStep('タッチパッド / Wi-Fi')">✅ OK</button></div>`;
    return;
  }
  if(idx===8){
    const items = Object.entries(results).map(([k,v])=>`<div class="result-item"><strong>${k}</strong><span class="${v==='OK'?'pass':'fail'}">${v}</span></div>`).join("");
    c.innerHTML = `<div class="center"><div class="big pass">🎉 PASS</div><p class="sub">検査完了</p></div><div class="result-grid">${items}</div><div class="actions"><button class="btn start" onclick="location.reload()">次の端末</button></div>`;
  }
}
function next(){idx++;render();}
function passStep(name){results[name]="OK";next();}
function fail(name){stopMedia();results[name]="NG";document.getElementById("bar").style.width="100%";document.getElementById("statusPill").textContent="FAIL";document.getElementById("content").innerHTML=`<div class="center"><div class="big fail">❌ FAIL</div><p class="sub">${name} でNG判定</p><button class="btn start" onclick="location.reload()">次の端末</button></div>`;}

function drawKeyboard(){
  const kb=document.getElementById("keyboard"); kb.innerHTML="";
  keyboardRows.forEach(row=>{const r=document.createElement("div");r.className="row";row.forEach(k=>{const d=document.createElement("div");d.className=`key ${k.cls||""}`;d.id=`key-${k.id}`;d.textContent=k.label;if(pressed.has(k.id))d.classList.add("done");r.appendChild(d);});kb.appendChild(r);});
  updateKeyCounter();
}
function updateKeyCounter(){
  const remain=requiredKeys.filter(k=>!pressed.has(k)).length;
  const counter=document.getElementById("keyCounter");
  if(counter){counter.textContent=remain===0?"COMPLETE":`残り ${remain}`;counter.classList.toggle("complete",remain===0);}
  if(remain===0 && idx===1){results["キーボード"]="OK";setTimeout(next,600);}
}
document.addEventListener("keydown",e=>{
  if(idx!==1)return;
  if(["Tab","Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Backspace"].includes(e.code)||e.key===" ")e.preventDefault();
  let code=e.code; if(e.key==="Meta")code="MetaLeft";
  if(requiredKeys.includes(code)){pressed.add(code);document.getElementById(`key-${code}`)?.classList.add("done");updateKeyCounter();}
});

function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function playTone(freq, pan, label, side){
  const AudioCtx=window.AudioContext||window.webkitAudioContext; const ctx=new AudioCtx();
  const osc=ctx.createOscillator(); const gain=ctx.createGain(); const panner=ctx.createStereoPanner?ctx.createStereoPanner():null;
  osc.frequency.value=freq; osc.type="sine"; gain.gain.value=0.12;
  if(panner){panner.pan.value=pan;osc.connect(gain).connect(panner).connect(ctx.destination);}else{osc.connect(gain).connect(ctx.destination);}
  document.getElementById(side+"Tone").textContent=label; document.getElementById(side+"Speaker").classList.add("active");
  osc.start(); await wait(420); osc.stop(); ctx.close(); document.getElementById(side+"Speaker").classList.remove("active");
}
async function playSpeakerTest(){
  document.getElementById("leftTone").textContent="待機";document.getElementById("rightTone").textContent="待機";
  const notes=[[261.63,"ド"],[392.00,"ソ"],[493.88,"シ"]];
  for(const [f,l] of notes){await playTone(f,-1,l,"left");await wait(120);}
  document.getElementById("leftTone").textContent="完了";await wait(250);
  for(const [f,l] of notes){await playTone(f,1,l,"right");await wait(120);}
  document.getElementById("rightTone").textContent="完了";
}
async function startCamera(){
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    const v=document.getElementById("cameraPreview"); v.srcObject=cameraStream; v.style.display="block";
  }catch(e){alert("カメラを起動できません: "+e.message);}
}
async function startMic(){
  try{
    micStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const AudioCtx=window.AudioContext||window.webkitAudioContext; audioCtxForMic=new AudioCtx();
    const source=audioCtxForMic.createMediaStreamSource(micStream); const analyser=audioCtxForMic.createAnalyser(); source.connect(analyser);
    const data=new Uint8Array(analyser.frequencyBinCount);
    function loop(){if(idx!==4)return; analyser.getByteFrequencyData(data); const avg=data.reduce((a,b)=>a+b,0)/data.length; const bar=document.getElementById("micBar"); if(bar)bar.style.width=Math.min(100,avg*2)+"%"; requestAnimationFrame(loop);}
    loop();
  }catch(e){alert("マイクを起動できません: "+e.message);}
}
function stopMedia(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}
  if(audioCtxForMic){audioCtxForMic.close();audioCtxForMic=null;}
}
const colors=[["WHITE","white","black"],["BLACK","black","white"],["RED","red","white"],["GREEN","lime","black"],["BLUE","blue","white"]];
let colorIndex=0;
function showColor(){colorIndex=0;renderColor();}
function renderColor(){const scr=document.getElementById("colorScreen");const label=document.getElementById("colorLabel");const [name,bg,fg]=colors[colorIndex];scr.classList.add("show");scr.style.background=bg;scr.style.color=fg;label.textContent=name;}
document.getElementById("colorScreen").addEventListener("click",()=>{colorIndex++;if(colorIndex>=colors.length){document.getElementById("colorScreen").classList.remove("show");}else{renderColor();}});
function closeColor(e){e.stopPropagation();document.getElementById("colorScreen").classList.remove("show");}
function checkPointer(e){
  const target=document.getElementById("target"); if(!target)return;
  const r=target.getBoundingClientRect();
  if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom){target.classList.add("hit");target.textContent="OK";}
}

function setupTouchPanel(){
  const touched = new Set();
  document.querySelectorAll("[data-touch]").forEach(dot=>{
    const mark = (e)=>{
      e.preventDefault();
      dot.classList.add("hit");
      touched.add(dot.dataset.touch);
      if(touched.size === 5 && idx === 6){
        results["タッチパネル"] = "OK";
        setTimeout(next, 500);
      }
    };
    dot.addEventListener("touchstart", mark, {passive:false});
    dot.addEventListener("pointerdown", mark);
    dot.addEventListener("click", mark);
  });
}

render();