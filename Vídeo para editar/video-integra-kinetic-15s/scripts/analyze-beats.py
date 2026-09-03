import json, sys
import numpy as np
import librosa

path=sys.argv[1]
y,sr=librosa.load(path,sr=None,mono=True)
y_perc=librosa.effects.hpss(y)[1]
tempo,beats=librosa.beat.beat_track(y=y_perc,sr=sr,tightness=400,units='time')
i=np.arange(len(beats)); A=np.vstack([i,np.ones_like(i)]).T
(T,t0),*_ = np.linalg.lstsq(A,beats,rcond=None)
res=beats-(t0+i*T)
result={'bpm':float(60/T),'t0':float(t0),'T':float(T),'max_residual_ms':float(np.max(np.abs(res))*1000),'beats':[float(x) for x in beats[:80]]}
print(json.dumps(result,indent=2))
