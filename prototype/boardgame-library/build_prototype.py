"""Build the editable supplemental Pencil canvas and its inspectable HTML view.

Only the established .pen 2.17 frame/text/rectangle/ref subset is used. This
companion intentionally leaves the merged exploration canvas untouched.
"""
from __future__ import annotations

import copy
import html
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKENS = json.loads((HERE.parent / 'design-system/tokens.json').read_text())
C = TOKENS['colors']
ACCENT, INK, MUTED, LINE, BG = C['accent'], C['foreground'], C['secondary'], C['border'], C['surface_secondary']
ACCENT_TEXT = C['accent_text']
counter = 0


def uid():
    global counter
    counter += 1
    return f'bg{counter:05d}'


def frame(name, x, y, w, h, children=None, fill='#FFFFFF', radius=0, **kw):
    return dict(type='frame', id=uid(), name=name, x=x, y=y, width=w, height=h,
                layout='none', fill=fill, cornerRadius=radius,
                children=children or [], **kw)


def text(value, x, y, w=322, h=24, size=15, color=INK, weight='400', **kw):
    # Migrate legacy draft sizes onto the shared seven-step type scale.
    size = {13:12, 15:14, 18:20, 23:24, 26:32, 28:32}.get(size, size)
    line_height = TOKENS['typography']['line_heights'][str(size)]
    h = max(h, line_height + (4 if size == 32 else 0))
    return dict(type='text', id=uid(), name=value[:28], x=x, y=y, width=w,
                height=h, content=value, textGrowth='fixed-width-height',
                fontFamily=TOKENS['typography']['family'], fontSize=size, fontWeight=weight,
                lineHeight=line_height/size, fill=color, **kw)


def rect(x, y, w, h, fill=LINE, radius=0):
    return dict(type='rectangle', id=uid(), x=x, y=y, width=w, height=h,
                fill=fill, cornerRadius=radius)


def label(value, x=16, y=0, w=358):
    return text(value, x, y, w, 28, 20, weight='700')


header_title = text('页面标题', 52, 48, 218, 28, 20, weight='700')
header = frame('导航 / 小程序二级页头', 12, 50, 390, 88, [
    text('9:41', 24, 12, 64, 24, 14, weight='500'),
    text('•••  ▰', 286, 12, 80, 24, 14),
    text('‹', 16, 42, 28, 40, 24), header_title,
    frame('微信胶囊 / 中性系统色', 290, 46, 84, 32, [text('•••    ○', 10, 5, 64, 22, 14)],
          fill='#0000000D', radius=16)])
header['reusable'] = True
button_label = text('主要操作', 10, 11, 320, 22, 14, C['on_accent'], '700', textAlign='center')
button = frame('操作栏 / 主按钮', 14, 54, 340, 44, [button_label], ACCENT, 12, reusable=True)


def ref_button(name, x, y, w=350):
    return dict(type='ref', id=uid(), ref=button['id'], name=name, x=x, y=y,
                width=w, height=44,
                descendants={button_label['id']: dict(content=name, width=w-20)})


def section(title, lines, y, height=None):
    height = height or 54 + len(lines) * 29
    return frame(title, 16, y, 358, height, [
        text(title, 16, 14, 326, 26, 16, weight='600'),
        *[text(line, 16, 47+i*29, 326, 25, 14, MUTED) for i, line in enumerate(lines)],
    ], radius=16, stroke=LINE, strokeWidth=1)


def field(title, value, y, w=354, x=18, **kw):
    return frame(title, x, y, w, 66, [text(title, 14, 8, w-28, 22, 12, MUTED),
        text(value, 14, 32, w-28, 24, 15, kw.get('color', INK))], radius=12)


def chips(items, y, selected=0):
    w = (358-8*(len(items)-1))/len(items)
    return [frame(s, 16+i*(w+8), y, w, 38,
        [text(s, 6, 9, w-12, 22, 14, ACCENT_TEXT if i==selected else MUTED,
              '500' if i==selected else '400', textAlign='center')],
        C['accent_soft'] if i==selected else '#FFFFFF', 12) for i, s in enumerate(items)]


def table(headers, rows, y, widths=None):
    widths = widths or [326/len(headers)]*len(headers)
    children=[]
    for ri, row in enumerate([headers]+rows):
        x = 16
        for ci, val in enumerate(row):
            children.append(text(str(val), x, 12+ri*42, widths[ci]-6, 27, 13,
                                 MUTED if ri==0 else INK, '500' if ri==0 else '400'))
            x += widths[ci]
        if ri<len(rows): children.append(rect(16, 48+ri*42, 326, 1))
    return frame('数据表', 16, y, 358, 26+42*(len(rows)+1), children, radius=16)


