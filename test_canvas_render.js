import FFmpegMotionCanvas from './utils/ffmpeg-motion-canvas.js';
import path from 'path';

async function testCanvas() {
  console.log('Testing FFmpeg 16:9 Ambient Canvas Processing...');
  const canvas = new FFmpegMotionCanvas();

  const inputGif = path.join(process.cwd(), 'data', 'cache', 'gifs', 'test_robot_chess.mp4');
  const outputMp4 = path.join(process.cwd(), 'data', 'cache', 'gifs', 'test_robot_chess_1080p_canvas.mp4');

  await canvas.processClipToCanvas(inputGif, outputMp4, 6.0);
  console.log('✅ 16:9 Ambient Canvas Clip Rendered successfully:', outputMp4);
}

testCanvas().catch(console.error);
