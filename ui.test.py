from playwright.sync_api import sync_playwright
import pathlib
url=(pathlib.Path(__file__).resolve().parent.parent/'index.html').as_uri()
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in [('desktop',{'width':1366,'height':800}),('tablet',{'width':820,'height':1100}),('mobile',{'width':375,'height':740})]:
        pg=b.new_page(viewport=vp); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        pg.goto(url)
        pg.click('#analyze'); assert 'Please paste' in pg.inner_text('#errorMsg'), 'empty'
        for s,cat in [('kyc','HIGH'),('ipo','CRITICAL'),('aware','LOW')]:
            pg.click(f'[data-sample={s}]'); pg.wait_for_timeout(900)
            assert cat in pg.inner_text('#catLabel'),(name,s,pg.inner_text('#catLabel'))
            assert pg.is_visible('#actionCard') and pg.locator('.sig').count()>0
        pg.click('#clear'); assert pg.input_value('#input')=='' and pg.inner_text('#scoreNum')=='0'
        pg.fill('#input','Send ₹5,000 <script>alert(1)</script> & "now" 🚨 to my personal UPI\nline2'); pg.click('#analyze'); pg.wait_for_timeout(900)
        assert pg.locator('.sig').count()>0 and int(pg.inner_text('#scoreNum'))>0
        assert pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'h-scroll '+name
        pg.screenshot(path=f'/tmp/shot_{name}.png')
        # 3D layer must not block clicks
        assert pg.evaluate("getComputedStyle(document.getElementById('bg')).pointerEvents")=='none'
        print('OK',name)
    b.close()
print('JS errors:',errs or 'none')