def metrics(items, y):
    w=358/len(items)
    return frame('概览指标', 16, y, 358, 102,
        [v for i,(n,s) in enumerate(items) for v in (
          text(n, i*w+12, 16, w-24, 40, 32, ACCENT_TEXT, '700'),
          text(s, i*w+12, 60, w-24, 24, 12, MUTED))], radius=16)


def footer(caption='保存'):
    return frame('底部固定操作栏 / 安全区', 0, 764, 390, 80,
                 [ref_button(caption, 20, 6), rect(128,65,134,5,'#000000',3)], '#FFFFFF')


def phone(title, children, caption=None):
    return frame(title, 0, 0, 390, 844, [
        dict(type='ref', id=uid(), ref=header['id'], name=title+' / 导航',
             x=0, y=0, width=390, height=88,
             descendants={header_title['id']: dict(content=title)}),
        *children, *([footer(caption)] if caption else []),
    ], C['surface'], 24, clip=True)


def drawer_shell(kind):
    pad=18 if kind=='form' else 16
    title=text('表单抽屉' if kind=='form' else '信息抽屉',pad,34,302,28,20,weight='700')
    body=frame('内容视窗 / 超出内部滚动',pad,76,390-pad*2,558-76-(80 if kind=='form' else 0),
               [],BG if kind=='form' else '#FFFFFF',0 if kind=='form' else 16,clip=True)
    bar=frame('固定操作栏 / 安全区',0,478,390,80,[ref_button('保存',20,6),rect(128,65,134,5,'#000000',3)])
    panel=frame('一级抽屉 / '+kind,16,72,390,558,[rect(176,12,38,4,'#9CA3AF',2),title,
        frame('关闭 / 32 × 32',342,32,32,32,[text('×',6,2,20,28,20,MUTED)],fill='#00000000'),
        body,*([bar] if kind=='form' else [])],BG,[24,24,0,0],clip=True,reusable=True)
    shadow=TOKENS['shadows']['drawer']
    panel['effect']=dict(type='shadow',shadowType='outer',color=shadow['color'],offset=dict(x=shadow['x'],y=shadow['y']),blur=shadow['blur'])
    return panel,title,body,bar


info_shell,info_title,info_body,info_bar=drawer_shell('info')
form_shell,form_title,form_body,form_bar=drawer_shell('form')


def drawer(base, title, kind, content, y=330, caption='保存'):
    p=copy.deepcopy(base)
    def newids(n):
        n['id']=uid()
        for c in n.get('children', []): newids(c)
    newids(p)
    p['name']=title+' / '+('信息抽屉' if kind=='info' else '表单抽屉')
    p['children'].append(rect(0, 0, 390, 844, C['mask']))
    start=min(n.get('y',0) for n in content)
    span=max(n.get('y',0)+n['height'] for n in content)-start
    required=76+span+16+(80 if kind!='info' else 0)
    h=next((v for v in TOKENS['drawer']['height_tiers'].values() if v>=required),720)
    y=844-h
    if kind=='picker':
        kids=[text(title,20,17,304,28,18,weight='600'),text('×',342,16,28,32,23),rect(0,56,390,1,'#F5F5F5'),*content]
        radius=[24,24,0,0]
    else:
        pad=16 if kind=='info' else 18
        body_width=390-pad*2
        for n in content:
            n['y']-=start
            n['x']=12 if kind=='info' else 0
            n['width']=min(n['width'],body_width-n['x']-(12 if kind=='info' else 0))
        shell,heading,body,bar=(info_shell,info_title,info_body,info_bar) if kind=='info' else (form_shell,form_title,form_body,form_bar)
        overrides={heading['id']:dict(content=title),body['id']:dict(height=h-76-(80 if kind!='info' else 0),children=content)}
        if kind=='form':
            overrides[bar['id']]=dict(y=h-80,children=[ref_button(caption,20,6),rect(128,65,134,5,'#000000',3)])
        p['children'].append(dict(type='ref',id=uid(),ref=shell['id'],name=title,x=0,y=y,width=390,height=h,descendants=overrides))
        return p
    if kind!='info': kids.append(frame('固定操作栏 / 安全区',0,h-80,390,80,[ref_button(caption,20,6),rect(128,65,134,5,'#000000',3)]))
    panel=frame(title,0,y,390,h,kids,'#FFFFFF' if kind=='picker' else BG,radius,clip=True)
    shadow=TOKENS['shadows']['drawer']
    panel['effect']=dict(type='shadow',shadowType='outer',color=shadow['color'],offset=dict(x=shadow['x'],y=shadow['y']),blur=shadow['blur'])
    p['children'].append(panel)
    return p


