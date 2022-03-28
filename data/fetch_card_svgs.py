from bs4 import BeautifulSoup as Soup
import requests
import os
import subprocess
import time

def generate_card_urls():
    CARD_URL = "https://commons.wikimedia.org/wiki/File:{}.svg" 
    suits = ['H','D','S','C']
    vals = [str(i+2) for i in range(9)] + list('JQKA')
    urls = { }
    for i in range(52):
        card_code = vals[i%13] + suits[i//13]
        urls[i+1] = CARD_URL.format(card_code) 
    return urls

def get_pages(urls):
    pages = { }
    for i in range(52):
        resp = requests.get(urls[i+1])
        pages[i+1] = Soup(resp.content, 'html.parser')
        print('parsed page', i+1)
    return pages

def get_links(pages): {k:v.select('a.internal')[0]['href'] for k,v in pages.items()}

def download_svgs(links, dirpath='svgs', delay=0.5):
    for i in range(1,53):
        #get_ipython().system(f'curl -o {dirpath}/{i}.svg {links[i]}')
        outpath = os.path.join(dirpath, f"{i}.svg")
        subprocess.run(f'curl -o {outpath} {links[i]}', shell=True)
        time.sleep(delay)
        
def make_card_svg_frag(svg_path='svgs'):
    root = Soup('<div id="card-svgs"></div>')
    div = root.find('div')
    for i in range(52):
        path = os.path.join(svg_path, f"{i+1}.svg")
        print(path)
        xml = Soup(open(path))
        svg = xml.find('svg')
        svg['card-id'] = i+1
        div.append(svg) 
    return div

def run(xml_frag_outpath):
    urls = generate_card_urls()
    pages = get_pages(urls)
    links = get_links(pages)
    download_svgs(links)
    xml = make_card_svg_frag()
    with open(xml_frag_outpath,'w') as f:
        f.write(str(xml))

