Demo audio for the "Try an example" button.

Generated with this repository's own mixture synthesiser (vanta/data/synthesize.py)
from LibriSpeech dev-clean, which is licensed CC BY 4.0:

  Panayotov et al., "Librispeech: an ASR corpus based on public domain audio
  books", ICASSP 2015. https://openslr.org/12

  reference.wav  5s, the target speaker alone
  mixture.wav    8s, the same speaker plus a second speaker, room reverberation
                 and background noise, at ~4.8 dB interference SNR

Both speakers are held out — neither model saw them during training. On this
pair the deployed model improves SI-SDR by +10.2 dB (+3.0 -> +13.2).
