const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");
const axios = require("axios");
const ffmpegPath = require("ffmpeg-static");
const googleTTS = require("google-tts-api");

const mediaRoot = path.join(__dirname, "..", "media");
const videoDir = path.join(mediaRoot, "videos");
const tempDir = path.join(mediaRoot, "temp");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const splitIntoChunks = (text, maxLen = 180) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const sanitizeText = (value) => {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^a-zA-Z0-9.,:;!?()\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const escapeDrawText = (value) => {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%");
};

const runFfmpeg = (args) => {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary not available"));
      return;
    }

    const process = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";

    process.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
      }
    });
  });
};

const parseDuration = (timeText, fallback) => {
  const match = String(timeText || "").match(/(\d+)\s*-\s*(\d+)\s*s/i);
  if (!match) {
    return fallback;
  }

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  const duration = end - start;
  return duration > 0 ? duration : fallback;
};

const classifySceneType = (text = "", index = 0) => {
  const probe = String(text).toLowerCase();
  if (index === 0 || /headline|breaking|market open|top story/.test(probe)) {
    return "headline";
  }
  if (/context|policy|regulation|global|because|drivers?/.test(probe)) {
    return "context";
  }
  if (/risk|hold|buy|avoid|decision|action|volatil/.test(probe)) {
    return "decision";
  }
  return "insight";
};

const sentenceSplit = (text = "") => {
  return String(text || "")
    .split(/[.!?]+/)
    .map((item) => sanitizeText(item))
    .filter(Boolean);
};

const buildScenes = (script, durationSec) => {
  const rawPlan = Array.isArray(script.visual_plan) ? script.visual_plan : [];
  const overlays = Array.isArray(script?.overlays) ? script.overlays.join(" ") : "";
  const inferredRisk = /high risk|avoid|sharp downside|volatile/i.test(overlays)
    ? "HIGH RISK"
    : /low risk|stable|defensive/i.test(overlays)
      ? "LOW RISK"
      : "MEDIUM RISK";

  if (rawPlan.length === 0) {
    const fallbackLines = sentenceSplit(script.voiceover_script || script.title || "Business update").slice(0, 6);
    const fallbackDuration = Math.max(6, Math.floor(durationSec / Math.max(fallbackLines.length, 1)));
    return [
      ...fallbackLines.map((line, index) => ({
        id: `scene-${index + 1}`,
        order: index,
        duration: fallbackDuration,
        type: classifySceneType(line, index),
        text: sanitizeText(line),
        context: "Live market brief",
        animation: "cinematic motion",
        riskLabel: inferredRisk
      }))
    ];
  }

  const fallbackDuration = Math.max(8, Math.floor(durationSec / rawPlan.length));

  return rawPlan.map((scene, index) => {
    const descriptor = [scene.scene, scene.animation].filter(Boolean).join(" - ");
    const text = sanitizeText(scene.scene || descriptor || script.title || "Business update");
    return {
      id: `scene-${index + 1}`,
      order: index,
      duration: parseDuration(scene.time, fallbackDuration),
      type: classifySceneType(descriptor || text, index),
      text,
      context: sanitizeText(scene.animation || "Market context"),
      animation: sanitizeText(scene.animation || "cinematic motion"),
      riskLabel: inferredRisk
    };
  });
};

const pickPalette = (type = "insight") => {
  const palettes = {
    headline: { bg: "#0d2038", accent: "#44c6ff", chart: "#44c6ff", badge: "#e53935" },
    context: { bg: "#2a1a13", accent: "#ffb74d", chart: "#ffb74d", badge: "#ff9800" },
    insight: { bg: "#12241a", accent: "#7bd88f", chart: "#7bd88f", badge: "#43a047" },
    decision: { bg: "#2a1111", accent: "#ff8a80", chart: "#ff8a80", badge: "#d32f2f" }
  };

  return palettes[type] || palettes.insight;
};

