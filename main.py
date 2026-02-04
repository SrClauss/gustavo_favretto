import eel
import sys
import os

# Import API Eel
from app import eel_api

# Resolve caminho da pasta `web` tanto em desenvolvimento quanto quando empacotado
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

web_dir = os.path.join(base_path, 'web')
eel.init(web_dir)

@eel.expose
def say_hello(name):
    return f'Olá {name}!'

if __name__ == '__main__':
    # modo de desenvolvimento com Vite (React) — aponta para o dev server do Vite
    # para usar o modo dev, execute antes: npm run dev (ou npx vite) que por padrão usa a porta 5173
    DEV = False

    if DEV:
        # abre a URL do dev server em vez de um arquivo local
        DEV_PORT = 5173
        import time
        import urllib.request

        def wait_for_dev(port: int, timeout: int = 15) -> bool:
            end = time.time() + timeout
            url = f'http://localhost:{port}'
            while time.time() < end:
                try:
                    with urllib.request.urlopen(url, timeout=1) as r:
                        if r.status < 400:
                            return True
                except Exception:
                    time.sleep(0.5)
            return False

        if not wait_for_dev(DEV_PORT, timeout=15):
            print(f"Dev server não respondeu em http://localhost:{DEV_PORT} (Connection refused).\n"
                  "Execute `npm run dev` dentro de `webdev/` e tente novamente.")
        eel.start({'port': DEV_PORT}, mode='chrome', host='localhost', port=8000)
    else:
        # modo produção / build: servir arquivos estáticos dentro da pasta `web`
        # quando você terminar a build do React (npm run build) copie os arquivos para `web/`
        # e descomente a linha abaixo para rodar a versão estática:
        # eel.start('index.html', size=(800, 600))
        eel.start('index.html', size=(800, 600))