
const steps = ["開始","キーボード","スピーカー","カメラ","マイク","液晶＋タッチ","タッチパッド / Wi-Fi","完了"];
let idx = 0;
let results = {};
let cameraStream = null;
let micStream = null;
let micCtx = null;
let cameraDevices = [];
let cameraIndex = 0;

function appRoot(){
  return document.getElementById("app");
}

function frame(content){
  appRoot().innerHTML = `
    <div class="card">
      <div class="header">
        <div>
          <h1>Chromebook Check v2.0</h1>
          <div class="sub">QRで起動 / ログなし / 実機テスト版</div>
        </div>
        <div class="pill">${idx === 0 ? "待機" : steps[idx]}</div>
      </div>
      <div class="progress-info">
        <span>Step ${Math.min(idx, steps.length - 1)}/${steps.length - 1}</span>
        <span>${steps[idx]}</span>
      </div>
      <div class="progress"><div class="bar" style="width:${(idx / (steps.length - 1)) * 100}%"></div></div>
      ${content}
    </div>
  `;
}

function render(){
  stopMedia();

  if(idx === 0){
    frame(`
      <div class="big">Chromebook Check</div>
      <div class="center sub">端末情報を確認してから検査を開始します。</div>
      <div class="grid">
        <div class="item"><div class="label">ChromeOS / ブラウザ</div><div class="value" id="specChrome">取得中...</div></div>
        <div class="item"><div class="label">画面解像度</div><div class="value" id="specResolution">取得中...</div></div>
        <div class="item"><div class="label">バッテリー</div><div class="value" id="specBattery">取得中...</div></div>
        <div class="item"><div class="label">充電状態</div><div class="value" id="specCharging">取得中...</div></div>
        <div class="item"><div class="label">ネットワーク</div><div class="value" id="specOnline">取得中...</div></div>
        <div class="item"><div class="label">ストレージ</div><div class="value">system解析推奨</div></div>
      </div>
      <details>
        <summary>chrome://system からCPU/メモリ/ストレージを解析</summary>
        <div class="note">
          1. 別タブで <strong>chrome://system</strong> を開く<br>
          2. <strong>cpuinfo / meminfo / storage_info</strong> を Expand<br>
          3. Ctrl+A → Ctrl+C<br>
          4. 下の欄へ貼り付け
        </div>
        <textarea id="systemPaste" placeholder="chrome://system の内容をここに貼り付け"></textarea>
        <div class="center"><button class="btn start" onclick="parseSystemInfo()">解析する</button></div>
        <div class="grid">
          <div class="item"><div class="label">CPU解析</div><div class="value" id="parsedCpu">未解析</div></div>
          <div class="item"><div class="label">メモリ解析</div><div class="value" id="parsedMem">未解析</div></div>
          <div class="item"><div class="label">ストレージ解析</div><div class="value" id="parsedStorage">未解析</div></div>
        </div>
      </details>
      <div class="actions"><button class="btn start" onclick="next()">▶ 検査開始</button></div>
    `);
    collectSpecs();
    return;
  }

  if(idx === 1){
    frame(`
      <h2>キーボード</h2>
      <div class="sub">標準診断を試し、開けなければ簡易検査を使います。</div>
      <div class="note">
        アドレスバーに <strong>chrome://diagnostics</strong> を入力して、キーボードテストを実施してください。<br>
        Webページから直接開けない場合があります。
      </div>
      <div class="diagnostic-url" onclick="copyDiagnosticsUrl()">chrome://diagnostics</div>
      <div class="actions">
        <button class="btn start" onclick="openDiagnostics()">▶ 標準診断を試す</button>
        <button class="btn start" onclick="showSimpleKeyboard()">▶ 簡易キーボード検査</button>
      </div>
      <div id="simpleKeyboardArea"></div>
      <div class="actions">
        <button class="btn ng" onclick="fail('キーボード')">❌ NG</button>
        <button class="btn ok" onclick="passStep('キーボード')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 2){
    frame(`
      <h2>スピーカー</h2>
      <div class="sub">左「ド・ソ・シ」→右「ド・ソ・シ」を短く再生します。</div>
      <div class="speaker-box">
        <div class="speaker" id="leftSpeaker"><h2>左</h2><div class="tone" id="leftTone">待機</div></div>
        <div class="speaker" id="rightSpeaker"><h2>右</h2><div class="tone" id="rightTone">待機</div></div>
      </div>
      <div class="center"><button class="btn start" onclick="playSpeakerTest()">▶ テスト開始</button></div>
      <div class="actions">
        <button class="btn ng" onclick="fail('スピーカー')">❌ NG</button>
        <button class="btn ok" onclick="passStep('スピーカー')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 3){
    frame(`
      <h2>カメラ</h2>
      <div class="sub">映像を確認します。複数カメラがある場合は切り替えます。</div>
      <div class="actions">
        <button class="btn start" onclick="startCamera()">▶ カメラ起動</button>
        <button class="btn start" onclick="switchCamera()">🔁 カメラ切替</button>
      </div>
      <div class="note" id="cameraInfo">カメラ未起動</div>
      <video id="cameraPreview" class="preview" autoplay playsinline muted></video>
      <div class="actions">
        <button class="btn ng" onclick="fail('カメラ')">❌ NG</button>
        <button class="btn ok" onclick="passStep('カメラ')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 4){
    frame(`
      <h2>マイク</h2>
      <div class="sub">声を出してメーターが反応するか確認します。</div>
      <div class="center"><button class="btn start" onclick="startMic()">▶ マイク起動</button></div>
      <div class="meter"><div class="meter-bar" id="micBar"></div></div>
      <div class="actions">
        <button class="btn ng" onclick="fail('マイク')">❌ NG</button>
        <button class="btn ok" onclick="passStep('マイク')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 5){
    frame(`
      <h2>液晶＋タッチパネル</h2>
      <div class="sub">全画面で色確認後、そのまま5か所タッチ検査へ進みます。</div>
      <div class="center"><button class="btn start" onclick="startLcdTouch()">▶ 全画面で開始</button></div>
      <div class="actions">
        <button class="btn ng" onclick="fail('液晶＋タッチパネル')">❌ NG</button>
        <button class="btn ok" onclick="passStep('液晶＋タッチパネル')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 6){
    frame(`
      <h2>タッチパッド / Wi-Fi</h2>
      <div class="sub">カーソルを丸まで動かし、Wi-Fi状態を確認します。</div>
      <div class="note">Wi-Fi状態: <strong>${navigator.onLine ? "接続中" : "未接続"}</strong></div>
      <div class="target-area" onmousemove="checkPointer(event)">
        <div class="target" id="target">○</div>
      </div>
      <div class="actions">
        <button class="btn ng" onclick="fail('タッチパッド / Wi-Fi')">❌ NG</button>
        <button class="btn ok" onclick="passStep('タッチパッド / Wi-Fi')">✅ OK</button>
      </div>
    `);
    return;
  }

  if(idx === 7){
    const hasFail = Object.values(results).includes("NG");
    const items = Object.entries(results).map(([k,v]) => `
      <div class="item"><div class="label">${k}</div><div class="value ${v === "OK" ? "pass" : "fail"}">${v}</div></div>
    `).join("");
    frame(`
      <div class="big ${hasFail ? "fail" : "pass"}">${hasFail ? "❌ FAIL" : "🎉 PASS"}</div>
      <div class="center sub">${hasFail ? "NGの項目があります" : "検査完了"}</div>
      <div class="grid">${items}</div>
      <div class="actions"><button class="btn start" onclick="location.reload()">次の端末</button></div>
    `);
  }
}

function next(){ idx++; render(); }
function passStep(name){ results[name] = "OK"; next(); }
function fail(name){
  stopMedia();
  results[name] = "NG";
  appRoot().innerHTML = `
    <div class="card">
      <div class="big fail">❌ FAIL</div>
      <div class="center sub">${name} でNG判定</div>
      <div class="actions"><button class="btn start" onclick="location.reload()">次の端末</button></div>
    </div>
  `;
}

async function collectSpecs(){
  const ua = navigator.userAgent || "";
  const m = ua.match(/CrOS\s+([^\s]+)\s+([0-9.]+)/);
  document.getElementById("specChrome").textContent = m ? `ChromeOS ${m[2]}` : "取得不可";
  document.getElementById("specResolution").textContent = `${screen.width} × ${screen.height} / DPR ${window.devicePixelRatio || 1}`;
  document.getElementById("specOnline").textContent = navigator.onLine ? "接続中" : "未接続";

  if("getBattery" in navigator){
    try{
      const b = await navigator.getBattery();
      document.getElementById("specBattery").textContent = `${Math.round(b.level * 100)}%`;
      document.getElementById("specCharging").textContent = b.charging ? "充電中" : "未充電";
    }catch(e){
      document.getElementById("specBattery").textContent = "取得不可";
      document.getElementById("specCharging").textContent = "取得不可";
    }
  }else{
    document.getElementById("specBattery").textContent = "非対応";
    document.getElementById("specCharging").textContent = "非対応";
  }
}

function parseSystemInfo(){
  const text = document.getElementById("systemPaste")?.value || "";

  const cpuMatch = text.match(/model name\s*:\s*(.+)/i);
  let cpu = cpuMatch ? cpuMatch[1].trim() : "未検出";
  cpu = cpu
    .replace(/Intel\(R\)/g,"Intel")
    .replace(/Celeron\(R\)/g,"Celeron")
    .replace(/\s*CPU\s*@.+$/i,"")
    .replace(/\s+/g," ")
    .trim();
  document.getElementById("parsedCpu").textContent = cpu || "未検出";

  const memMatch = text.match(/MemTotal:\s*([0-9]+)\s*kB/i);
  let mem = "未検出";
  if(memMatch){
    const gb = Number(memMatch[1]) / 1024 / 1024;
    if(gb < 3) mem = "2GB";
    else if(gb < 6) mem = "4GB";
    else if(gb < 12) mem = "8GB";
    else if(gb < 24) mem = "16GB";
    else mem = `${Math.round(gb)}GB`;
  }
  document.getElementById("parsedMem").textContent = mem;

  let storage = "未検出";
  const secMatch = text.match(/(?:sec_count|sector\s*count|"sectors"|rel_sectors)\s*[:|"]\s*([0-9]+)/i);
  if(secMatch){
    const gb = Number(secMatch[1]) * 512 / (1000 ** 3);
    storage = normalizeStorage(gb);
  }else{
    const nameMatch = text.match(/name\s*\|\s*([A-Za-z0-9_-]+)/i) || text.match(/name\s*:\s*([A-Za-z0-9_-]+)/i);
    if(nameMatch) storage = `型番: ${nameMatch[1].trim()}`;
  }
  document.getElementById("parsedStorage").textContent = storage;
}

function normalizeStorage(gb){
  if(gb < 24) return "16GB";
  if(gb < 48) return "32GB";
  if(gb < 96) return "64GB";
  if(gb < 192) return "128GB";
  if(gb < 384) return "256GB";
  return `${Math.round(gb)}GB`;
}

function openDiagnostics(){
  alert("アドレスバーに chrome://diagnostics と入力してキーボードテストを実施してください");
}

async function copyDiagnosticsUrl(){
  try{
    await navigator.clipboard.writeText("chrome://diagnostics");
    alert("chrome://diagnostics をコピーしました");
  }catch(e){
    alert("アドレスバーに chrome://diagnostics と入力してください");
  }
}

const simpleRows = [
  "Q W E R T Y U I O P".split(" "),
  "A S D F G H J K L".split(" "),
  "Z X C V B N M".split(" "),
  ["Space","Enter","Backspace","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]
];

function showSimpleKeyboard(){
  const area = document.getElementById("simpleKeyboardArea");
  area.innerHTML = `<div class="note">簡易検査：表示されたキーを押すと緑になります。最後にOKを押してください。</div><div class="simple-kb" id="simpleKb"></div>`;
  const kb = document.getElementById("simpleKb");
  simpleRows.forEach(row => {
    const r = document.createElement("div");
    r.className = "simple-row";
    row.forEach(k => {
      const d = document.createElement("div");
      d.className = "simple-key";
      d.id = `key-${k}`;
      d.textContent = k.replace("ArrowLeft","←").replace("ArrowRight","→").replace("ArrowUp","↑").replace("ArrowDown","↓");
      r.appendChild(d);
    });
    kb.appendChild(r);
  });
}

document.addEventListener("keydown", e => {
  if(idx !== 1) return;
  let k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if(e.code === "Space") k = "Space";
  const el = document.getElementById(`key-${k}`);
  if(el){
    el.classList.add("done");
    e.preventDefault();
  }
});

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

async function playTone(freq, pan, label, side){
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.value = 0.40;

  if(panner){
    panner.pan.value = pan;
    osc.connect(gain).connect(panner).connect(ctx.destination);
  }else{
    osc.connect(gain).connect(ctx.destination);
  }

  document.getElementById(`${side}Tone`).textContent = label;
  document.getElementById(`${side}Speaker`).classList.add("active");
  osc.start();
  await wait(280);
  osc.stop();
  ctx.close();
  document.getElementById(`${side}Speaker`).classList.remove("active");
}

async function playSpeakerTest(){
  const notes = [[261.63,"ド"],[392,"ソ"],[493.88,"シ"]];
  document.getElementById("leftTone").textContent = "待機";
  document.getElementById("rightTone").textContent = "待機";

  const btn = document.querySelector("button[onclick='playSpeakerTest()']");
  if(btn) btn.disabled = true;

  for(const [f,l] of notes){
    await playTone(f, -1, l, "left");
    await wait(80);
  }
  document.getElementById("leftTone").textContent = "完了";
  await wait(150);
  for(const [f,l] of notes){
    await playTone(f, 1, l, "right");
    await wait(80);
  }
  document.getElementById("rightTone").textContent = "完了";

  if(btn) btn.disabled = false;
}

async function refreshCameraDevices(){
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices = devices.filter(d => d.kind === "videoinput");
  }catch(e){
    cameraDevices = [];
  }
}

async function startCamera(deviceId=null){
  try{
    stopMedia();
    await refreshCameraDevices();
    const constraints = { video: deviceId ? { deviceId:{exact:deviceId} } : true, audio:false };
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById("cameraPreview");
    video.srcObject = cameraStream;
    video.style.display = "block";
    await refreshCameraDevices();
    const info = document.getElementById("cameraInfo");
    const label = cameraDevices[cameraIndex]?.label || `カメラ ${cameraIndex+1}`;
    info.textContent = `使用中: ${label} / 検出数: ${cameraDevices.length || "不明"}`;
  }catch(e){
    alert("カメラを起動できません: " + e.message);
  }
}

async function switchCamera(){
  if(!cameraStream){
    await startCamera();
    return;
  }
  await refreshCameraDevices();
  if(cameraDevices.length <= 1){
    alert("切替可能なカメラが見つかりません");
    return;
  }
  cameraIndex = (cameraIndex + 1) % cameraDevices.length;
  await startCamera(cameraDevices[cameraIndex].deviceId);
}

async function startMic(){
  try{
    micStream = await navigator.mediaDevices.getUserMedia({audio:true, video:false});
    const AC = window.AudioContext || window.webkitAudioContext;
    micCtx = new AC();
    const source = micCtx.createMediaStreamSource(micStream);
    const analyser = micCtx.createAnalyser();
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    function loop(){
      if(idx !== 4) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a,b) => a+b, 0) / data.length;
      const bar = document.getElementById("micBar");
      if(bar) bar.style.width = Math.min(100, avg * 2) + "%";
      requestAnimationFrame(loop);
    }
    loop();
  }catch(e){
    alert("マイクを起動できません: " + e.message);
  }
}

function stopMedia(){
  if(cameraStream){
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if(micStream){
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if(micCtx){
    micCtx.close();
    micCtx = null;
  }
}

async function requestFS(el){
  try{
    if(el.requestFullscreen) await el.requestFullscreen();
    else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  }catch(e){}
}

async function exitFS(){
  try{
    if(document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    else if(document.webkitFullscreenElement && document.webkitExitFullscreen) await document.webkitExitFullscreen();
  }catch(e){}
}

let lcdMode = "color";
let lcdIndex = 0;
let touched = new Set();
const colors = [
  ["WHITE","white","black"],
  ["BLACK","black","white"],
  ["RED","red","white"],
  ["GREEN","lime","black"],
  ["BLUE","blue","white"]
];

function startLcdTouch(){
  let fs = document.getElementById("fs");
  if(!fs){
    fs = document.createElement("div");
    fs.id = "fs";
    fs.className = "fullscreen";
    fs.innerHTML = `
      <div class="fs-top">
        <div class="fs-title" id="fsTitle">液晶色テスト</div>
        <button class="btn ng" onclick="closeFs(event)">閉じる</button>
      </div>
      <div class="fs-body" id="fsBody">WHITE</div>
    `;
    document.body.appendChild(fs);
    fs.addEventListener("click", advanceLcd);
  }
  lcdMode = "color";
  lcdIndex = 0;
  touched = new Set();
  fs.classList.add("show");
  renderLcd();
  requestFS(fs);
}

function renderLcd(){
  const fs = document.getElementById("fs");
  const title = document.getElementById("fsTitle");
  const body = document.getElementById("fsBody");

  if(lcdMode === "color"){
    const [name,bg,fg] = colors[lcdIndex];
    fs.style.background = bg;
    fs.style.color = fg;
    title.textContent = "液晶色テスト";
    body.className = "fs-body";
    body.textContent = name;
  }else{
    fs.style.background = "#020617";
    fs.style.color = "white";
    title.textContent = "タッチパネル検査：5か所タッチ";
    body.className = "";
    body.innerHTML = `
      <div class="touch-dot tl" data-touch="tl">左上</div>
      <div class="touch-dot tr" data-touch="tr">右上</div>
      <div class="touch-dot c" data-touch="c">中央</div>
      <div class="touch-dot bl" data-touch="bl">左下</div>
      <div class="touch-dot br" data-touch="br">右下</div>
    `;
    body.querySelectorAll("[data-touch]").forEach(dot => {
      dot.onpointerdown = e => markTouch(e, dot);
      dot.ontouchstart = e => markTouch(e, dot);
    });
  }
}

function advanceLcd(e){
  if(e.target.classList.contains("ng") || e.target.dataset.touch) return;
  if(lcdMode !== "color") return;

  lcdIndex++;
  if(lcdIndex >= colors.length){
    lcdMode = "touch";
  }
  renderLcd();
}

function markTouch(e, dot){
  e.preventDefault();
  dot.classList.add("hit");
  touched.add(dot.dataset.touch);
  if(touched.size === 5 && lcdMode === "touch"){
    results["液晶＋タッチパネル"] = "OK";
    setTimeout(() => {
      closeFs();
      next();
    }, 500);
  }
}

function closeFs(e){
  if(e) e.stopPropagation();
  document.getElementById("fs")?.classList.remove("show");
  exitFS();
}

function checkPointer(e){
  const target = document.getElementById("target");
  if(!target) return;
  const r = target.getBoundingClientRect();
  if(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom){
    target.classList.add("hit");
    target.textContent = "OK";
  }
}

render();
