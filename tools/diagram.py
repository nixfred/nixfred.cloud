# Generates the two inline SVG layouts of the NixNet reference-deployment flowchart (wide and mobile).
import html
NODES = {
 'friends': ['Your people', 'and their agents'], 'mesh': ['Tailscale mesh', 'zero public ports'], 'nixnet': ['Chat, API', 'and MCP'],
 'hex': ['hex', '128GB AI box'], 'nas': ['nas / tank', 'ZFS over NFS'], 'hypernix': ['Sandboxes', 'tested nightly'],
 'sessions': ['hex.sessions', 'spawn broker'], 'vault': ['Infisical', 'secrets vault'], 'agents': ['Short-lived linux', 'agent containers'],
 'backups': ['PBS backups', 'nightly, offsite'],
}
TONE = {'friends':'pink','mesh':'cyan','nixnet':'mint','hex':'mint','nas':'teal','hypernix':'violet','sessions':'violet','vault':'pink','agents':'cyan','backups':'teal'}
EDGES = [('friends','mesh'),('mesh','nixnet'),('nixnet','hex'),('hex','nas'),('hex','hypernix'),('hex','sessions'),('mesh','vault'),('hypernix','agents'),('sessions','agents'),('hex','backups')]

def svg(layout, vb, cls, title_id):
    pos, paths = layout
    out = [f'<svg class="flow {cls}" viewBox="{vb}" role="img" aria-labelledby="{title_id}" xmlns="http://www.w3.org/2000/svg">',
           f'<title id="{title_id}">NixNet reference deployment: your people and their agents to a Tailscale mesh with zero public ports; mesh to chat, API and MCP and to the Infisical secrets vault; chat to hex, the 128GB AI box; hex to the nas (ZFS tank over NFS), the nightly-tested agent sandboxes, the hex.sessions spawn broker, and nightly PBS backups with an offsite copy; sandboxes and hex.sessions both to short-lived linux agent containers.</title>',
           '<defs><marker id="ah-'+cls+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ahead"/></marker></defs>']
    for (a,b) in EDGES:
        d = paths[(a,b)]
        out.append(f'<path class="edge" d="{d}" marker-end="url(#ah-{cls})"/>')
        out.append(f'<path class="pulse-line" d="{d}"/>')
    for k,(x,y,w,h) in pos.items():
        lines = NODES[k]; t = TONE[k]
        out.append(f'<g class="node {t}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/>')
        cy = y + h/2
        if len(lines)==1:
            out.append(f'<text x="{x+w/2}" y="{cy+5}" class="l1">{html.escape(lines[0])}</text>')
        else:
            out.append(f'<text x="{x+w/2}" y="{cy-4}" class="l1">{html.escape(lines[0])}</text><text x="{x+w/2}" y="{cy+15}" class="l2">{html.escape(lines[1])}</text>')
        out.append('</g>')
    out.append('</svg>')
    return '\n'.join(out)

W,H = 170,64
wide_pos = {'friends':(20,150,W,H),'mesh':(225,150,W,H),'nixnet':(430,150,W,H),'vault':(430,320,W,H),'hex':(635,150,W,H),
            'nas':(840,40,W,H),'hypernix':(840,150,W,H),'sessions':(840,260,W,H),'agents':(1045,205,W,H),'backups':(635,320,W,H)}
wide_paths = {('friends','mesh'):'M190 182H223',('mesh','nixnet'):'M395 182H428',('nixnet','hex'):'M600 182H633',
 ('hex','nas'):'M805 182C822 182 822 72 838 72',('hex','hypernix'):'M805 182H838',('hex','sessions'):'M805 182C822 182 822 292 838 292',
 ('mesh','vault'):'M310 214V352H428',('hypernix','agents'):'M1010 182C1028 182 1028 237 1043 237',('sessions','agents'):'M1010 292C1028 292 1028 237 1043 237',('hex','backups'):'M720 214V318'}
nw = 180
tall_pos = {'friends':(110,10,nw,56),'mesh':(110,110,nw,56),'nixnet':(10,210,nw,60),'vault':(210,210,nw,60),'hex':(10,320,nw,60),
            'nas':(4,440,124,64),'hypernix':(138,440,124,64),'sessions':(272,440,124,64),'agents':(110,580,nw,64),'backups':(210,320,nw,60)}
tall_paths = {('friends','mesh'):'M200 66V108',('mesh','nixnet'):'M200 166C200 190 100 186 100 208',('mesh','vault'):'M200 166C200 190 300 186 300 208',
 ('nixnet','hex'):'M100 270V318',('hex','nas'):'M100 380C100 410 66 410 66 438',('hex','hypernix'):'M100 380C100 410 200 410 200 438',
 ('hex','sessions'):'M100 380C100 410 334 405 334 438',('hypernix','agents'):'M200 504V578',('sessions','agents'):'M334 504C334 540 250 545 250 578',('hex','backups'):'M190 350H208'}
s = svg((wide_pos,wide_paths),'0 0 1235 410','wide','flow-t-wide') + '\n' + svg((tall_pos,tall_paths),'0 0 400 655','tall','flow-t-tall')
p='public/index.html'; src=open(p).read()
if 'DIAGRAMS' in src:
    open(p,'w').write(src.replace('DIAGRAMS', s))
print('ok')
