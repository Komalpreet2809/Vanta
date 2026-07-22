import sys
import re

msg = sys.stdin.read()
msg = re.sub(r'Co-[Aa]uthored-[Bb]y:\s*Claude.*?\n', '', msg)
msg = re.sub(r'Co-[Aa]uthored-[Bb]y:\s*Claude.*', '', msg)
sys.stdout.write(msg)
