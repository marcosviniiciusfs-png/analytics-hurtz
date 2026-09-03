import fs from 'node:fs';
import path from 'node:path';
import {toCaptions,transcribe} from '@remotion/install-whisper-cpp';
const root=process.cwd();
const whisperPath=path.resolve(root,'..','video-integra-remotion','whisper.cpp');
const out=await transcribe({model:'small',whisperPath,whisperCppVersion:'1.5.5',inputPath:path.join(root,'public','narracao-15s.wav'),tokenLevelTimestamps:true,language:'pt',splitOnWord:true,printOutput:true});
const {captions}=toCaptions({whisperCppOutput:out});
fs.writeFileSync(path.join(root,'public','captions.json'),JSON.stringify(captions,null,2));
fs.writeFileSync(path.join(root,'public','transcription-raw.json'),JSON.stringify(out,null,2));
