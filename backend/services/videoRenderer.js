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

const buildScenes = (script, durationSec) => {
  const rawPlan = Array.isArray(script.visual_plan) ? script.visual_plan : [];

  if (rawPlan.length === 0) {
    return [
      {
        duration: durationSec,
        text: sanitizeText(script.voiceover_script || script.title || "Business update")
      }
    ];
  }

  const fallbackDuration = Math.max(8, Math.floor(durationSec / rawPlan.length));

  return rawPlan.map((scene) => {
    const descriptor = [scene.scene, scene.animation].filter(Boolean).join(" - ");
    return {
      duration: parseDuration(scene.time, fallbackDuration),
      text: sanitizeText(descriptor || script.title || "Business update")
    };
  });
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

exports.renderVideoFromScript = async ({ script, durationSec = 90, showSubtitles = false, language = "en" }) => {
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

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const clipPath = path.join(clipDir, `clip-${i}.mp4`);
    clipPaths.push(clipPath);

    const drawText = escapeDrawText(scene.text.slice(0, 120));
    const filter = `drawtext=fontfile=${escapedFontPath}:text='${drawText}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.45:boxborderw=18`;

    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=#0f0f0f:s=1280x720:d=${scene.duration}`,
      ...(showSubtitles ? ["-vf", filter] : []),
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      clipPath
    ];

    await runFfmpeg(args);
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

  const audioPath = path.join(clipDir, "voice.mp3");
  let withAudio = false;
  let audioError = null;

  try {
    await createNarrationAudio({
      text: script.voiceover_script || script.title || "Business update",
      audioPath,
      tempWorkDir: clipDir,
      language
    });

    await mergeAudioVideo({
      videoPath: baseVideoPath,
      audioPath,
      outputPath: finalVideoPath
    });
    withAudio = true;
  } catch (error) {
    audioError = error?.message || "TTS generation failed";
    // Fallback to silent video when TTS fails.
    fs.copyFileSync(baseVideoPath, finalVideoPath);
  }

  return {
    fileName: finalVideoName,
    relativeUrl: `/media/videos/${finalVideoName}`,
    durationSec,
    withAudio,
    audioError
  };
};