def card_game(y, title='工业革命：伯明翰', sub='2–4 人  ·  60–120 分钟', image='01-224517.jpg'):
    cover=rect(14,14,64,88,dict(type='image', enabled=True, url='../图片素材/bgg-top-50/'+image,mode='fill'),8)
    return frame(title,16,y,358,116,[cover,text(title,92,20,250,48,16,weight='600'),
         text(sub,92,69,250,24,12,MUTED),text('有可用馆藏   ›',92,91,240,20,12,ACCENT_TEXT)],radius=16)


# Three mandatory first-level component groups, one responsibility per subframe.
def subgroup(name,x,y,w,h,kids):
    return frame(name,x,y,w,h,[text(name,16,16,w-32,28,20,weight='700'),*kids],BG,16)


def notes(lines, x=16, y=64, width=380, step=42):
    return [text(s,x,y+i*step,width,32,14,MUTED) for i,s in enumerate(lines)]


foundations=frame('基础规范',0,0,1360,1000,[label('基础规范 · 2026-09-13',24,20,900),
    subgroup('色彩',24,72,424,420,[rect(16,64,48,48,ACCENT,12),text('主色  #FF9800',80,76,320,24,14),
       rect(16,136,48,48,C['accent_soft'],12),text('柔和强调  #FFF3E0',80,148,320,24,14),
       text('标题与正文  #111827',16,216,392,28,20,INK,'700'),
       text('次级信息  #4B5563',16,268,392,24,14,MUTED),
       text('弱提示  #9CA3AF',16,312,392,24,14,C['muted']),
       text('白色内容卡 · 灰色次级容器',16,362,392,24,14)]),
    subgroup('字号',468,72,424,420,[text('一级页面标题 24 / 34',16,64,392,34,24,weight='700'),
       text('二级与分区标题 20 / 28',16,120,392,28,20,weight='700'),
       text('正文 14 / 22',16,170,392,22,14),text('辅助 12 / 18',16,212,392,18,12,MUTED),
       text('10 / 12 / 14 / 16 / 20 / 24 / 32',16,254,392,24,14),
       *notes(['仅七档字号；不沿用 7–9px 小字','实际行高、尺寸和坐标为整数'],y=306,width=392)]),
    subgroup('圆角',912,72,424,420,[*notes(['R8 标签','R12 控件与小卡','R16 标准内容卡','R24 大容器、抽屉和 Picker'],width=392,step=66),
       rect(16,342,88,40,C['accent_soft'],8),rect(120,342,88,40,C['accent_soft'],12),rect(224,342,88,40,C['accent_soft'],16)]),
    subgroup('间距',24,516,424,460,notes(['优先 4 / 8 / 12 / 16 / 20 / 24 / 32','页面左右 16 · 卡片间距 12','输入标签到内容 8','信息抽屉水平 16 · 表单水平 18','系统安全区只由对应栏负责'],width=392,step=64)),
    subgroup('阴影',468,516,424,460,notes(['S0 无阴影 / 轻描边','S1 控件：0 / 2 / 10，约 8% 黑','S2 卡片：0 / 6 / 20，约 10% 黑','S3 浮层：0 / 10 / 28，约 15% 黑','不叠加多套投影'],width=392,step=64)),
    subgroup('取值与适配',912,516,424,460,notes(['以 390 × 844 px 为基准','组件同源，页面通过引用复用','合法行高倍率不属于小数尺寸','rpx = px × 750 / 390','极限内容通过换行或省略适配'],width=392,step=64))], '#FFFFFF',24)

info_body['children']=notes(['白色信息模块','灰底 · 右上角统一关闭','360 / 558 / 720 三档','超出内容区域内部滚动'],x=12,y=16,width=334,step=56)
form_body['children']=[field('字段标签','正文 14px，白色输入卡',16,354,0),field('数值','保留未填写与 0 的区别',98,354,0),field('多行内容','最多 5 行，之后内部滚动',180,354,0)]
common=frame('通用组件',1440,0,1360,1000,[label('通用组件',24,20),
    subgroup('导航',24,72,648,210,[header,text('一级标题 24px · 二级标题 20px',16,158,612,24,14)]),
    subgroup('操作栏',696,72,640,210,[button,*notes(['主按钮高 44 · 底栏高 80','五项全局导航保持现有职责'],y=114,width=604,step=40)]),
    subgroup('表单',24,306,424,670,[form_shell,text('18px 内容边距 · 提交栏占 80px',16,642,392,24,12)]),
    subgroup('抽屉',468,306,424,670,[info_shell,text('统一头部 76px · 关闭区域 32 × 32',16,642,392,24,12)]),
    subgroup('日期与时间选择器',912,306,424,670,[
       frame('独立 Picker / 白底 R24',16,72,390,396,[text('选择日期',20,14,290,28,16,weight='600'),text('×',342,14,28,28,20),
           rect(0,56,390,1,BG),rect(20,177,350,44,BG,12),
           text('2026 年     9 月     13 日',24,187,342,24,16,textAlign='center'),
           frame('Picker 确认栏',0,316,390,80,[ref_button('确认',20,6),rect(128,65,134,5,'#000000',3)])],radius=[24,24,0,0]),
       *notes(['高 396 · 标题栏 56 · 无拖拽条','选中行 R12 · 水平边距 20','叠加表单时保留下层状态'],y=504,width=392,step=42)])], '#FFFFFF',24)