const createClassicSceneClip = async ({ scene, clipPath, showSubtitles, escapedFontPath }) => {
  const palette = pickPalette(scene.type);
  const drawHeadline = escapeDrawText(scene.text.slice(0, 140));
  const drawContext = escapeDrawText(scene.context.slice(0, 120));
  const riskText = escapeDrawText(scene.riskLabel || "MEDIUM RISK");
  const sceneDuration = Math.max(2, Number(scene.duration) || 3);

  const fadeExpr = `if(lt(t,0.45),t/0.45,if(lt(t,${Math.max(sceneDuration - 0.45, 0.8).toFixed(2)}),1,max((${sceneDuration.toFixed(2)}-t)/0.45,0)))`;
  const subtitleFilter = showSubtitles
    ? `drawtext=fontfile=${escapedFontPath}:text='${drawHeadline}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-text_h-76:box=1:boxcolor=black@0.45:boxborderw=10:alpha='${fadeExpr}'`
    : `drawtext=fontfile=${escapedFontPath}:text='${drawHeadline}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2-26:box=1:boxcolor=black@0.24:boxborderw=16:alpha='${fadeExpr}'`;

  const contextFilter = `drawtext=fontfile=${escapedFontPath}:text='${drawContext}':fontcolor=white@0.9:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+46:alpha='${fadeExpr}'`;
  const riskBadge = `drawbox=x=28:y=24:w=228:h=50:color=${palette.badge}@0.9:t=fill,drawtext=fontfile=${escapedFontPath}:text='${riskText}':fontcolor=white:fontsize=24:x=42:y=36`;
  const sceneTag = `drawbox=x=w-230:y=24:w=198:h=50:color=black@0.45:t=fill,drawtext=fontfile=${escapedFontPath}:text='${String(scene.type || "insight").toUpperCase()}':fontcolor=white:fontsize=24:x=w-206:y=36`;
  const chartTrack = `drawbox=x=70:y=ih-110:w=iw-140:h=52:color=black@0.28:t=fill`;
  const chartPulse = `drawbox=x='70+mod(t*220,iw-240)':y=ih-96:w=170:h=24:color=${palette.chart}@0.65:t=fill`;
  const accentBars = `drawbox=x=0:y=0:w=iw:h=18:color=${palette.accent}@0.95:t=fill,drawbox=x=0:y=ih-18:w=iw:h=18:color=${palette.accent}@0.95:t=fill`;
  const colorFilter = `color=c=${palette.bg}:s=1280x720:d=${sceneDuration}`;
  const vf = `${accentBars},${chartTrack},${chartPulse},${riskBadge},${sceneTag},${subtitleFilter},${contextFilter}`;

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    colorFilter,
    "-vf",
    vf,
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    clipPath
  ];

  await runFfmpeg(args);
};

