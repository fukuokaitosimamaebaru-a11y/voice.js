/***********************
 * ちかまる最終完全体 *
 ***********************/

/* ===== CSS 内包 ===== */
const style = document.createElement("style");
style.textContent = `
body {
  margin:0;
  background:#0b1c2d;
  color:#fff;
  font-family: system-ui, sans-serif;
}
#app {
  text-align:center;
  padding:20px;
}
button {
  font-size:16px;
  padding:10px 16px;
  margin:6px;
  border:none;
  border-radius:8px;
  cursor:pointer;
}
.start { background:#2ecc71; }
.stop  { background:#e74c3c; }
.effect { background:#3498db; }
`;
document.head.appendChild(style);

/* ===== UI 自動生成 ===== */
const app = document.createElement("div");
app.id = "app";
app.innerHTML = `
  <h1>🚇 ちかまるアナウンス</h1>
  <button class="start">▶ 開始</button>
  <button class="stop">⏹ 停止</button><br>
  <button class="effect">ちかまる最終</button>
`;
document.body.appendChild(app);

/* ===== AudioWorklet（音程補正）内包 ===== */
const workletCode = `
class PitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: "pitch",
      defaultValue: 1.12, // +約1音
      minValue: 0.8,
      maxValue: 1.5
    }];
  }
  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input[0]) return true;
    const p = params.pitch[0];
    for (let ch = 0; ch < input.length; ch++) {
      for (let i = 0; i < input[ch].length; i++) {
        const idx = Math.floor(i * p) % input[ch].length;
        output[ch][i] = input[ch][idx];
      }
    }
    return true;
  }
}
registerProcessor("pitch-processor", PitchProcessor);
`;

/* ===== 音声処理 ===== */
let audioCtx, stream, source, pitchNode;

async function startMic() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioCtx = new AudioContext();

  // Worklet を1ファイル内から生成
  const blob = new Blob([workletCode], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  await audioCtx.audioWorklet.addModule(url);

  source = audioCtx.createMediaStreamSource(stream);
  pitchNode = new AudioWorkletNode(audioCtx, "pitch-processor");
  pitchNode.parameters.get("pitch").value = 1.12;

  alert("マイクを開始しました");
}

function stopMic() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
  alert("マイクを停止しました");
}

/* ===== ちかまる最終エフェクト ===== */
function chikamaruFinal() {
  // 低音カット
  const highPass = audioCtx.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 220;

  // 中音強調
  const mid = audioCtx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1800;
  mid.Q.value = 1;
  mid.gain.value = 6;

  // 高音を丸く
  const high = audioCtx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 3200;
  high.gain.value = 5;

  // 放送用コンプレッサ
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -35;
  comp.knee.value = 25;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.3;

  // オートゲイン
  const gain = audioCtx.createGain();
  gain.gain.value = 1.6;

  // 駅反響
  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.08;

  // 接続
  source.disconnect();
  source.connect(highPass);
  highPass.connect(pitchNode);
  pitchNode.connect(mid);
  mid.connect(high);
  high.connect(comp);
  comp.connect(gain);
  gain.connect(delay);
  delay.connect(audioCtx.destination);
}

/* ===== ボタン ===== */
document.querySelector(".start").onclick = startMic;
document.querySelector(".stop").onclick = stopMic;
document.querySelector(".effect").onclick = chikamaruFinal;