catalog_title=text('工业革命：伯明翰',8,8,157,22,14,weight='700')
catalog_cover=rect(0,0,173,142,dict(type='image',enabled=True,url='../图片素材/bgg-top-50/01-224517.jpg',mode='fill'))
catalog_info=frame('白色信息区',0,142,173,88,[catalog_title,text('2–4 人 · 60–120 分钟',8,36,157,18,12,MUTED),
    text('小李有馆藏 · 可用',8,62,157,18,12,ACCENT_TEXT)],radius=[0,0,16,16])
catalog=frame('桌游库 / 馆藏双列卡片',16,64,173,230,[catalog_cover,catalog_info],radius=16,clip=True,reusable=True)
extreme_title=text('超长桌游名称与扩展…',8,8,157,22,14,weight='700')
extreme_tags=[frame(s,8+(i%2)*80,78+(i//2)*26,76,22,[text(s,4,4,68,14,10,MUTED,textAlign='center')],BG,8)
              for i,s in enumerate(['启蒙时代','资源管理','卡牌驱动','终局奖励'])]
extreme=dict(type='ref',id=uid(),ref=catalog['id'],name='馆藏卡片 / 极限值',x=213,y=64,width=173,height=230,
    descendants={catalog_cover['id']:dict(height=88),catalog_info['id']:dict(y=88,height=142,children=[extreme_title,
        text('10–12 人',8,36,157,18,12,MUTED),text('100–120 分钟',8,58,157,18,12,MUTED),*extreme_tags])})
business=frame('业务组件',2880,0,1360,1000,[label('业务组件',24,20),
    subgroup('桌游库',24,72,424,904,[catalog,extreme,*notes(['标准 173 × 230 · 页面边距 16','横向/纵向间距 12 · 标题单行','四个长标签允许分两行','人数和时长分行，封面让出空间','一期不启用机制翻译与 OCR'],y=334,width=392,step=56)]),
    subgroup('活动',468,72,424,420,notes(['提名人数与活动场次','活动开始前可修改提名','打卡成员可记录任意一桌','本体、扩展和携带安排分开'],width=392,step=72)),
    subgroup('对局',912,72,424,420,notes(['个人、团队、合作与单人','0 分与未填写独立展示','摆烂保留参局，判定未获胜','没开完和掀桌保留真实状态'],width=392,step=72)),
    subgroup('计分表',468,516,424,460,notes(['分项、轮次、算式与小计','空白不转换成 0','模板与计分纸实例同步','结果语义遵循既有接口契约'],width=392,step=72)),
    subgroup('统计',912,516,424,460,notes(['全体 / 我的 · 活动 / 月季年','最想开：提名人次 + 活动场次','开的最多：实际完成对局','结果未知不进入胜率分母'],width=392,step=72))], '#FFFFFF',24)

library=phone('桌游库',[field('搜索桌游','名称 / 别名 / BGG',108),*chips(['全部','我的馆藏','未玩过'],188),
    label('最近购入',16,244),card_game(286),label('全部馆藏',16,426),
    dict(type='ref',id=uid(),ref=catalog['id'],name='工业革命：伯明翰 / 馆藏卡',x=16,y=470,width=173,height=230),
    dict(type='ref',id=uid(),ref=catalog['id'],name='方舟动物园 / 馆藏卡',x=201,y=470,width=173,height=230,
        descendants={catalog_title['id']:dict(content='方舟动物园'),catalog_info['children'][1]['id']:dict(content='1–4 人 · 90–150 分钟'),
            catalog_cover['id']:dict(fill=dict(type='image',enabled=True,url='../图片素材/bgg-top-50/02-342942.jpg',mode='fill'))})], '录入桌游')
detail=phone('桌游详情',[card_game(108),*chips(['资料','馆藏','对局'],238),
    section('工业革命：伯明翰',['中文名可手动补充，保留 BGG 原资料','复杂度 3.87 · 支持 2–4 人'],294),
    section('馆藏与归属',['小李 · 中文标准版 · 可用','2026-02-10 购入 · 这盒 ¥ 360'],420),
    section('我的偏好',['评分 8.0 · 长期想玩','拥有未玩 / 既往游玩单独维护'],546)],'记录一局')
exp=phone('本体与扩展',[section('火星改造计划',['本体资料 · 有 2 盒可用馆藏'],108),
    section('已关联扩展',['✓ 序曲 · 本次使用','□ 殖民地 · 本次不使用'],218),
    section('本次使用的模块',['序曲：前奏卡组 A','只记录实际带入规则的部分'],352),
    section('实物选择',['本体：小陈的中文版','序曲：小李的中文版'],486)],'保存扩展组合')
inventory=drawer(detail,'编辑这盒桌游','form',[
    field('归属','小李（我）',64),field('状态','可用   ›',142),field('购入日期','2026-02-10   ›',220),
    field('价格 / 币种','360.00  /  CNY',298)],230)
preference=phone('我的游戏偏好',[field('我的评分','8.0 / 10',108),section('收藏状态',['□ 愿望单   □ 已预订   ✓ 长期想玩'],190),
    section('以前玩过，但没有逐局记录',['✓ 我以前玩过这款桌游','约 5 次 · 不进入日期和胜率统计'],300),field('我的笔记','下次想试试另一条路线',434),
    section('标签',['规则已熟悉 · 想复盘'],516)],'保存偏好')
activity=phone('这次玩什么',[section('周末桌游局',['9 月 13 日 14:00 · 开场前可改提名'],108),
    section('大家想玩',['工业革命：伯明翰 · 4 人','我已提名    查看成员 ›'],218),
    section('游戏安排 · 1 号桌',['火星改造计划 + 序曲','小陈携带本体 · 小李携带扩展','记录这桌的对局 ›'],356),
    section('记录权限',['你已打卡，可以记录其他桌的对局'],522)],'提名想玩的桌游')
nomination=drawer(activity,'大家想玩 · 4 人','info',[
    text('小李（我）',16,76,358,30,16),text('小陈',16,128,358,30,16),text('小赵',16,180,358,30,16),text('小吴',16,232,358,30,16)],450)
plan=drawer(activity,'编辑游戏安排','form',[field('桌游 / 本体','火星改造计划',64),
    field('谁带这盒','小陈 · 中文标准版',142),field('选用扩展','✓ 序曲   □ 殖民地',220),field('使用模块','前奏卡组 A',298)],230)
record=phone('记录对局',[section('工业革命：伯明翰',['2026-09-13 · 周末桌游局 · 个人竞技'],108),
    label('实际玩家',16,226),table(['玩家','成绩','结果'],[['小李','78','获胜'],['小陈','0','未获胜'],['小赵','摆烂','未获胜']],270,[110,110,106]),
    section('整局与统计',['已完成 · 3 轮 · 90 分钟','摆烂成员保留参局，分数不计为 0'],508),
    section('计分与计时',['计分表 ›    计时 ›    非玩家 ›'],642)],'保存对局')
status=drawer(record,'小赵的成绩状态','info',[
    text(s,16,72+i*48,358,32,16,ACCENT_TEXT if i==2 else INK)
    for i,s in enumerate(['未填写','已记分（可以是 0）','✓ 摆烂不算分了','没开完','掀桌了'])],410)
team=phone('团队与非玩家',[section('团队竞技',['分数记在队伍上，个人可标记特殊状态'],108),
    table(['玩家','队伍','状态'],[['小李','红队','正常'],['小陈','蓝队','正常'],['小赵','红队','摆烂']],230,[110,110,106]),
    section('队伍成绩',['红队 80 · 获胜   /   蓝队 60 · 未获胜','小赵保留参局，仍判为未获胜'],470),
    section('辅助参与',['讲解员：小吴 · 不进入玩家榜','自动玩家：机器人 A · 不计人类样本'],596)],'保存对局')
cooperative=phone('合作 / 单人结果',[section('合作模式',['3 位玩家共同挑战，使用同一份成绩'],108),
    field('共同分数','120',222),field('挑战结果','成功   ›',302),
    section('个人状态',['小李 · 正常','小陈 · 正常','小赵 · 摆烂，个人计未获胜'],386),
    section('整局结果',['保留共同成功；个人摆烂不计获胜'],552)],'保存对局')
timer=phone('计时与轮数',[metrics([('01:32:18','累计游玩时间')],108),
    *chips(['正在计时','暂停','结束'],230),field('实际总轮数','3',292),
    section('恢复状态',['离开后可继续，重复点击不重复累计','暂停期间不计入游戏时长'],376),
    section('记录身份',['玩家、自动玩家和辅助参与分开维护'],510)],'回到对局')
paper=phone('计分表',[section('工业革命：伯明翰',['标准玩法 · v1 · 普通分项'],108),
    table(['计分项','小李','小陈'],[['资源','12','0'],['建设','8','6'],['奖励','2 + 3','未填'],['合计','25','未齐']],230,[136,94,96]),
    section('更多行类型',['数字 / 算式 · 单选 · 勾选 · 辅助项','重复行和小计可保存，空白独立保留'],530)],'计算并回填')
rounds=phone('轮次记分',[field('计算方式','累计总分  /  最佳一轮  /  赢得轮数',108),
    table(['轮次','小李','小陈'],[['第 1 轮','12','8'],['第 2 轮','0','8'],['第 3 轮','20','未填'],['累计','32','未齐']],194,[136,94,96]),
    section('已输入 3 轮',['有效玩家的各轮成绩齐全才计算胜轮','总轮数和计分行数量独立维护'],492)],'保存轮次成绩')
templates=drawer(paper,'选择计分模板','info',[
    text('普通分项 · 通用',16,76,358,30,16),text('轮次计分 · 通用',16,138,358,30,16),
    text('伯明翰标准玩法 · v1',16,200,358,30,16),text('当前游戏、玩法和人数匹配',16,258,358,28,13,MUTED)],450)
conflict=phone('核对计分表冲突',[section('另一个人修改了这一局',['选择基于哪个版本继续编辑'],108),
    table(['字段','本机修改','服务器'],[['奖励 / 小陈','0','未填写'],['修改原因','补录第 3 轮','尚未补齐']],230,[130,98,98]),
    section('合并方式',['回到计分表逐项核对','使用新版本提交，保留修改说明'],426),
    section('服务器当前版本',['第 7 版 · 查看完整计分表 ›'],564)],'打开计分表核对')
stats=phone('桌游统计',[*chips(['全体','我的'],108),*chips(['本月','本季度','本年','筛选'],160,1),
    metrics([('26','完成局数'),('8','不同游戏'),('9','游玩日')],216),
    section('开的最多',['工业革命：伯明翰     12 局 ›','火星改造计划                 8 局 ›'],334),
    section('最想开',['工业革命：伯明翰    16 人次 ›','来自 5 场活动，不跨活动去重'],462),
    section('更多统计',['趋势 · 玩家 · 地点 · 详细结果 · 分项'],590)])
ranking=phone('单款玩家排名',[section('工业革命：伯明翰',['个人竞技 · 同一玩法 · 全部活动'],108),
    table(['玩家','胜 / 有效局','胜率'],[['小李','4 / 8','50.0%'],['小陈','3 / 7','42.9%'],['小赵','0 / 1','0.0%']],230,[106,128,92]),
    section('样本规则',['1 局结果明确即可进入','摆烂计未获胜；未知不进入分母'],470),
    section('继续查看',['先手 / 新手 · 连胜 · 角色与变体 ›'],596)])
advanced=phone('详细结果分析',[*chips(['先手 / 新手','连胜','分差'],108),
    table(['参与情况','胜 / 样本','胜率'],[['先手','4 / 12','33.3%'],['第一次玩','2 / 8','25.0%']],166,[120,112,94]),
    metrics([('3','最长连胜'),('1','当前连胜'),('2','同分决胜')],374),
    section('分数样本',['胜者均分 82.6 · 最高落败分 78','平均分差 12.8 · 有效比较 9 局'],492),
    section('缺失数据',['先手未填 3 局 · 新手未填 5 人次'],620)])
curve=phone('得分曲线与分项',[section('工业革命：伯明翰',['小李 · 标准玩法 · 个人竞技'],108),
    table(['日期','得分','结果'],[['09-01','72','未获胜'],['09-06','78','获胜'],['09-13','0','未获胜']],230,[140,80,106]),
    table(['分项','胜者均分','未获胜均分'],[['资源','16.5','12.8'],['建设','24.2','19.6']],466,[130,98,98]),
    text('每项单独标记样本与缺失，点击可查看来源对局',20,666,350,52,13,MUTED)])
collection=phone('我的收藏',[metrics([('66.7%','馆藏游玩覆盖率')],108),
    *chips(['拥有未玩','玩过未拥有','长期想玩'],226),
    section('拥有但没玩过',['工业革命：伯明翰    查看 ›','共 2 款，既往游玩也计入覆盖'],280),
    section('个人收藏管理',['愿望单 · 预订 · 评分与笔记','标签 · 保存筛选 · 既往游玩'],414),
    section('实物成本',['按实际使用的盒子统计','每局 / 每小时 / 人均 ›'],548)])
cost=phone('实物成本',[*chips(['本月','本季度','本年','全部'],108,1),
    metrics([('¥ 360','CNY 购入价')],164),metrics([('30.00','每局'),('15.00','每小时'),('7.50','人均')],282),
    section('我的中文标准版',['明确使用本盒：12 局 · 48 人次','已知时长 24 小时；3 局时长缺失'],402),
    section('成本口径',['无使用盒子的对局不猜归属','多币种分开；未填价格不当作 0'],534)])
tags=phone('我的标签与筛选',[section('游戏 / 对局标签',['✓ 适合聚会     □ 想复盘','□ 两人就能开   ✓ 规则已熟悉'],108),
    section('已保存的筛选',['我的馆藏 · 4 人 · 120 分钟以内 ›','本季度 · 我的对局 · 排除教学局 ›'],242),
    section('管理标签',['新增 · 重命名 · 停用 / 恢复','仅影响我的分类，不影响其他成员'],376)],'保存标签')
filters=drawer(stats,'筛选范围','form',[field('时间范围','2026 年 · 第三季度',64),field('活动','已选 2 场   ›',142),
    field('参与用户 / 地点','小李 · 全部地点   ›',220),field('个人标签','包含：想复盘  /  排除：教学局',298)],230,'应用筛选')
imports=phone('导入记录',[section('BG Stats / BGG',['选择文件或账号，先解析并核对','相同来源可复用数据集与映射'],108),
    section('我的导入任务',['BG Stats · 已解析 · 私有','等待核对 12 项 · 已处理 24 项 ›'],242),
    section('其他来源能力',['BGA / Yucata：暂不可用','尚未验证可用的官方外部历史接口'],376),
    section('公开范围',['历史默认私有暂存','逐局确认后才能对小程序成员公开'],510)],'新建导入任务')
mapping=phone('导入玩家匹配',[section('私有来源玩家',['逐个明确对应；不按同名自动绑定'],108),
    table(['来源玩家','匹配结果'],[['玩家 A','小李（我）'],['玩家 B','小陈'],['访客 C','保持未匹配']],230,[158,168]),
    section('匹配方式',['选择小程序用户 ›','建立私有历史人物 ›'],470),
    section('历史版本',['查看这次映射的变更记录 ›'],596)],'保存匹配')
diff=phone('来源差异核对',[section('同一来源有新版本',['工业革命：伯明翰 · 2026-09-06'],108),
    table(['字段','本地','新来源'],[['时长','60 分钟','75 分钟'],['总轮数','未填写','3'],['记分表','有本地更正','源文件变更']],230,[100,113,113]),
    section('处理选择',['保留本地 / 确认更新暂存记录','替换记分表需要单独确认'],470),
    section('可能重复的对局',['同游戏 · 同日 · 3 位相同玩家','选择关联已有局，或明确另建一局'],596)],'确认处理选择')
publish=drawer(diff,'公开这一局历史','form',[
    section('公开内容',['玩家、成绩、地点与备注将对成员可见'],64),
    text('□ 我已核对本次选中的一局',18,184,354,32,15),
    text('□ 允许显示尚未匹配的历史人物',18,230,354,32,15),
    field('核对说明','玩家与成绩已核对',278)],230,'确认公开这一局')
offline=phone('待同步记录',[section('1 条修改需要核对',['另一台设备也修改了这条记录'],108),
    table(['字段','本机修改','服务器'],[['小陈的成绩','0 分','未填写'],['修改原因','补录第 3 轮','尚未补齐']],230,[130,98,98]),
    section('处理方式',['查看服务器最新内容','选择保留服务器，或核对后重新提交'],426),
    section('账号隔离',['离线修改归属当前登录账号','更换账号不会提交上一个人的修改'],560)],'核对后重新提交')

groups=[('桌游与馆藏',[library,detail,exp,inventory,preference]),
        ('活动与提名',[activity,nomination,plan]),
        ('录局与结果',[record,status,team,cooperative,timer]),
        ('计分表与模板',[paper,rounds,templates,conflict]),
        ('统计与钻取',[stats,ranking,advanced,curve]),
        ('收藏与筛选',[collection,cost,tags,filters]),
        ('导入与恢复',[imports,mapping,diff,publish,offline])]
tops=[foundations,common,business]
for row,(group,pages) in enumerate(groups):
    for col,p in enumerate(pages):
        p['x'],p['y']=col*470,1156+row*1000
        p['name']=f'{row+1:02d} {group} / {p["name"]}'
        tops.append(p)
document=dict(version='2.17',children=tops)
pen=HERE/'桌游库-功能补全.pen'

def integral_geometry(value):
    if isinstance(value,dict):
        for k,v in value.items():
            if k in ('x','y','width','height') and isinstance(v,(int,float)):
                value[k]=round(v)
            else:integral_geometry(v)
    elif isinstance(value,list):
        for v in value:integral_geometry(v)
integral_geometry(document)

# Export geometry independently, including descendants and reusable instances.
all_nodes={}
def index(n):
    if n['id'] in all_nodes: raise AssertionError('Duplicate node id '+n['id'])
    all_nodes[n['id']]=n
    for c in n.get('children',[]): index(c)
    for override in n.get('descendants',{}).values():
        for c in override.get('children',[]):index(c)
for n in tops:index(n)
def expanded(n):
    if n['type']!='ref':return n
    base=copy.deepcopy(all_nodes[n['ref']])
    overrides=n.get('descendants',{})
    def override(v):
        v.update(overrides.get(v['id'],{}))
        for c in v.get('children',[]):override(c)
    override(base)
    base.update({k:v for k,v in n.items() if k not in ('ref','descendants','type')})
    return base
errors=[]
def audit(n):
    n=expanded(n)
    if n['type']=='text':
        if n['fontSize'] not in TOKENS['typography']['sizes']:
            errors.append('Nonstandard font size: '+n['name'])
    fill=n.get('fill')
    if isinstance(fill,dict) and fill.get('type')=='image' and not (HERE/fill['url']).is_file():
        errors.append('Missing image: '+fill['url'])
    for c in n.get('children',[]):
        v=expanded(c)
        if v.get('x',0)<0 or v.get('y',0)<0 or v.get('x',0)+v['width']>n['width']+.1 or v.get('y',0)+v['height']>n['height']+.1:
            errors.append(f'{n["name"]}: child outside bounds: {v.get("name",v["id"])}')
        audit(v)
for n in tops:audit(n)
for i,a in enumerate(tops):
    for b in tops[i+1:]:
        if a['x']<b['x']+b['width'] and b['x']<a['x']+a['width'] and a['y']<b['y']+b['height'] and b['y']<a['y']+a['height']:
            errors.append(f'Top-level collision {a["name"]} / {b["name"]}')
if errors:raise AssertionError('\n'.join(errors))
pen.write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n')

def css_color(fill):
    return fill if isinstance(fill,str) else 'transparent'


def render_node(n,top=False):
    n=expanded(n)
    style=f'left:{n.get("x",0)}px;top:{n.get("y",0)}px;width:{n["width"]}px;height:{n["height"]}px;'
    name=html.escape(n.get('name',''),quote=True)
    radius=n.get('cornerRadius',0)
    style+='border-radius:'+(' '.join(f'{x}px' for x in radius) if isinstance(radius,list) else f'{radius}px')+';'
    if isinstance(n.get('stroke'),str) and isinstance(n.get('strokeWidth'),(int,float)):
        style+=f'border:{n["strokeWidth"]}px solid {n["stroke"]};'
    effect=n.get('effect',{})
    if effect.get('type')=='shadow' and effect.get('enabled',True):
        style+=f'box-shadow:{effect["offset"]["x"]}px {effect["offset"]["y"]}px {effect["blur"]}px {effect["color"]};'
    if n['type']=='text':
        style+=f'font-size:{n["fontSize"]}px;font-weight:{n["fontWeight"]};color:{n["fill"]};line-height:{n["lineHeight"]};text-align:{n.get("textAlign","left")};'
        content=html.escape(n['content'])
    else:
        style+='background:'+css_color(n.get('fill','transparent'))+';'
        if n.get('clip'):style+='overflow:hidden;'
        fill=n.get('fill')
        if isinstance(fill,dict) and fill.get('type')=='image':
            content=f'<img src="{html.escape(fill["url"],quote=True)}" alt="桌游封面">'
        else:content=''.join(render_node(c) for c in n.get('children',[]))
    return f'<div class="node {"top " if top else ""}{"txt" if n["type"]=="text" else "box"}" data-node="{n["id"]}" data-name="{name}" style="{style}">{content}</div>'

canvas_w=max(n['x']+n['width'] for n in tops)
canvas_h=max(n['y']+n['height'] for n in tops)
geometry=[{k:n[k] for k in ('id','name','x','y','width','height')} for n in tops]
(HERE/'canvas-geometry.json').write_text(json.dumps(dict(top_level=geometry,canvas=dict(width=canvas_w,height=canvas_h),node_count=len(all_nodes),collisions=[],out_of_bounds=[]),ensure_ascii=False,indent=2)+'\n')
content=''.join(render_node(n,True) for n in tops)
template=(HERE/'canvas-template.html').read_text()
page=template.replace('<!-- CANVAS -->',content).replace('__CANVAS_W__',str(canvas_w)).replace('__CANVAS_H__',str(canvas_h)).replace('__GEOMETRY__',json.dumps(geometry,ensure_ascii=False))
(HERE/'canvas.html').write_text(page)
print(f'{len(tops)} top-level nodes, {sum(len(p) for _,p in groups)} pages, {len(all_nodes)} nodes; no collisions or out-of-bounds descendants')
