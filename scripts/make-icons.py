#!/usr/bin/env python3
# 由 assets/*.svg 生成 PWA 图标 PNG（icons/）。需要 Python Playwright 与 Chrome：python3 scripts/make-icons.py
# 图标为构建产物之外的静态资源，修改 logo 后手动运行一次并提交 icons/。
from playwright.sync_api import sync_playwright
import pathlib
R=pathlib.Path(__file__).resolve().parent.parent
jobs=[('assets/favicon.svg','icons/icon-192.png',192,True),('assets/favicon.svg','icons/icon-512.png',512,True),('assets/app-icon-maskable.svg','icons/icon-maskable-512.png',512,False),('assets/app-icon-maskable.svg','icons/icon-maskable-192.png',192,False),('assets/app-icon-apple.svg','icons/apple-touch-icon.png',180,False)]
with sync_playwright() as p:
    b=p.chromium.launch(**({'executable_path':__import__('os').environ['CHROME']} if __import__('os').environ.get('CHROME') else {}))
    for src,dst,n,transp in jobs:
        svg=(R/src).read_text()
        pg=b.new_page(viewport={'width':n,'height':n},device_scale_factor=1)
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace('width="192" height="192"','width="%d" height="%d" style="display:block"'%(n,n),1)}</body></html>')
        pg.screenshot(path=str(R/dst),omit_background=transp,clip={'x':0,'y':0,'width':n,'height':n});pg.close()
    b.close()
