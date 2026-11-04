#!/bin/zsh
set -eu

SITE_DIRECTORY="${0:A:h}"

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3를 찾을 수 없습니다. Python 3 설치 후 다시 실행하세요.\n' >&2
  exit 1
fi

python3 -u - "$SITE_DIRECTORY" <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
import errno
import sys

site_directory = Path(sys.argv[1]).resolve()
url = "http://127.0.0.1:4173/"
handler = partial(SimpleHTTPRequestHandler, directory=str(site_directory))

try:
    server = ThreadingHTTPServer(("127.0.0.1", 4173), handler)
except OSError as error:
    if error.errno == errno.EADDRINUSE:
        try:
            with urlopen(url, timeout=2) as response:
                existing_page = response.read(65536).decode("utf-8", errors="replace")
            if "<title>악마 - 알수없음</title>" in existing_page:
                print(f"웹페이지 서버가 이미 실행 중입니다.\n접속 주소: {url}")
                sys.exit(0)
        except Exception:
            pass
        print("4173 포트를 다른 프로그램이 사용하고 있습니다. 해당 프로그램을 확인해 주세요.", file=sys.stderr)
    else:
        print(f"로컬 서버를 시작하지 못했습니다: {error}", file=sys.stderr)
    sys.exit(1)

print(f"접속 주소: {url}")
print(f"문서 폴더: {site_directory}")
print("웹페이지를 보는 동안 이 터미널 창을 열어 두세요. 종료: Ctrl+C")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\n로컬 웹페이지 서버를 종료했습니다.")
finally:
    server.server_close()
PY