const createNarrationAudio = async ({ text, audioPath, tempWorkDir, language = "en" }) => {
  const cleaned = sanitizeText(text);
  const chunks = splitIntoChunks(cleaned, 180).slice(0, 20);

  if (chunks.length === 0) {
    throw new Error("No narration text available");
  }

  const partPaths = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const partPath = path.join(tempWorkDir, `voice-part-${i}.mp3`);
    const audioUrl = googleTTS.getAudioUrl(chunks[i], {
      lang: language,
      slow: false,
      host: "https://translate.google.com"
    });

    const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(partPath, Buffer.from(response.data));
    partPaths.push(partPath);
  }

  if (partPaths.length === 1) {
    fs.copyFileSync(partPaths[0], audioPath);
    return;
  }

  const concatListPath = path.join(tempWorkDir, "voice-concat.txt");
  const concatContent = partPaths.map((filePath) => `file '${filePath.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatContent);

  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c",
    "copy",
    audioPath
  ]);
};

const mergeAudioVideo = async ({ videoPath, audioPath, outputPath }) => {
  const args = [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputPath
  ];

  await runFfmpeg(args);
};

const muxSceneAudio = async ({ videoPath, audioPath, outputPath, durationSec }) => {
  const args = [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-filter_complex",
    "[1:a]apad[a]",
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-t",
    String(Math.max(1, durationSec)),
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    outputPath
  ];

  await runFfmpeg(args);
};

const muxSilentSceneAudio = async ({ videoPath, outputPath, durationSec }) => {
  const args = [
    "-y",
    "-i",
    videoPath,
    "-f",
    "lavfi",
    "-t",
    String(Math.max(1, durationSec)),
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    outputPath
  ];

  await runFfmpeg(args);
};

exports.renderVideoFromScript = async ({
  script,
  durationSec = 90,
  showSubtitles = false,
  language = "en",
  renderEngine = "storyboard"
}) => {
  ensureDir(mediaRoot);
  ensureDir(videoDir);
  ensureDir(tempDir);

  const id = crypto.randomUUID();
  const clipDir = path.join(tempDir, id);
  ensureDir(clipDir);

  const scenes = buildScenes(script, durationSec);
  const fontPath = process.platform === "win32"
    ? "C:/Windows/Fonts/arial.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const escapedFontPath = fontPath.replace(/:/g, "\\:");

  const clipPaths = [];
  let visualError = null;
  const requestedEngine = String(renderEngine || "storyboard").toLowerCase();
  const effectiveEngine = "storyboard";
  let sceneAudioFailures = 0;

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const silentClipPath = path.join(clipDir, `clip-${i}-silent.mp4`);
    const sceneFinalClipPath = path.join(clipDir, `clip-${i}.mp4`);
    clipPaths.push(sceneFinalClipPath);

    await createClassicSceneClip({
      scene,
      clipPath: silentClipPath,
      showSubtitles,
      escapedFontPath
    });

    try {
      const sceneAudioPath = path.join(clipDir, `scene-${i}.mp3`);
      await createNarrationAudio({
        text: `${scene.text}. ${scene.context || ""}`,
        audioPath: sceneAudioPath,
        tempWorkDir: clipDir,
        language
      });

      await muxSceneAudio({
        videoPath: silentClipPath,
        audioPath: sceneAudioPath,
        outputPath: sceneFinalClipPath,
        durationSec: scene.duration
      });
    } catch (error) {
      sceneAudioFailures += 1;
      await muxSilentSceneAudio({
        videoPath: silentClipPath,
        outputPath: sceneFinalClipPath,
        durationSec: scene.duration
      });
    }
  }

  if (requestedEngine !== "storyboard") {
    visualError = `Requested renderEngine '${requestedEngine}' is not available in this build. Using storyboard mode.`;
  }

  const concatListPath = path.join(clipDir, "concat.txt");
  const concatContent = clipPaths.map((clip) => `file '${clip.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatContent);

  const baseVideoPath = path.join(clipDir, "base.mp4");
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c",
    "copy",
    baseVideoPath
  ]);

  const finalVideoName = `video-${id}.mp4`;
  const finalVideoPath = path.join(videoDir, finalVideoName);
  let withAudio = sceneAudioFailures < scenes.length;
  let audioError = null;

  if (!withAudio) {
    audioError = "Scene-level TTS generation failed. Falling back to silent video.";
  }

  // Scene clips already include synchronized audio when available.
  fs.copyFileSync(baseVideoPath, finalVideoPath);

  return {
    fileName: finalVideoName,
    relativeUrl: `/media/videos/${finalVideoName}`,
    durationSec,
    withAudio,
    audioError,
    renderEngine: effectiveEngine,
    visualError,
    scenes: scenes.map((scene, index) => ({
      id: scene.id,
      order: index,
      text: scene.text,
      context: scene.context,
      type: scene.type,
      durationSec: scene.duration,
      riskLabel: scene.riskLabel
    }))
  };
};
