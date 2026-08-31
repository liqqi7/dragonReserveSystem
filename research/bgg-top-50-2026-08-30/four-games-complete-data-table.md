# 四款桌游完整数据表

数据来源：`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/research/bgg-top-50-2026-08-30/games.normalized.json`

>说明：本文档是 Markdown，不是 Excel。第一张表便于横向比较；第二张表将 JSON 中的每一个具体值全部展开，包括别名、投票、所有关联项、所有发行版本和视频元数据。

## 核心字段横向对照

| 字段 | 工业革命：伯明翰 | 方舟动物园 | 幽港迷城 | 瘟疫传说传承（Pandemic Legacy 第一季） |
|---|---|---|---|---|
| BGG 排名 | 1 | 2 | 4 | 3 |
| BGG ID | 224517 | 342942 | 174430 | 161936 |
| 英文主名 | Brass: Birmingham | Ark Nova | Gloomhaven | Pandemic Legacy: Season 1 |
| 别名数量 | 6 | 8 | 6 | 11 |
| 出版年份 | 2018 | 2021 | 2017 | 2015 |
| 最少人数 | 2 | 1 | 1 | 2 |
| 最多人数 | 4 | 4 | 4 | 4 |
| 最短时长（分钟） | 60 | 90 | 60 | 60 |
| 最长时长（分钟） | 120 | 150 | 120 | 60 |
| 最低年龄 | 14 | 14 | 14 | 13 |
| 用户平均分 | 8.5596 | 8.53801 | 8.53334 | 8.50133 |
| BGG 贝叶斯分 | 8.39003 | 8.35351 | 8.29097 | 8.34404 |
| 评分人数 | 59920 | 62733 | 67627 | 57743 |
| 平均复杂度 | 3.86 | 3.7979 | 3.9195 | 2.8283 |
| 收藏人数 | 86075 | 91341 | 105258 | 89947 |
| 愿望单人数 | 22328 | 18230 | 22476 | 15183 |
| 类别数量 | 6 | 3 | 5 | 2 |
| 机制数量 | 14 | 17 | 27 | 11 |
| 版本数量 | 37 | 37 | 28 | 37 |
| 视频元数据数量 | 15 | 15 | 15 | 15 |

## 所有字段与具体数据（逐值展开）

| 桌游 | 字段路径 | 具体数据 |
|---|---|---|
| 工业革命：伯明翰 | `bgg_rank_at_capture` | 1 |
| 工业革命：伯明翰 | `bgg_id` | 224517 |
| 工业革命：伯明翰 | `type` | boardgame |
| 工业革命：伯明翰 | `bgg_url` | https://boardgamegeek.com/boardgame/224517 |
| 工业革命：伯明翰 | `names.primary` | Brass: Birmingham |
| 工业革命：伯明翰 | `names.alternate[0]` | Brass. Бирмингем |
| 工业革命：伯明翰 | `names.alternate[1]` | Brass. Бірмінгем |
| 工业革命：伯明翰 | `names.alternate[2]` | ブラス：バーミンガム |
| 工业革命：伯明翰 | `names.alternate[3]` | 工业革命：伯明翰(Chinese edition) (2018) |
| 工业革命：伯明翰 | `names.alternate[4]` | 工業革命：伯明翰 |
| 工业革命：伯明翰 | `names.alternate[5]` | 브라스: 버밍엄 |
| 工业革命：伯明翰 | `names.all[0].type` | primary |
| 工业革命：伯明翰 | `names.all[0].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[0].value` | Brass: Birmingham |
| 工业革命：伯明翰 | `names.all[1].type` | alternate |
| 工业革命：伯明翰 | `names.all[1].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[1].value` | Brass. Бирмингем |
| 工业革命：伯明翰 | `names.all[2].type` | alternate |
| 工业革命：伯明翰 | `names.all[2].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[2].value` | Brass. Бірмінгем |
| 工业革命：伯明翰 | `names.all[3].type` | alternate |
| 工业革命：伯明翰 | `names.all[3].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[3].value` | ブラス：バーミンガム |
| 工业革命：伯明翰 | `names.all[4].type` | alternate |
| 工业革命：伯明翰 | `names.all[4].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[4].value` | 工业革命：伯明翰(Chinese edition) (2018) |
| 工业革命：伯明翰 | `names.all[5].type` | alternate |
| 工业革命：伯明翰 | `names.all[5].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[5].value` | 工業革命：伯明翰 |
| 工业革命：伯明翰 | `names.all[6].type` | alternate |
| 工业革命：伯明翰 | `names.all[6].sortindex` | 1 |
| 工业革命：伯明翰 | `names.all[6].value` | 브라스: 버밍엄 |
| 工业革命：伯明翰 | `description` | Brass: Birmingham is an economic strategy game sequel to Martin Wallace's 2007 masterpiece, Brass. Brass: Birmingham tells the story of competing entrepreneurs in Birmingham during the industrial revolution between the years of 1770 and 1870.<br><br>It offers a very different story arc and experience from its predecessor. As in its predecessor, you must develop, build and establish your industries and network in an effort to exploit low or high market demands. The game is played over two halves: the canal era (years 1770-1830) and the rail era (years 1830-1870). To win the game, score the most VPs. VPs are counted at the end of each half for the canals, rails and established (flipped) industry tiles.<br><br>Each round, players take turns according to the turn order track, receiving two actions to perform any of the following actions (found in the original game):<br><br>1) Build - Pay required resources and place an industry tile.<br>2) Network - Add a rail / canal link, expanding your network.<br>3) Develop - Increase the VP value of an industry.<br>4) Sell - Sell your cotton, manufactured goods and pottery.<br>5) Loan - Take a £30 loan and reduce your income.<br><br>Brass: Birmingham also features a new sixth action:<br><br>6) Scout - Discard three cards and take a wild location and wild industry card. (This action replaces Double Action Build in original Brass.)<br><br> |
| 工业革命：伯明翰 | `year_published` | 2018 |
| 工业革命：伯明翰 | `players.min` | 2 |
| 工业革命：伯明翰 | `players.max` | 4 |
| 工业革命：伯明翰 | `playing_time_minutes.nominal` | 120 |
| 工业革命：伯明翰 | `playing_time_minutes.min` | 60 |
| 工业革命：伯明翰 | `playing_time_minutes.max` | 120 |
| 工业革命：伯明翰 | `minimum_age` | 14 |
| 工业革命：伯明翰 | `images.image_url` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `images.thumbnail_url` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `images.local_cover` | covers/01-224517.jpg |
| 工业革命：伯明翰 | `polls[0].name` | suggested_numplayers |
| 工业革命：伯明翰 | `polls[0].title` | User Suggested Number of Players |
| 工业革命：伯明翰 | `polls[0].total_votes` | 1433 |
| 工业革命：伯明翰 | `polls[0].results[0].attributes.numplayers` | 1 |
| 工业革命：伯明翰 | `polls[0].results[0].options[0].value` | Best |
| 工业革命：伯明翰 | `polls[0].results[0].options[0].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[0].results[0].options[1].value` | Recommended |
| 工业革命：伯明翰 | `polls[0].results[0].options[1].numvotes` | 72 |
| 工业革命：伯明翰 | `polls[0].results[0].options[2].value` | Not Recommended |
| 工业革命：伯明翰 | `polls[0].results[0].options[2].numvotes` | 787 |
| 工业革命：伯明翰 | `polls[0].results[1].attributes.numplayers` | 2 |
| 工业革命：伯明翰 | `polls[0].results[1].options[0].value` | Best |
| 工业革命：伯明翰 | `polls[0].results[1].options[0].numvotes` | 133 |
| 工业革命：伯明翰 | `polls[0].results[1].options[1].value` | Recommended |
| 工业革命：伯明翰 | `polls[0].results[1].options[1].numvotes` | 899 |
| 工业革命：伯明翰 | `polls[0].results[1].options[2].value` | Not Recommended |
| 工业革命：伯明翰 | `polls[0].results[1].options[2].numvotes` | 187 |
| 工业革命：伯明翰 | `polls[0].results[2].attributes.numplayers` | 3 |
| 工业革命：伯明翰 | `polls[0].results[2].options[0].value` | Best |
| 工业革命：伯明翰 | `polls[0].results[2].options[0].numvotes` | 768 |
| 工业革命：伯明翰 | `polls[0].results[2].options[1].value` | Recommended |
| 工业革命：伯明翰 | `polls[0].results[2].options[1].numvotes` | 467 |
| 工业革命：伯明翰 | `polls[0].results[2].options[2].value` | Not Recommended |
| 工业革命：伯明翰 | `polls[0].results[2].options[2].numvotes` | 20 |
| 工业革命：伯明翰 | `polls[0].results[3].attributes.numplayers` | 4 |
| 工业革命：伯明翰 | `polls[0].results[3].options[0].value` | Best |
| 工业革命：伯明翰 | `polls[0].results[3].options[0].numvotes` | 796 |
| 工业革命：伯明翰 | `polls[0].results[3].options[1].value` | Recommended |
| 工业革命：伯明翰 | `polls[0].results[3].options[1].numvotes` | 377 |
| 工业革命：伯明翰 | `polls[0].results[3].options[2].value` | Not Recommended |
| 工业革命：伯明翰 | `polls[0].results[3].options[2].numvotes` | 54 |
| 工业革命：伯明翰 | `polls[0].results[4].attributes.numplayers` | 4+ |
| 工业革命：伯明翰 | `polls[0].results[4].options[0].value` | Best |
| 工业革命：伯明翰 | `polls[0].results[4].options[0].numvotes` | 2 |
| 工业革命：伯明翰 | `polls[0].results[4].options[1].value` | Recommended |
| 工业革命：伯明翰 | `polls[0].results[4].options[1].numvotes` | 6 |
| 工业革命：伯明翰 | `polls[0].results[4].options[2].value` | Not Recommended |
| 工业革命：伯明翰 | `polls[0].results[4].options[2].numvotes` | 664 |
| 工业革命：伯明翰 | `polls[1].name` | suggested_playerage |
| 工业革命：伯明翰 | `polls[1].title` | User Suggested Player Age |
| 工业革命：伯明翰 | `polls[1].total_votes` | 202 |
| 工业革命：伯明翰 | `polls[1].results[0].attributes` | {} |
| 工业革命：伯明翰 | `polls[1].results[0].options[0].value` | 2 |
| 工业革命：伯明翰 | `polls[1].results[0].options[0].numvotes` | 1 |
| 工业革命：伯明翰 | `polls[1].results[0].options[1].value` | 3 |
| 工业革命：伯明翰 | `polls[1].results[0].options[1].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[1].results[0].options[2].value` | 4 |
| 工业革命：伯明翰 | `polls[1].results[0].options[2].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[1].results[0].options[3].value` | 5 |
| 工业革命：伯明翰 | `polls[1].results[0].options[3].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[1].results[0].options[4].value` | 6 |
| 工业革命：伯明翰 | `polls[1].results[0].options[4].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[1].results[0].options[5].value` | 8 |
| 工业革命：伯明翰 | `polls[1].results[0].options[5].numvotes` | 6 |
| 工业革命：伯明翰 | `polls[1].results[0].options[6].value` | 10 |
| 工业革命：伯明翰 | `polls[1].results[0].options[6].numvotes` | 13 |
| 工业革命：伯明翰 | `polls[1].results[0].options[7].value` | 12 |
| 工业革命：伯明翰 | `polls[1].results[0].options[7].numvotes` | 45 |
| 工业革命：伯明翰 | `polls[1].results[0].options[8].value` | 14 |
| 工业革命：伯明翰 | `polls[1].results[0].options[8].numvotes` | 102 |
| 工业革命：伯明翰 | `polls[1].results[0].options[9].value` | 16 |
| 工业革命：伯明翰 | `polls[1].results[0].options[9].numvotes` | 32 |
| 工业革命：伯明翰 | `polls[1].results[0].options[10].value` | 18 |
| 工业革命：伯明翰 | `polls[1].results[0].options[10].numvotes` | 2 |
| 工业革命：伯明翰 | `polls[1].results[0].options[11].value` | 21 and up |
| 工业革命：伯明翰 | `polls[1].results[0].options[11].numvotes` | 1 |
| 工业革命：伯明翰 | `polls[2].name` | language_dependence |
| 工业革命：伯明翰 | `polls[2].title` | Language Dependence |
| 工业革命：伯明翰 | `polls[2].total_votes` | 61 |
| 工业革命：伯明翰 | `polls[2].results[0].attributes` | {} |
| 工业革命：伯明翰 | `polls[2].results[0].options[0].level` | 1 |
| 工业革命：伯明翰 | `polls[2].results[0].options[0].value` | No necessary in-game text |
| 工业革命：伯明翰 | `polls[2].results[0].options[0].numvotes` | 58 |
| 工业革命：伯明翰 | `polls[2].results[0].options[1].level` | 2 |
| 工业革命：伯明翰 | `polls[2].results[0].options[1].value` | Some necessary text - easily memorized or small crib sheet |
| 工业革命：伯明翰 | `polls[2].results[0].options[1].numvotes` | 3 |
| 工业革命：伯明翰 | `polls[2].results[0].options[2].level` | 3 |
| 工业革命：伯明翰 | `polls[2].results[0].options[2].value` | Moderate in-game text - needs crib sheet or paste ups |
| 工业革命：伯明翰 | `polls[2].results[0].options[2].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[2].results[0].options[3].level` | 4 |
| 工业革命：伯明翰 | `polls[2].results[0].options[3].value` | Extensive use of text - massive conversion needed to be playable |
| 工业革命：伯明翰 | `polls[2].results[0].options[3].numvotes` | 0 |
| 工业革命：伯明翰 | `polls[2].results[0].options[4].level` | 5 |
| 工业革命：伯明翰 | `polls[2].results[0].options[4].value` | Unplayable in another language |
| 工业革命：伯明翰 | `polls[2].results[0].options[4].numvotes` | 0 |
| 工业革命：伯明翰 | `links.boardgamecategory[0].id` | 2726 |
| 工业革命：伯明翰 | `links.boardgamecategory[0].name` | Age of Reason |
| 工业革命：伯明翰 | `links.boardgamecategory[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamecategory[1].id` | 1021 |
| 工业革命：伯明翰 | `links.boardgamecategory[1].name` | Economic |
| 工业革命：伯明翰 | `links.boardgamecategory[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamecategory[2].id` | 1088 |
| 工业革命：伯明翰 | `links.boardgamecategory[2].name` | Industry / Manufacturing |
| 工业革命：伯明翰 | `links.boardgamecategory[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamecategory[3].id` | 2710 |
| 工业革命：伯明翰 | `links.boardgamecategory[3].name` | Post-Napoleonic |
| 工业革命：伯明翰 | `links.boardgamecategory[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamecategory[4].id` | 1034 |
| 工业革命：伯明翰 | `links.boardgamecategory[4].name` | Trains |
| 工业革命：伯明翰 | `links.boardgamecategory[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamecategory[5].id` | 1011 |
| 工业革命：伯明翰 | `links.boardgamecategory[5].name` | Transportation |
| 工业革命：伯明翰 | `links.boardgamecategory[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[0].id` | 2956 |
| 工业革命：伯明翰 | `links.boardgamemechanic[0].name` | Chaining |
| 工业革命：伯明翰 | `links.boardgamemechanic[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[1].id` | 2875 |
| 工业革命：伯明翰 | `links.boardgamemechanic[1].name` | End Game Bonuses |
| 工业革命：伯明翰 | `links.boardgamemechanic[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[2].id` | 2040 |
| 工业革命：伯明翰 | `links.boardgamemechanic[2].name` | Hand Management |
| 工业革命：伯明翰 | `links.boardgamemechanic[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[3].id` | 2902 |
| 工业革命：伯明翰 | `links.boardgamemechanic[3].name` | Income |
| 工业革命：伯明翰 | `links.boardgamemechanic[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[4].id` | 2904 |
| 工业革命：伯明翰 | `links.boardgamemechanic[4].name` | Loans |
| 工业革命：伯明翰 | `links.boardgamemechanic[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[5].id` | 2900 |
| 工业革命：伯明翰 | `links.boardgamemechanic[5].name` | Market |
| 工业革命：伯明翰 | `links.boardgamemechanic[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[6].id` | 3099 |
| 工业革命：伯明翰 | `links.boardgamemechanic[6].name` | Multi-Use Cards |
| 工业革命：伯明翰 | `links.boardgamemechanic[6].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[7].id` | 2081 |
| 工业革命：伯明翰 | `links.boardgamemechanic[7].name` | Network and Route Building |
| 工业革命：伯明翰 | `links.boardgamemechanic[7].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[8].id` | 2911 |
| 工业革命：伯明翰 | `links.boardgamemechanic[8].name` | Ownership |
| 工业革命：伯明翰 | `links.boardgamemechanic[8].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[9].id` | 3100 |
| 工业革命：伯明翰 | `links.boardgamemechanic[9].name` | Tags |
| 工业革命：伯明翰 | `links.boardgamemechanic[9].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[10].id` | 2849 |
| 工业革命：伯明翰 | `links.boardgamemechanic[10].name` | Tech Trees / Tech Tracks |
| 工业革命：伯明翰 | `links.boardgamemechanic[10].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[11].id` | 2002 |
| 工业革命：伯明翰 | `links.boardgamemechanic[11].name` | Tile Placement |
| 工业革命：伯明翰 | `links.boardgamemechanic[11].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[12].id` | 2826 |
| 工业革命：伯明翰 | `links.boardgamemechanic[12].name` | Turn Order: Stat-Based |
| 工业革命：伯明翰 | `links.boardgamemechanic[12].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamemechanic[13].id` | 2897 |
| 工业革命：伯明翰 | `links.boardgamemechanic[13].name` | Variable Set-up |
| 工业革命：伯明翰 | `links.boardgamemechanic[13].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[0].id` | 17519 |
| 工业革命：伯明翰 | `links.boardgamefamily[0].name` | Cities: Birmingham (England) |
| 工业革命：伯明翰 | `links.boardgamefamily[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[1].id` | 81601 |
| 工业革命：伯明翰 | `links.boardgamefamily[1].name` | Components: Map (Regional scale) |
| 工业革命：伯明翰 | `links.boardgamefamily[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[2].id` | 65191 |
| 工业革命：伯明翰 | `links.boardgamefamily[2].name` | Components: Multi-Use Cards |
| 工业革命：伯明翰 | `links.boardgamefamily[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[3].id` | 14759 |
| 工业革命：伯明翰 | `links.boardgamefamily[3].name` | Country: England |
| 工业革命：伯明翰 | `links.boardgamefamily[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[4].id` | 17056 |
| 工业革命：伯明翰 | `links.boardgamefamily[4].name` | Country: United Kingdom |
| 工业革命：伯明翰 | `links.boardgamefamily[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[5].id` | 8374 |
| 工业革命：伯明翰 | `links.boardgamefamily[5].name` | Crowdfunding: Kickstarter |
| 工业革命：伯明翰 | `links.boardgamefamily[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[6].id` | 22135 |
| 工业革命：伯明翰 | `links.boardgamefamily[6].name` | Crowdfunding: Spieleschmiede |
| 工业革命：伯明翰 | `links.boardgamefamily[6].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[7].id` | 77349 |
| 工业革命：伯明翰 | `links.boardgamefamily[7].name` | Digital Implementations: Steam |
| 工业革命：伯明翰 | `links.boardgamefamily[7].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[8].id` | 70948 |
| 工业革命：伯明翰 | `links.boardgamefamily[8].name` | Digital Implementations: Tabletopia |
| 工业革命：伯明翰 | `links.boardgamefamily[8].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[9].id` | 81575 |
| 工业革命：伯明翰 | `links.boardgamefamily[9].name` | Digital Implementations: VASSAL |
| 工业革命：伯明翰 | `links.boardgamefamily[9].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[10].id` | 26397 |
| 工业革命：伯明翰 | `links.boardgamefamily[10].name` | Food &amp; Drink: Beer |
| 工业革命：伯明翰 | `links.boardgamefamily[10].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[11].id` | 57499 |
| 工业革命：伯明翰 | `links.boardgamefamily[11].name` | Game: Brass |
| 工业革命：伯明翰 | `links.boardgamefamily[11].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[12].id` | 50152 |
| 工业革命：伯明翰 | `links.boardgamefamily[12].name` | History: Industrial Revolution |
| 工业革命：伯明翰 | `links.boardgamefamily[12].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[13].id` | 59705 |
| 工业革命：伯明翰 | `links.boardgamefamily[13].name` | Misc: LongPack Games |
| 工业革命：伯明翰 | `links.boardgamefamily[13].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[14].id` | 78198 |
| 工业革命：伯明翰 | `links.boardgamefamily[14].name` | Misc: Watch It Played How To Videos |
| 工业革命：伯明翰 | `links.boardgamefamily[14].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[15].id` | 81586 |
| 工业革命：伯明翰 | `links.boardgamefamily[15].name` | Occupation: Engineer |
| 工业革命：伯明翰 | `links.boardgamefamily[15].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[16].id` | 4705 |
| 工业革命：伯明翰 | `links.boardgamefamily[16].name` | Organizations: The Game Artisans of Canada |
| 工业革命：伯明翰 | `links.boardgamefamily[16].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamefamily[17].id` | 66445 |
| 工业革命：伯明翰 | `links.boardgamefamily[17].name` | Theme: Canals |
| 工业革命：伯明翰 | `links.boardgamefamily[17].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[0].id` | 334571 |
| 工业革命：伯明翰 | `links.boardgameaccessory[0].name` | Brass: Birmingham / Lancashire – reDrewno Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[1].id` | 399634 |
| 工业革命：伯明翰 | `links.boardgameaccessory[1].name` | Brass: Birmingham – BGExpansions Upgrade Kit |
| 工业革命：伯明翰 | `links.boardgameaccessory[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[2].id` | 448612 |
| 工业革命：伯明翰 | `links.boardgameaccessory[2].name` | Brass: Birmingham – Board Bento Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[3].id` | 439465 |
| 工业革命：伯明翰 | `links.boardgameaccessory[3].name` | Brass: Birmingham – Česká pravidla a nápovědy |
| 工业革命：伯明翰 | `links.boardgameaccessory[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[4].id` | 447977 |
| 工业革命：伯明翰 | `links.boardgameaccessory[4].name` | Brass: Birmingham – Deluxygames Upgrade Kit |
| 工业革命：伯明翰 | `links.boardgameaccessory[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[5].id` | 309493 |
| 工业革命：伯明翰 | `links.boardgameaccessory[5].name` | Brass: Birmingham – e-Raptor Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[6].id` | 347407 |
| 工业革命：伯明翰 | `links.boardgameaccessory[6].name` | Brass: Birmingham – Game Tamer Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[6].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[7].id` | 419962 |
| 工业革命：伯明翰 | `links.boardgameaccessory[7].name` | Brass: Birmingham – Inserty Herman Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[7].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[8].id` | 430615 |
| 工业革命：伯明翰 | `links.boardgameaccessory[8].name` | Brass: Birmingham – Iron Clays Upgrade |
| 工业革命：伯明翰 | `links.boardgameaccessory[8].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[9].id` | 339385 |
| 工业革命：伯明翰 | `links.boardgameaccessory[9].name` | Brass: Birmingham – Laserox Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[9].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[10].id` | 420437 |
| 工业革命：伯明翰 | `links.boardgameaccessory[10].name` | Brass: Birmingham – Playmat |
| 工业革命：伯明翰 | `links.boardgameaccessory[10].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[11].id` | 373838 |
| 工业革命：伯明翰 | `links.boardgameaccessory[11].name` | Brass: Birmingham – Spike Craft Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[11].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[12].id` | 350761 |
| 工业革命：伯明翰 | `links.boardgameaccessory[12].name` | Brass: Birmingham – The Dicetroyers Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[12].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[13].id` | 348604 |
| 工业革命：伯明翰 | `links.boardgameaccessory[13].name` | Brass: Birmingham – The GiftForge Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[13].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[14].id` | 432279 |
| 工业革命：伯明翰 | `links.boardgameaccessory[14].name` | Brass: Birmingham – Tokens Garden Metal Coins |
| 工业革命：伯明翰 | `links.boardgameaccessory[14].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[15].id` | 340345 |
| 工业革命：伯明翰 | `links.boardgameaccessory[15].name` | Brass: Birmingham – TowerRex Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[15].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[16].id` | 428779 |
| 工业革命：伯明翰 | `links.boardgameaccessory[16].name` | Brass: Birmingham – Upended Games Organizer |
| 工业革命：伯明翰 | `links.boardgameaccessory[16].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[17].id` | 347851 |
| 工业革命：伯明翰 | `links.boardgameaccessory[17].name` | Brass: Birmingham / Lancashire – Eurohell Design Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[17].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[18].id` | 306354 |
| 工业革命：伯明翰 | `links.boardgameaccessory[18].name` | Brass: Birmingham / Lancashire – Folded Space Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[18].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[19].id` | 328775 |
| 工业革命：伯明翰 | `links.boardgameaccessory[19].name` | Brass: Coin-Cases |
| 工业革命：伯明翰 | `links.boardgameaccessory[19].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[20].id` | 349935 |
| 工业革命：伯明翰 | `links.boardgameaccessory[20].name` | Brass: Eurohell Design 3D Locomotive &amp; Barge Upgrade |
| 工业革命：伯明翰 | `links.boardgameaccessory[20].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[21].id` | 268234 |
| 工业革命：伯明翰 | `links.boardgameaccessory[21].name` | Brass: Meeple Realty Insert |
| 工业革命：伯明翰 | `links.boardgameaccessory[21].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[22].id` | 233281 |
| 工业革命：伯明翰 | `links.boardgameaccessory[22].name` | Iron Clays |
| 工业革命：伯明翰 | `links.boardgameaccessory[22].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameaccessory[23].id` | 476766 |
| 工业革命：伯明翰 | `links.boardgameaccessory[23].name` | Iron Coins |
| 工业革命：伯明翰 | `links.boardgameaccessory[23].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameimplementation[0].id` | 452264 |
| 工业革命：伯明翰 | `links.boardgameimplementation[0].name` | Brass: Pittsburgh |
| 工业革命：伯明翰 | `links.boardgameimplementation[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameimplementation[1].id` | 28720 |
| 工业革命：伯明翰 | `links.boardgameimplementation[1].name` | Brass: Lancashire |
| 工业革命：伯明翰 | `links.boardgameimplementation[1].inbound` | true |
| 工业革命：伯明翰 | `links.boardgamedesigner[0].id` | 32887 |
| 工业革命：伯明翰 | `links.boardgamedesigner[0].name` | Gavan Brown |
| 工业革命：伯明翰 | `links.boardgamedesigner[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamedesigner[1].id` | 32943 |
| 工业革命：伯明翰 | `links.boardgamedesigner[1].name` | Matt Tolman |
| 工业革命：伯明翰 | `links.boardgamedesigner[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamedesigner[2].id` | 6 |
| 工业革命：伯明翰 | `links.boardgamedesigner[2].name` | Martin Wallace |
| 工业革命：伯明翰 | `links.boardgamedesigner[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[0].id` | 32887 |
| 工业革命：伯明翰 | `links.boardgameartist[0].name` | Gavan Brown |
| 工业革命：伯明翰 | `links.boardgameartist[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[1].id` | 70571 |
| 工业革命：伯明翰 | `links.boardgameartist[1].name` | Lina Cossette |
| 工业革命：伯明翰 | `links.boardgameartist[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[2].id` | 70568 |
| 工业革命：伯明翰 | `links.boardgameartist[2].name` | David Forest |
| 工业革命：伯明翰 | `links.boardgameartist[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[3].id` | 140907 |
| 工业革命：伯明翰 | `links.boardgameartist[3].name` | Gui Landgraf |
| 工业革命：伯明翰 | `links.boardgameartist[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[4].id` | 38179 |
| 工业革命：伯明翰 | `links.boardgameartist[4].name` | Damien Mammoliti |
| 工业革命：伯明翰 | `links.boardgameartist[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[5].id` | 174251 |
| 工业革命：伯明翰 | `links.boardgameartist[5].name` | Mr. Cuddington |
| 工业革命：伯明翰 | `links.boardgameartist[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgameartist[6].id` | 32943 |
| 工业革命：伯明翰 | `links.boardgameartist[6].name` | Matt Tolman |
| 工业革命：伯明翰 | `links.boardgameartist[6].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[0].id` | 21765 |
| 工业革命：伯明翰 | `links.boardgamepublisher[0].name` | Roxley |
| 工业革命：伯明翰 | `links.boardgamepublisher[0].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[1].id` | 3475 |
| 工业革命：伯明翰 | `links.boardgamepublisher[1].name` | Arclight Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[1].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[2].id` | 44580 |
| 工业革命：伯明翰 | `links.boardgamepublisher[2].name` | Board Game Rookie |
| 工业革命：伯明翰 | `links.boardgamepublisher[2].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[3].id` | 25074 |
| 工业革命：伯明翰 | `links.boardgamepublisher[3].name` | BoardM Factory |
| 工业革命：伯明翰 | `links.boardgamepublisher[3].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[4].id` | 21608 |
| 工业革命：伯明翰 | `links.boardgamepublisher[4].name` | CMON Global Limited |
| 工业革命：伯明翰 | `links.boardgamepublisher[4].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[5].id` | 11043 |
| 工业革命：伯明翰 | `links.boardgamepublisher[5].name` | Conclave Editora |
| 工业革命：伯明翰 | `links.boardgamepublisher[5].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[6].id` | 50696 |
| 工业革命：伯明翰 | `links.boardgamepublisher[6].name` | CoolPlay |
| 工业革命：伯明翰 | `links.boardgamepublisher[6].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[7].id` | 34522 |
| 工业革命：伯明翰 | `links.boardgamepublisher[7].name` | CrowD Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[7].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[8].id` | 31071 |
| 工业革命：伯明翰 | `links.boardgamepublisher[8].name` | Dexker Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[8].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[9].id` | 8832 |
| 工业革命：伯明翰 | `links.boardgamepublisher[9].name` | Funforge |
| 工业革命：伯明翰 | `links.boardgamepublisher[9].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[10].id` | 8820 |
| 工业革命：伯明翰 | `links.boardgamepublisher[10].name` | Gémklub |
| 工业革命：伯明翰 | `links.boardgamepublisher[10].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[11].id` | 4785 |
| 工业革命：伯明翰 | `links.boardgamepublisher[11].name` | Ghenos Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[11].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[12].id` | 42147 |
| 工业革命：伯明翰 | `links.boardgamepublisher[12].name` | Giant Roc |
| 工业革命：伯明翰 | `links.boardgamepublisher[12].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[13].id` | 36210 |
| 工业革命：伯明翰 | `links.boardgamepublisher[13].name` | Lanlalen |
| 工业革命：伯明翰 | `links.boardgamepublisher[13].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[14].id` | 46500 |
| 工业革命：伯明翰 | `links.boardgamepublisher[14].name` | Lord of Boards |
| 工业革命：伯明翰 | `links.boardgamepublisher[14].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[15].id` | 30677 |
| 工业革命：伯明翰 | `links.boardgamepublisher[15].name` | Maldito Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[15].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[16].id` | 36186 |
| 工业革命：伯明翰 | `links.boardgamepublisher[16].name` | PHALANX |
| 工业革命：伯明翰 | `links.boardgamepublisher[16].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[17].id` | 7466 |
| 工业革命：伯明翰 | `links.boardgamepublisher[17].name` | Rebel Sp. z o.o. |
| 工业革命：伯明翰 | `links.boardgamepublisher[17].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[18].id` | 41423 |
| 工业革命：伯明翰 | `links.boardgamepublisher[18].name` | TLAMA games |
| 工业革命：伯明翰 | `links.boardgamepublisher[18].inbound` | null |
| 工业革命：伯明翰 | `links.boardgamepublisher[19].id` | 4932 |
| 工业革命：伯明翰 | `links.boardgamepublisher[19].name` | White Goblin Games |
| 工业革命：伯明翰 | `links.boardgamepublisher[19].inbound` | null |
| 工业革命：伯明翰 | `statistics.users_rated` | 59920 |
| 工业革命：伯明翰 | `statistics.average_rating` | 8.5596 |
| 工业革命：伯明翰 | `statistics.bayes_average` | 8.39003 |
| 工业革命：伯明翰 | `statistics.stddev` | 1.43246 |
| 工业革命：伯明翰 | `statistics.median` | 0 |
| 工业革命：伯明翰 | `statistics.owned` | 86075 |
| 工业革命：伯明翰 | `statistics.trading` | 393 |
| 工业革命：伯明翰 | `statistics.wanting` | 1724 |
| 工业革命：伯明翰 | `statistics.wishing` | 22328 |
| 工业革命：伯明翰 | `statistics.num_comments` | 8129 |
| 工业革命：伯明翰 | `statistics.num_weights` | 2929 |
| 工业革命：伯明翰 | `statistics.average_weight` | 3.86 |
| 工业革命：伯明翰 | `statistics.ranks[0].type` | subtype |
| 工业革命：伯明翰 | `statistics.ranks[0].id` | 1 |
| 工业革命：伯明翰 | `statistics.ranks[0].name` | boardgame |
| 工业革命：伯明翰 | `statistics.ranks[0].friendlyname` | Board Game Rank |
| 工业革命：伯明翰 | `statistics.ranks[0].value` | 1 |
| 工业革命：伯明翰 | `statistics.ranks[0].bayesaverage` | 8.39003 |
| 工业革命：伯明翰 | `statistics.ranks[1].type` | family |
| 工业革命：伯明翰 | `statistics.ranks[1].id` | 5497 |
| 工业革命：伯明翰 | `statistics.ranks[1].name` | strategygames |
| 工业革命：伯明翰 | `statistics.ranks[1].friendlyname` | Strategy Game Rank |
| 工业革命：伯明翰 | `statistics.ranks[1].value` | 1 |
| 工业革命：伯明翰 | `statistics.ranks[1].bayesaverage` | 8.40136 |
| 工业革命：伯明翰 | `versions_count` | 37 |
| 工业革命：伯明翰 | `versions[0].tag` | item |
| 工业革命：伯明翰 | `versions[0].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[0].attributes.id` | 523778 |
| 工业革命：伯明翰 | `versions[0].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[0].children[0].text` | https://cf.geekdo-images.com/9R-zfmWa3EjsPeFNWypmGA__small/img/iOC9MDdy9NgMQOSzPWM2L-nlGeU=/fit-in/200x150/filters:strip_icc()/pic5616885.jpg |
| 工业革命：伯明翰 | `versions[0].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[0].children[1].text` | https://cf.geekdo-images.com/9R-zfmWa3EjsPeFNWypmGA__original/img/T1J2gjL0K5NlqGx4Xfm5jD-R3m0=/0x0/filters:format(jpeg)/pic5616885.jpg |
| 工业革命：伯明翰 | `versions[0].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[0].children[2].attributes.value` | 工業革命：伯明翰 |
| 工业革命：伯明翰 | `versions[0].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[0].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[0].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[0].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[0].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[0].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[0].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[0].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[0].children[4].attributes.value` | Chinese edition |
| 工业革命：伯明翰 | `versions[0].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[0].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[0].children[5].attributes.id` | 44580 |
| 工业革命：伯明翰 | `versions[0].children[5].attributes.value` | Board Game Rookie |
| 工业革命：伯明翰 | `versions[0].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[0].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[0].children[6].attributes.id` | 31071 |
| 工业革命：伯明翰 | `versions[0].children[6].attributes.value` | Dexker Games |
| 工业革命：伯明翰 | `versions[0].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[0].children[7].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[0].children[7].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[0].children[7].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[0].children[8].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[0].children[8].attributes.value` | 2020 |
| 工业革命：伯明翰 | `versions[0].children[9].tag` | productcode |
| 工业革命：伯明翰 | `versions[0].children[9].attributes.value` |  |
| 工业革命：伯明翰 | `versions[0].children[10].tag` | width |
| 工业革命：伯明翰 | `versions[0].children[10].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[0].children[11].tag` | length |
| 工业革命：伯明翰 | `versions[0].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[0].children[12].tag` | depth |
| 工业革命：伯明翰 | `versions[0].children[12].attributes.value` | 2.95276 |
| 工业革命：伯明翰 | `versions[0].children[13].tag` | weight |
| 工业革命：伯明翰 | `versions[0].children[13].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[0].children[14].tag` | link |
| 工业革命：伯明翰 | `versions[0].children[14].attributes.type` | language |
| 工业革命：伯明翰 | `versions[0].children[14].attributes.id` | 2181 |
| 工业革命：伯明翰 | `versions[0].children[14].attributes.value` | Chinese |
| 工业革命：伯明翰 | `versions[1].tag` | item |
| 工业革命：伯明翰 | `versions[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[1].attributes.id` | 712133 |
| 工业革命：伯明翰 | `versions[1].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[1].children[0].text` | https://cf.geekdo-images.com/9d9YmbOjTy7-rjwWM_jTfg__small/img/M9G60xEQ1RA-88Zjud7ydZof_RE=/fit-in/200x150/filters:strip_icc()/pic8170404.jpg |
| 工业革命：伯明翰 | `versions[1].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[1].children[1].text` | https://cf.geekdo-images.com/9d9YmbOjTy7-rjwWM_jTfg__original/img/0J9MZpCtvNGn8EdYT37l9UIdfK0=/0x0/filters:format(jpeg)/pic8170404.jpg |
| 工业革命：伯明翰 | `versions[1].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[1].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[1].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[1].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[1].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[1].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[1].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[1].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[1].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[1].children[4].attributes.value` | Czech edition 2024 |
| 工业革命：伯明翰 | `versions[1].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[1].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[1].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[1].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[1].children[6].attributes.id` | 41423 |
| 工业革命：伯明翰 | `versions[1].children[6].attributes.value` | TLAMA games |
| 工业革命：伯明翰 | `versions[1].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[1].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[1].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[1].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[1].children[8].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[1].children[8].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[1].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[1].children[9].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[1].children[9].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[1].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[10].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[1].children[10].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[1].children[10].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[1].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[11].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[1].children[11].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[1].children[11].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[1].children[12].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[1].children[12].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[1].children[13].tag` | productcode |
| 工业革命：伯明翰 | `versions[1].children[13].attributes.value` | TLG0200 |
| 工业革命：伯明翰 | `versions[1].children[14].tag` | width |
| 工业革命：伯明翰 | `versions[1].children[14].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[1].children[15].tag` | length |
| 工业革命：伯明翰 | `versions[1].children[15].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[1].children[16].tag` | depth |
| 工业革命：伯明翰 | `versions[1].children[16].attributes.value` | 2.04724 |
| 工业革命：伯明翰 | `versions[1].children[17].tag` | weight |
| 工业革命：伯明翰 | `versions[1].children[17].attributes.value` | 4.3894 |
| 工业革命：伯明翰 | `versions[1].children[18].tag` | link |
| 工业革命：伯明翰 | `versions[1].children[18].attributes.type` | language |
| 工业革命：伯明翰 | `versions[1].children[18].attributes.id` | 2180 |
| 工业革命：伯明翰 | `versions[1].children[18].attributes.value` | Czech |
| 工业革命：伯明翰 | `versions[2].tag` | item |
| 工业革命：伯明翰 | `versions[2].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[2].attributes.id` | 745587 |
| 工业革命：伯明翰 | `versions[2].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[2].children[0].text` | https://cf.geekdo-images.com/9d9YmbOjTy7-rjwWM_jTfg__small/img/M9G60xEQ1RA-88Zjud7ydZof_RE=/fit-in/200x150/filters:strip_icc()/pic8170404.jpg |
| 工业革命：伯明翰 | `versions[2].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[2].children[1].text` | https://cf.geekdo-images.com/9d9YmbOjTy7-rjwWM_jTfg__original/img/0J9MZpCtvNGn8EdYT37l9UIdfK0=/0x0/filters:format(jpeg)/pic8170404.jpg |
| 工业革命：伯明翰 | `versions[2].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[2].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[2].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[2].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[2].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[2].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[2].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[2].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[2].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[2].children[4].attributes.value` | Czech edition 2025 |
| 工业革命：伯明翰 | `versions[2].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[2].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[2].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[2].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[2].children[6].attributes.id` | 41423 |
| 工业革命：伯明翰 | `versions[2].children[6].attributes.value` | TLAMA games |
| 工业革命：伯明翰 | `versions[2].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[2].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[2].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[2].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[2].children[8].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[2].children[8].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[2].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[2].children[9].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[2].children[9].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[2].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[10].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[2].children[10].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[2].children[10].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[2].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[11].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[2].children[11].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[2].children[11].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[2].children[12].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[2].children[12].attributes.value` | 2025 |
| 工业革命：伯明翰 | `versions[2].children[13].tag` | productcode |
| 工业革命：伯明翰 | `versions[2].children[13].attributes.value` | TLG0200 |
| 工业革命：伯明翰 | `versions[2].children[14].tag` | width |
| 工业革命：伯明翰 | `versions[2].children[14].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[2].children[15].tag` | length |
| 工业革命：伯明翰 | `versions[2].children[15].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[2].children[16].tag` | depth |
| 工业革命：伯明翰 | `versions[2].children[16].attributes.value` | 2.04724 |
| 工业革命：伯明翰 | `versions[2].children[17].tag` | weight |
| 工业革命：伯明翰 | `versions[2].children[17].attributes.value` | 4.3894 |
| 工业革命：伯明翰 | `versions[2].children[18].tag` | link |
| 工业革命：伯明翰 | `versions[2].children[18].attributes.type` | language |
| 工业革命：伯明翰 | `versions[2].children[18].attributes.id` | 2180 |
| 工业革命：伯明翰 | `versions[2].children[18].attributes.value` | Czech |
| 工业革命：伯明翰 | `versions[3].tag` | item |
| 工业革命：伯明翰 | `versions[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[3].attributes.id` | 558467 |
| 工业革命：伯明翰 | `versions[3].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[3].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[3].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[3].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[3].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[3].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[3].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[3].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[3].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[3].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[3].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[3].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[3].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[3].children[4].attributes.value` | Czech/English edition, first printing |
| 工业革命：伯明翰 | `versions[3].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[3].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[3].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[3].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[3].children[6].attributes.id` | 41423 |
| 工业革命：伯明翰 | `versions[3].children[6].attributes.value` | TLAMA games |
| 工业革命：伯明翰 | `versions[3].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[3].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[3].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[3].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[3].children[8].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[3].children[8].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[3].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[3].children[9].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[3].children[9].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[3].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[10].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[3].children[10].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[3].children[10].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[3].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[11].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[3].children[11].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[3].children[11].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[3].children[12].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[3].children[12].attributes.value` | 2020 |
| 工业革命：伯明翰 | `versions[3].children[13].tag` | productcode |
| 工业革命：伯明翰 | `versions[3].children[13].attributes.value` | TLG0200 |
| 工业革命：伯明翰 | `versions[3].children[14].tag` | width |
| 工业革命：伯明翰 | `versions[3].children[14].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[3].children[15].tag` | length |
| 工业革命：伯明翰 | `versions[3].children[15].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[3].children[16].tag` | depth |
| 工业革命：伯明翰 | `versions[3].children[16].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[3].children[17].tag` | weight |
| 工业革命：伯明翰 | `versions[3].children[17].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[3].children[18].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[18].attributes.type` | language |
| 工业革命：伯明翰 | `versions[3].children[18].attributes.id` | 2180 |
| 工业革命：伯明翰 | `versions[3].children[18].attributes.value` | Czech |
| 工业革命：伯明翰 | `versions[3].children[19].tag` | link |
| 工业革命：伯明翰 | `versions[3].children[19].attributes.type` | language |
| 工业革命：伯明翰 | `versions[3].children[19].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[3].children[19].attributes.value` | English |
| 工业革命：伯明翰 | `versions[4].tag` | item |
| 工业革命：伯明翰 | `versions[4].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[4].attributes.id` | 712131 |
| 工业革命：伯明翰 | `versions[4].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[4].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[4].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[4].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[4].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[4].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[4].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[4].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[4].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[4].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[4].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[4].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[4].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[4].children[4].attributes.value` | Czech/English edition, second printing |
| 工业革命：伯明翰 | `versions[4].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[4].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[4].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[4].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[4].children[6].attributes.id` | 41423 |
| 工业革命：伯明翰 | `versions[4].children[6].attributes.value` | TLAMA games |
| 工业革命：伯明翰 | `versions[4].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[4].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[4].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[4].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[4].children[8].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[4].children[8].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[4].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[4].children[9].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[4].children[9].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[4].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[10].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[4].children[10].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[4].children[10].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[4].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[11].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[4].children[11].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[4].children[11].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[4].children[12].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[4].children[12].attributes.value` | 2021 |
| 工业革命：伯明翰 | `versions[4].children[13].tag` | productcode |
| 工业革命：伯明翰 | `versions[4].children[13].attributes.value` | TLG0200 |
| 工业革命：伯明翰 | `versions[4].children[14].tag` | width |
| 工业革命：伯明翰 | `versions[4].children[14].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[4].children[15].tag` | length |
| 工业革命：伯明翰 | `versions[4].children[15].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[4].children[16].tag` | depth |
| 工业革命：伯明翰 | `versions[4].children[16].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[4].children[17].tag` | weight |
| 工业革命：伯明翰 | `versions[4].children[17].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[4].children[18].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[18].attributes.type` | language |
| 工业革命：伯明翰 | `versions[4].children[18].attributes.id` | 2180 |
| 工业革命：伯明翰 | `versions[4].children[18].attributes.value` | Czech |
| 工业革命：伯明翰 | `versions[4].children[19].tag` | link |
| 工业革命：伯明翰 | `versions[4].children[19].attributes.type` | language |
| 工业革命：伯明翰 | `versions[4].children[19].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[4].children[19].attributes.value` | English |
| 工业革命：伯明翰 | `versions[5].tag` | item |
| 工业革命：伯明翰 | `versions[5].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[5].attributes.id` | 712132 |
| 工业革命：伯明翰 | `versions[5].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[5].children[0].text` | https://cf.geekdo-images.com/lhRe_x7MmP1AWAvAL59nBg__small/img/lp4739q6Rp8IoC7q0M9-1RB0Eu4=/fit-in/200x150/filters:strip_icc()/pic6460781.jpg |
| 工业革命：伯明翰 | `versions[5].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[5].children[1].text` | https://cf.geekdo-images.com/lhRe_x7MmP1AWAvAL59nBg__original/img/7PhvFj9b00vG5rfcnU-F6rDTB4o=/0x0/filters:format(jpeg)/pic6460781.jpg |
| 工业革命：伯明翰 | `versions[5].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[5].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[5].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[5].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[5].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[5].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[5].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[5].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[5].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[5].children[4].attributes.value` | Czech/English edition, third printing |
| 工业革命：伯明翰 | `versions[5].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[5].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[5].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[5].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[5].children[6].attributes.id` | 41423 |
| 工业革命：伯明翰 | `versions[5].children[6].attributes.value` | TLAMA games |
| 工业革命：伯明翰 | `versions[5].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[5].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[5].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[5].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[5].children[8].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[5].children[8].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[5].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[5].children[9].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[5].children[9].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[5].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[10].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[5].children[10].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[5].children[10].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[5].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[11].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[5].children[11].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[5].children[11].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[5].children[12].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[5].children[12].attributes.value` | 2021 |
| 工业革命：伯明翰 | `versions[5].children[13].tag` | productcode |
| 工业革命：伯明翰 | `versions[5].children[13].attributes.value` | TLG0200 |
| 工业革命：伯明翰 | `versions[5].children[14].tag` | width |
| 工业革命：伯明翰 | `versions[5].children[14].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[5].children[15].tag` | length |
| 工业革命：伯明翰 | `versions[5].children[15].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[5].children[16].tag` | depth |
| 工业革命：伯明翰 | `versions[5].children[16].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[5].children[17].tag` | weight |
| 工业革命：伯明翰 | `versions[5].children[17].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[5].children[18].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[18].attributes.type` | language |
| 工业革命：伯明翰 | `versions[5].children[18].attributes.id` | 2180 |
| 工业革命：伯明翰 | `versions[5].children[18].attributes.value` | Czech |
| 工业革命：伯明翰 | `versions[5].children[19].tag` | link |
| 工业革命：伯明翰 | `versions[5].children[19].attributes.type` | language |
| 工业革命：伯明翰 | `versions[5].children[19].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[5].children[19].attributes.value` | English |
| 工业革命：伯明翰 | `versions[6].tag` | item |
| 工业革命：伯明翰 | `versions[6].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[6].attributes.id` | 665397 |
| 工业革命：伯明翰 | `versions[6].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[6].children[0].text` | https://cf.geekdo-images.com/8iTEifKvkVQvki7Ta2R-hQ__small/img/9qCbo_MMXXn0eCSdgmfH2XKfOOk=/fit-in/200x150/filters:strip_icc()/pic8269836.jpg |
| 工业革命：伯明翰 | `versions[6].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[6].children[1].text` | https://cf.geekdo-images.com/8iTEifKvkVQvki7Ta2R-hQ__original/img/kRy_2MBTSeX49eYWs-pKEjdzTTk=/0x0/filters:format(jpeg)/pic8269836.jpg |
| 工业革命：伯明翰 | `versions[6].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[6].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[6].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[6].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[6].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[6].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[6].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[6].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[6].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[6].children[4].attributes.value` | Dutch edition |
| 工业革命：伯明翰 | `versions[6].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[6].children[5].attributes.id` | 4932 |
| 工业革命：伯明翰 | `versions[6].children[5].attributes.value` | White Goblin Games |
| 工业革命：伯明翰 | `versions[6].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[6].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[6].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[6].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[6].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[6].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[6].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[6].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[6].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[6].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[6].children[9].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[6].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[6].children[10].attributes.value` | 2416 |
| 工业革命：伯明翰 | `versions[6].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[6].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[6].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[6].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[6].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[6].children[13].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[6].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[6].children[14].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[6].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[6].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[6].children[15].attributes.id` | 2183 |
| 工业革命：伯明翰 | `versions[6].children[15].attributes.value` | Dutch |
| 工业革命：伯明翰 | `versions[7].tag` | item |
| 工业革命：伯明翰 | `versions[7].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[7].attributes.id` | 796555 |
| 工业革命：伯明翰 | `versions[7].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[7].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[7].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[7].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[7].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[7].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[7].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[7].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[7].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[7].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[7].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[7].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[7].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[7].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[7].children[4].attributes.value` | English Collector's edition |
| 工业革命：伯明翰 | `versions[7].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[7].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[7].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[7].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[7].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[7].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[7].children[6].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[7].children[6].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[7].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[7].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[7].children[7].attributes.id` | 174251 |
| 工业革命：伯明翰 | `versions[7].children[7].attributes.value` | Mr. Cuddington |
| 工业革命：伯明翰 | `versions[7].children[8].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[7].children[8].attributes.value` | 2027 |
| 工业革命：伯明翰 | `versions[7].children[9].tag` | productcode |
| 工业革命：伯明翰 | `versions[7].children[9].attributes.value` |  |
| 工业革命：伯明翰 | `versions[7].children[10].tag` | width |
| 工业革命：伯明翰 | `versions[7].children[10].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[7].children[11].tag` | length |
| 工业革命：伯明翰 | `versions[7].children[11].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[7].children[12].tag` | depth |
| 工业革命：伯明翰 | `versions[7].children[12].attributes.value` | 2.75 |
| 工业革命：伯明翰 | `versions[7].children[13].tag` | weight |
| 工业革命：伯明翰 | `versions[7].children[13].attributes.value` | 7.5 |
| 工业革命：伯明翰 | `versions[7].children[14].tag` | link |
| 工业革命：伯明翰 | `versions[7].children[14].attributes.type` | language |
| 工业革命：伯明翰 | `versions[7].children[14].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[7].children[14].attributes.value` | English |
| 工业革命：伯明翰 | `versions[8].tag` | item |
| 工业革命：伯明翰 | `versions[8].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[8].attributes.id` | 417443 |
| 工业革命：伯明翰 | `versions[8].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[8].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[8].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[8].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[8].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[8].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[8].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[8].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[8].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[8].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[8].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[8].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[8].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[8].children[4].attributes.value` | English deluxe edition |
| 工业革命：伯明翰 | `versions[8].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[8].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[8].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[8].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[8].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[8].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[8].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[8].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[8].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[8].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[8].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[8].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[8].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[8].children[9].attributes.value` | 2018 |
| 工业革命：伯明翰 | `versions[8].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[8].children[10].attributes.value` | ROX404 |
| 工业革命：伯明翰 | `versions[8].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[8].children[11].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[8].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[8].children[12].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[8].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[8].children[13].attributes.value` | 3.125 |
| 工业革命：伯明翰 | `versions[8].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[8].children[14].attributes.value` | 6.61387 |
| 工业革命：伯明翰 | `versions[8].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[8].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[8].children[15].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[8].children[15].attributes.value` | English |
| 工业革命：伯明翰 | `versions[9].tag` | item |
| 工业革命：伯明翰 | `versions[9].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[9].attributes.id` | 351052 |
| 工业革命：伯明翰 | `versions[9].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[9].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[9].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[9].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[9].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[9].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[9].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[9].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[9].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[9].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[9].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[9].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[9].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[9].children[4].attributes.value` | English retail edition |
| 工业革命：伯明翰 | `versions[9].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[9].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[9].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[9].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[9].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[9].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[9].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[9].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[9].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[9].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[9].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[9].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[9].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[9].children[9].attributes.value` | 2018 |
| 工业革命：伯明翰 | `versions[9].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[9].children[10].attributes.value` | ROX402 |
| 工业革命：伯明翰 | `versions[9].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[9].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[9].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[9].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[9].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[9].children[13].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[9].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[9].children[14].attributes.value` | 4.62971 |
| 工业革命：伯明翰 | `versions[9].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[9].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[9].children[15].attributes.id` | 2184 |
| 工业革命：伯明翰 | `versions[9].children[15].attributes.value` | English |
| 工业革命：伯明翰 | `versions[10].tag` | item |
| 工业革命：伯明翰 | `versions[10].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[10].attributes.id` | 796556 |
| 工业革命：伯明翰 | `versions[10].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[10].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[10].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[10].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[10].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[10].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[10].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[10].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[10].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[10].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[10].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[10].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[10].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[10].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[10].children[4].attributes.value` | French Collector's edition |
| 工业革命：伯明翰 | `versions[10].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[10].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[10].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[10].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[10].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[10].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[10].children[6].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[10].children[6].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[10].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[10].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[10].children[7].attributes.id` | 174251 |
| 工业革命：伯明翰 | `versions[10].children[7].attributes.value` | Mr. Cuddington |
| 工业革命：伯明翰 | `versions[10].children[8].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[10].children[8].attributes.value` | 2027 |
| 工业革命：伯明翰 | `versions[10].children[9].tag` | productcode |
| 工业革命：伯明翰 | `versions[10].children[9].attributes.value` |  |
| 工业革命：伯明翰 | `versions[10].children[10].tag` | width |
| 工业革命：伯明翰 | `versions[10].children[10].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[10].children[11].tag` | length |
| 工业革命：伯明翰 | `versions[10].children[11].attributes.value` | 11.75 |
| 工业革命：伯明翰 | `versions[10].children[12].tag` | depth |
| 工业革命：伯明翰 | `versions[10].children[12].attributes.value` | 2.75 |
| 工业革命：伯明翰 | `versions[10].children[13].tag` | weight |
| 工业革命：伯明翰 | `versions[10].children[13].attributes.value` | 7.5 |
| 工业革命：伯明翰 | `versions[10].children[14].tag` | link |
| 工业革命：伯明翰 | `versions[10].children[14].attributes.type` | language |
| 工业革命：伯明翰 | `versions[10].children[14].attributes.id` | 2187 |
| 工业革命：伯明翰 | `versions[10].children[14].attributes.value` | French |
| 工业革命：伯明翰 | `versions[11].tag` | item |
| 工业革命：伯明翰 | `versions[11].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[11].attributes.id` | 435701 |
| 工业革命：伯明翰 | `versions[11].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[11].children[0].text` | https://cf.geekdo-images.com/l6mWYf4tFvqKKDhBR7oZ1w__small/img/OBNw8riExHIUgjCNtw8MPvhiAzQ=/fit-in/200x150/filters:strip_icc()/pic5701621.jpg |
| 工业革命：伯明翰 | `versions[11].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[11].children[1].text` | https://cf.geekdo-images.com/l6mWYf4tFvqKKDhBR7oZ1w__original/img/1lkhrXd4DCEQkZOSj2mDuWWDuS4=/0x0/filters:format(jpeg)/pic5701621.jpg |
| 工业革命：伯明翰 | `versions[11].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[11].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[11].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[11].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[11].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[11].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[11].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[11].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[11].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[11].children[4].attributes.value` | French edition |
| 工业革命：伯明翰 | `versions[11].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[11].children[5].attributes.id` | 8832 |
| 工业革命：伯明翰 | `versions[11].children[5].attributes.value` | Funforge |
| 工业革命：伯明翰 | `versions[11].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[11].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[11].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[11].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[11].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[11].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[11].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[11].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[11].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[11].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[11].children[9].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[11].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[11].children[10].attributes.value` |  |
| 工业革命：伯明翰 | `versions[11].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[11].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[11].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[11].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[11].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[11].children[13].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[11].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[11].children[14].attributes.value` | 4.62971 |
| 工业革命：伯明翰 | `versions[11].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[11].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[11].children[15].attributes.id` | 2187 |
| 工业革命：伯明翰 | `versions[11].children[15].attributes.value` | French |
| 工业革命：伯明翰 | `versions[12].tag` | item |
| 工业革命：伯明翰 | `versions[12].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[12].attributes.id` | 797582 |
| 工业革命：伯明翰 | `versions[12].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[12].children[0].text` | https://cf.geekdo-images.com/bqziHWQBkViBTYD3smR7DQ__small/img/1SHly3mPBeG88M5i1XUnvogCt_0=/fit-in/200x150/filters:strip_icc()/pic9513604.png |
| 工业革命：伯明翰 | `versions[12].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[12].children[1].text` | https://cf.geekdo-images.com/bqziHWQBkViBTYD3smR7DQ__original/img/WQ_dwnY8FiZ-A6NuOMeaCqV8-9A=/0x0/filters:format(png)/pic9513604.png |
| 工业革命：伯明翰 | `versions[12].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[12].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[12].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[12].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[12].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[12].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[12].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[12].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[12].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[12].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[12].children[4].attributes.value` | German Collector's edition |
| 工业革命：伯明翰 | `versions[12].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[12].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[12].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[12].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[12].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[12].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[12].children[6].attributes.id` | 174251 |
| 工业革命：伯明翰 | `versions[12].children[6].attributes.value` | Mr. Cuddington |
| 工业革命：伯明翰 | `versions[12].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[12].children[7].attributes.value` | 2027 |
| 工业革命：伯明翰 | `versions[12].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[12].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[12].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[12].children[9].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[12].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[12].children[10].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[12].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[12].children[11].attributes.value` | 2.8 |
| 工业革命：伯明翰 | `versions[12].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[12].children[12].attributes.value` | 7.49572 |
| 工业革命：伯明翰 | `versions[12].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[12].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[12].children[13].attributes.id` | 2188 |
| 工业革命：伯明翰 | `versions[12].children[13].attributes.value` | German |
| 工业革命：伯明翰 | `versions[13].tag` | item |
| 工业革命：伯明翰 | `versions[13].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[13].attributes.id` | 679588 |
| 工业革命：伯明翰 | `versions[13].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[13].children[0].text` | https://cf.geekdo-images.com/oI0mcIkMrJILvT81xHr_sw__small/img/sQ8rvqmOoe-B2vgPdGhylT8RT34=/fit-in/200x150/filters:strip_icc()/pic8209332.png |
| 工业革命：伯明翰 | `versions[13].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[13].children[1].text` | https://cf.geekdo-images.com/oI0mcIkMrJILvT81xHr_sw__original/img/wnIZITV2ak4AFkI-ieV9P6B-caI=/0x0/filters:format(png)/pic8209332.png |
| 工业革命：伯明翰 | `versions[13].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[13].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[13].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[13].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[13].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[13].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[13].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[13].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[13].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[13].children[4].attributes.value` | German Deluxe edition |
| 工业革命：伯明翰 | `versions[13].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[13].children[5].attributes.id` | 42147 |
| 工业革命：伯明翰 | `versions[13].children[5].attributes.value` | Giant Roc |
| 工业革命：伯明翰 | `versions[13].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[13].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[13].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[13].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[13].children[7].attributes.id` | 32887 |
| 工业革命：伯明翰 | `versions[13].children[7].attributes.value` | Gavan Brown |
| 工业革命：伯明翰 | `versions[13].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[13].children[8].attributes.id` | 32943 |
| 工业革命：伯明翰 | `versions[13].children[8].attributes.value` | Matt Tolman |
| 工业革命：伯明翰 | `versions[13].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[13].children[9].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[13].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[13].children[10].attributes.value` | 1030333 |
| 工业革命：伯明翰 | `versions[13].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[13].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[13].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[13].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[13].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[13].children[13].attributes.value` | 2.95276 |
| 工业革命：伯明翰 | `versions[13].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[13].children[14].attributes.value` | 6.52568 |
| 工业革命：伯明翰 | `versions[13].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[13].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[13].children[15].attributes.id` | 2188 |
| 工业革命：伯明翰 | `versions[13].children[15].attributes.value` | German |
| 工业革命：伯明翰 | `versions[14].tag` | item |
| 工业革命：伯明翰 | `versions[14].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[14].attributes.id` | 716304 |
| 工业革命：伯明翰 | `versions[14].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[14].children[0].text` | https://cf.geekdo-images.com/LNdfksWVXnfq7LwMpITUsw__small/img/zLaBx-LElUbfhSb2wAIniR2sQPY=/fit-in/200x150/filters:strip_icc()/pic8235271.jpg |
| 工业革命：伯明翰 | `versions[14].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[14].children[1].text` | https://cf.geekdo-images.com/LNdfksWVXnfq7LwMpITUsw__original/img/1ZtCKR7o9xZI9ZnIJy7Bh3xh4N4=/0x0/filters:format(jpeg)/pic8235271.jpg |
| 工业革命：伯明翰 | `versions[14].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[14].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[14].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[14].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[14].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[14].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[14].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[14].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[14].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[14].children[4].attributes.value` | German edition 2024 |
| 工业革命：伯明翰 | `versions[14].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[14].children[5].attributes.id` | 42147 |
| 工业革命：伯明翰 | `versions[14].children[5].attributes.value` | Giant Roc |
| 工业革命：伯明翰 | `versions[14].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[14].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[14].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[14].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[14].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[14].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[14].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[14].children[8].attributes.id` | 140907 |
| 工业革命：伯明翰 | `versions[14].children[8].attributes.value` | Gui Landgraf |
| 工业革命：伯明翰 | `versions[14].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[14].children[9].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[14].children[9].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[14].children[10].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[14].children[10].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[14].children[11].tag` | productcode |
| 工业革命：伯明翰 | `versions[14].children[11].attributes.value` | 1024947/3 |
| 工业革命：伯明翰 | `versions[14].children[12].tag` | width |
| 工业革命：伯明翰 | `versions[14].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[14].children[13].tag` | length |
| 工业革命：伯明翰 | `versions[14].children[13].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[14].children[14].tag` | depth |
| 工业革命：伯明翰 | `versions[14].children[14].attributes.value` | 2.00787 |
| 工业革命：伯明翰 | `versions[14].children[15].tag` | weight |
| 工业革命：伯明翰 | `versions[14].children[15].attributes.value` | 3.95068 |
| 工业革命：伯明翰 | `versions[14].children[16].tag` | link |
| 工业革命：伯明翰 | `versions[14].children[16].attributes.type` | language |
| 工业革命：伯明翰 | `versions[14].children[16].attributes.id` | 2188 |
| 工业革命：伯明翰 | `versions[14].children[16].attributes.value` | German |
| 工业革命：伯明翰 | `versions[15].tag` | item |
| 工业革命：伯明翰 | `versions[15].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[15].attributes.id` | 491771 |
| 工业革命：伯明翰 | `versions[15].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[15].children[0].text` | https://cf.geekdo-images.com/ALAZxvaFvC7-Sz_uTnlruQ__small/img/Q4L912_ga5qNRodHxPs07_F4pyM=/fit-in/200x150/filters:strip_icc()/pic5692453.jpg |
| 工业革命：伯明翰 | `versions[15].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[15].children[1].text` | https://cf.geekdo-images.com/ALAZxvaFvC7-Sz_uTnlruQ__original/img/_2UFSmK6d2SkWEXdGG-ChZSJdG8=/0x0/filters:format(jpeg)/pic5692453.jpg |
| 工业革命：伯明翰 | `versions[15].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[15].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[15].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[15].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[15].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[15].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[15].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[15].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[15].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[15].children[4].attributes.value` | German first edition |
| 工业革命：伯明翰 | `versions[15].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[15].children[5].attributes.id` | 42147 |
| 工业革命：伯明翰 | `versions[15].children[5].attributes.value` | Giant Roc |
| 工业革命：伯明翰 | `versions[15].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[15].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[15].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[15].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[15].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[15].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[15].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[15].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[15].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[15].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[15].children[9].attributes.value` | 2020 |
| 工业革命：伯明翰 | `versions[15].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[15].children[10].attributes.value` | 1024947 |
| 工业革命：伯明翰 | `versions[15].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[15].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[15].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[15].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[15].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[15].children[13].attributes.value` | 2.12598 |
| 工业革命：伯明翰 | `versions[15].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[15].children[14].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[15].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[15].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[15].children[15].attributes.id` | 2188 |
| 工业革命：伯明翰 | `versions[15].children[15].attributes.value` | German |
| 工业革命：伯明翰 | `versions[16].tag` | item |
| 工业革命：伯明翰 | `versions[16].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[16].attributes.id` | 645968 |
| 工业革命：伯明翰 | `versions[16].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[16].children[0].text` | https://cf.geekdo-images.com/VRMid8ctoFzKB1ldc2mz5w__small/img/yH1FdauYpGKr32o4s14n9Iovu9c=/fit-in/200x150/filters:strip_icc()/pic7277096.jpg |
| 工业革命：伯明翰 | `versions[16].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[16].children[1].text` | https://cf.geekdo-images.com/VRMid8ctoFzKB1ldc2mz5w__original/img/X0pZg-8y9XIcce4GibbndO3VdlI=/0x0/filters:format(jpeg)/pic7277096.jpg |
| 工业革命：伯明翰 | `versions[16].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[16].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[16].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[16].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[16].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[16].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[16].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[16].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[16].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[16].children[4].attributes.value` | German second edition |
| 工业革命：伯明翰 | `versions[16].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[16].children[5].attributes.id` | 42147 |
| 工业革命：伯明翰 | `versions[16].children[5].attributes.value` | Giant Roc |
| 工业革命：伯明翰 | `versions[16].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[16].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[16].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[16].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[16].children[7].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[16].children[7].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[16].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[16].children[8].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[16].children[8].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[16].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[16].children[9].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[16].children[9].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[16].children[10].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[16].children[10].attributes.value` | 2022 |
| 工业革命：伯明翰 | `versions[16].children[11].tag` | productcode |
| 工业革命：伯明翰 | `versions[16].children[11].attributes.value` | GP-C0122 |
| 工业革命：伯明翰 | `versions[16].children[12].tag` | width |
| 工业革命：伯明翰 | `versions[16].children[12].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[16].children[13].tag` | length |
| 工业革命：伯明翰 | `versions[16].children[13].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[16].children[14].tag` | depth |
| 工业革命：伯明翰 | `versions[16].children[14].attributes.value` | 2.8 |
| 工业革命：伯明翰 | `versions[16].children[15].tag` | weight |
| 工业革命：伯明翰 | `versions[16].children[15].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[16].children[16].tag` | link |
| 工业革命：伯明翰 | `versions[16].children[16].attributes.type` | language |
| 工业革命：伯明翰 | `versions[16].children[16].attributes.id` | 2188 |
| 工业革命：伯明翰 | `versions[16].children[16].attributes.value` | German |
| 工业革命：伯明翰 | `versions[17].tag` | item |
| 工业革命：伯明翰 | `versions[17].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[17].attributes.id` | 512824 |
| 工业革命：伯明翰 | `versions[17].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[17].children[0].text` | https://cf.geekdo-images.com/GBf0SSOG_LG03_UV-M2zFg__small/img/LBy3gOkOx2zWaOJHII_hvYobLrg=/fit-in/200x150/filters:strip_icc()/pic8970236.jpg |
| 工业革命：伯明翰 | `versions[17].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[17].children[1].text` | https://cf.geekdo-images.com/GBf0SSOG_LG03_UV-M2zFg__original/img/YZWqTp8lwtQu3aG551rqWgxx2pw=/0x0/filters:format(jpeg)/pic8970236.jpg |
| 工业革命：伯明翰 | `versions[17].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[17].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[17].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[17].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[17].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[17].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[17].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[17].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[17].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[17].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[17].children[4].attributes.value` | Hungarian edition |
| 工业革命：伯明翰 | `versions[17].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[17].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[17].children[5].attributes.id` | 8820 |
| 工业革命：伯明翰 | `versions[17].children[5].attributes.value` | Gémklub |
| 工业革命：伯明翰 | `versions[17].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[17].children[6].attributes.value` | 2020 |
| 工业革命：伯明翰 | `versions[17].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[17].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[17].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[17].children[8].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[17].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[17].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[17].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[17].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[17].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[17].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[17].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[17].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[17].children[12].attributes.id` | 2191 |
| 工业革命：伯明翰 | `versions[17].children[12].attributes.value` | Hungarian |
| 工业革命：伯明翰 | `versions[18].tag` | item |
| 工业革命：伯明翰 | `versions[18].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[18].attributes.id` | 470849 |
| 工业革命：伯明翰 | `versions[18].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[18].children[0].text` | https://cf.geekdo-images.com/J_j-SSGuMFOAdXCayOLRFA__small/img/oo8k-D7zFWv53WjkL5MH28kMcuw=/fit-in/200x150/filters:strip_icc()/pic6602873.png |
| 工业革命：伯明翰 | `versions[18].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[18].children[1].text` | https://cf.geekdo-images.com/J_j-SSGuMFOAdXCayOLRFA__original/img/vpxgDvP9G3Ifr7YxyhVmwSwn9DU=/0x0/filters:format(png)/pic6602873.png |
| 工业革命：伯明翰 | `versions[18].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[18].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[18].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[18].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[18].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[18].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[18].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[18].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[18].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[18].children[4].attributes.value` | Italian edition |
| 工业革命：伯明翰 | `versions[18].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[18].children[5].attributes.id` | 4785 |
| 工业革命：伯明翰 | `versions[18].children[5].attributes.value` | Ghenos Games |
| 工业革命：伯明翰 | `versions[18].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[18].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[18].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[18].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[18].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[18].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[18].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[18].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[18].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[18].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[18].children[9].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[18].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[18].children[10].attributes.value` |  |
| 工业革命：伯明翰 | `versions[18].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[18].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[18].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[18].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[18].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[18].children[13].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[18].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[18].children[14].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[18].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[18].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[18].children[15].attributes.id` | 2193 |
| 工业革命：伯明翰 | `versions[18].children[15].attributes.value` | Italian |
| 工业革命：伯明翰 | `versions[19].tag` | item |
| 工业革命：伯明翰 | `versions[19].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[19].attributes.id` | 520878 |
| 工业革命：伯明翰 | `versions[19].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[19].children[0].text` | https://cf.geekdo-images.com/m_Xfn_L-U6HfNsOGQhVEGA__small/img/ff5o_f73yBIEU1fsllEtS5g3Ga0=/fit-in/200x150/filters:strip_icc()/pic7403888.jpg |
| 工业革命：伯明翰 | `versions[19].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[19].children[1].text` | https://cf.geekdo-images.com/m_Xfn_L-U6HfNsOGQhVEGA__original/img/AxfB89gnL_MJqHRwMX3ycjjce9U=/0x0/filters:format(jpeg)/pic7403888.jpg |
| 工业革命：伯明翰 | `versions[19].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[19].children[2].attributes.value` | ブラス：バーミンガム |
| 工业革命：伯明翰 | `versions[19].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[19].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[19].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[19].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[19].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[19].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[19].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[19].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[19].children[4].attributes.value` | Japanese edition |
| 工业革命：伯明翰 | `versions[19].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[19].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[19].children[5].attributes.id` | 3475 |
| 工业革命：伯明翰 | `versions[19].children[5].attributes.value` | Arclight Games |
| 工业革命：伯明翰 | `versions[19].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[19].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[19].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[19].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[19].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[19].children[7].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[19].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[19].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[19].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[19].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[19].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[19].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[19].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[19].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[19].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[19].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[19].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[19].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[19].children[13].attributes.id` | 2194 |
| 工业革命：伯明翰 | `versions[19].children[13].attributes.value` | Japanese |
| 工业革命：伯明翰 | `versions[20].tag` | item |
| 工业革命：伯明翰 | `versions[20].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[20].attributes.id` | 785840 |
| 工业革命：伯明翰 | `versions[20].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[20].children[0].text` | https://cf.geekdo-images.com/16JauFCGJd1YReQopaf0aw__small/img/SC5Je0gdeOR22kOiQwifhsQlf9Y=/fit-in/200x150/filters:strip_icc()/pic9315730.jpg |
| 工业革命：伯明翰 | `versions[20].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[20].children[1].text` | https://cf.geekdo-images.com/16JauFCGJd1YReQopaf0aw__original/img/3n4r4Mdne2tistPoQ9WIuNXJkfo=/0x0/filters:format(jpeg)/pic9315730.jpg |
| 工业革命：伯明翰 | `versions[20].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[20].children[2].attributes.value` | 브라스: 버밍엄 |
| 工业革命：伯明翰 | `versions[20].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[20].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[20].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[20].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[20].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[20].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[20].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[20].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[20].children[4].attributes.value` | Korean deluxe edition |
| 工业革命：伯明翰 | `versions[20].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[20].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[20].children[5].attributes.id` | 25074 |
| 工业革命：伯明翰 | `versions[20].children[5].attributes.value` | BoardM Factory |
| 工业革命：伯明翰 | `versions[20].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[20].children[6].attributes.value` | 2025 |
| 工业革命：伯明翰 | `versions[20].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[20].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[20].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[20].children[8].attributes.value` | 11.6929 |
| 工业革命：伯明翰 | `versions[20].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[20].children[9].attributes.value` | 11.6929 |
| 工业革命：伯明翰 | `versions[20].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[20].children[10].attributes.value` | 3.54331 |
| 工业革命：伯明翰 | `versions[20].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[20].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[20].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[20].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[20].children[12].attributes.id` | 2195 |
| 工业革命：伯明翰 | `versions[20].children[12].attributes.value` | Korean |
| 工业革命：伯明翰 | `versions[21].tag` | item |
| 工业革命：伯明翰 | `versions[21].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[21].attributes.id` | 471199 |
| 工业革命：伯明翰 | `versions[21].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[21].children[0].text` | https://cf.geekdo-images.com/CTe1PR9IIYUoDCnaaanXSQ__small/img/Dy_iqnEamGK4BINRWHnrPrKT44A=/fit-in/200x150/filters:strip_icc()/pic5479922.jpg |
| 工业革命：伯明翰 | `versions[21].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[21].children[1].text` | https://cf.geekdo-images.com/CTe1PR9IIYUoDCnaaanXSQ__original/img/yvFrL0dZigHFZCxCg75lcn4hsbE=/0x0/filters:format(jpeg)/pic5479922.jpg |
| 工业革命：伯明翰 | `versions[21].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[21].children[2].attributes.value` | 브라스: 버밍엄 |
| 工业革命：伯明翰 | `versions[21].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[21].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[21].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[21].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[21].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[21].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[21].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[21].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[21].children[4].attributes.value` | Korean edition |
| 工业革命：伯明翰 | `versions[21].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[21].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[21].children[5].attributes.id` | 25074 |
| 工业革命：伯明翰 | `versions[21].children[5].attributes.value` | BoardM Factory |
| 工业革命：伯明翰 | `versions[21].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[21].children[6].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[21].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[21].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[21].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[21].children[8].attributes.value` | 11.6929 |
| 工业革命：伯明翰 | `versions[21].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[21].children[9].attributes.value` | 11.6929 |
| 工业革命：伯明翰 | `versions[21].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[21].children[10].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[21].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[21].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[21].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[21].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[21].children[12].attributes.id` | 2195 |
| 工业革命：伯明翰 | `versions[21].children[12].attributes.value` | Korean |
| 工业革命：伯明翰 | `versions[22].tag` | item |
| 工业革命：伯明翰 | `versions[22].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[22].attributes.id` | 442357 |
| 工业革命：伯明翰 | `versions[22].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[22].children[0].text` | https://cf.geekdo-images.com/MfORA9y7AsLIBTaLNVf0JQ__small/img/mRST0ruihRngDdMgPgbGcE_ssro=/fit-in/200x150/filters:strip_icc()/pic4545513.jpg |
| 工业革命：伯明翰 | `versions[22].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[22].children[1].text` | https://cf.geekdo-images.com/MfORA9y7AsLIBTaLNVf0JQ__original/img/zhh_HqUSqa-T-AHzv9g6VdcNf8o=/0x0/filters:format(jpeg)/pic4545513.jpg |
| 工业革命：伯明翰 | `versions[22].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[22].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[22].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[22].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[22].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[22].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[22].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[22].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[22].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[22].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[22].children[4].attributes.value` | PHALANX Polish edition, first printing |
| 工业革命：伯明翰 | `versions[22].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[22].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[22].children[5].attributes.id` | 36186 |
| 工业革命：伯明翰 | `versions[22].children[5].attributes.value` | PHALANX |
| 工业革命：伯明翰 | `versions[22].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[22].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[22].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[22].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[22].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[22].children[7].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[22].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[22].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[22].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[22].children[9].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[22].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[22].children[10].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[22].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[22].children[11].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[22].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[22].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[22].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[22].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[22].children[13].attributes.id` | 2199 |
| 工业革命：伯明翰 | `versions[22].children[13].attributes.value` | Polish |
| 工业革命：伯明翰 | `versions[23].tag` | item |
| 工业革命：伯明翰 | `versions[23].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[23].attributes.id` | 566817 |
| 工业革命：伯明翰 | `versions[23].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[23].children[0].text` | https://cf.geekdo-images.com/A9x8ydbKq8W3ZZTSnQPn6A__small/img/BKwnr71F_1uNMLgo7EC_6iWoOs8=/fit-in/200x150/filters:strip_icc()/pic8594079.jpg |
| 工业革命：伯明翰 | `versions[23].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[23].children[1].text` | https://cf.geekdo-images.com/A9x8ydbKq8W3ZZTSnQPn6A__original/img/P6a6rVKLjnbnObx8Xwx6svpr9ac=/0x0/filters:format(jpeg)/pic8594079.jpg |
| 工业革命：伯明翰 | `versions[23].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[23].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[23].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[23].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[23].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[23].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[23].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[23].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[23].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[23].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[23].children[4].attributes.value` | PHALANX Polish edition, second printing with awards |
| 工业革命：伯明翰 | `versions[23].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[23].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[23].children[5].attributes.id` | 36186 |
| 工业革命：伯明翰 | `versions[23].children[5].attributes.value` | PHALANX |
| 工业革命：伯明翰 | `versions[23].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[23].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[23].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[23].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[23].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[23].children[7].attributes.value` | 2021 |
| 工业革命：伯明翰 | `versions[23].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[23].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[23].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[23].children[9].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[23].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[23].children[10].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[23].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[23].children[11].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[23].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[23].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[23].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[23].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[23].children[13].attributes.id` | 2199 |
| 工业革命：伯明翰 | `versions[23].children[13].attributes.value` | Polish |
| 工业革命：伯明翰 | `versions[24].tag` | item |
| 工业革命：伯明翰 | `versions[24].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[24].attributes.id` | 803771 |
| 工业革命：伯明翰 | `versions[24].children[0].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[24].children[0].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[24].children[1].tag` | link |
| 工业革命：伯明翰 | `versions[24].children[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[24].children[1].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[24].children[1].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[24].children[1].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[24].children[2].tag` | name |
| 工业革命：伯明翰 | `versions[24].children[2].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[24].children[2].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[24].children[2].attributes.value` | Polish Collector's edition |
| 工业革命：伯明翰 | `versions[24].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[24].children[3].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[24].children[3].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[24].children[3].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[24].children[4].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[24].children[4].attributes.value` | 2027 |
| 工业革命：伯明翰 | `versions[24].children[5].tag` | productcode |
| 工业革命：伯明翰 | `versions[24].children[5].attributes.value` |  |
| 工业革命：伯明翰 | `versions[24].children[6].tag` | width |
| 工业革命：伯明翰 | `versions[24].children[6].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[24].children[7].tag` | length |
| 工业革命：伯明翰 | `versions[24].children[7].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[24].children[8].tag` | depth |
| 工业革命：伯明翰 | `versions[24].children[8].attributes.value` | 2.8 |
| 工业革命：伯明翰 | `versions[24].children[9].tag` | weight |
| 工业革命：伯明翰 | `versions[24].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[24].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[24].children[10].attributes.type` | language |
| 工业革命：伯明翰 | `versions[24].children[10].attributes.id` | 2199 |
| 工业革命：伯明翰 | `versions[24].children[10].attributes.value` | Polish |
| 工业革命：伯明翰 | `versions[25].tag` | item |
| 工业革命：伯明翰 | `versions[25].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[25].attributes.id` | 809058 |
| 工业革命：伯明翰 | `versions[25].children[0].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[25].children[0].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[25].children[1].tag` | link |
| 工业革命：伯明翰 | `versions[25].children[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[25].children[1].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[25].children[1].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[25].children[1].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[25].children[2].tag` | name |
| 工业革命：伯明翰 | `versions[25].children[2].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[25].children[2].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[25].children[2].attributes.value` | Portuguese deluxe edition |
| 工业革命：伯明翰 | `versions[25].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[25].children[3].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[25].children[3].attributes.id` | 11043 |
| 工业革命：伯明翰 | `versions[25].children[3].attributes.value` | Conclave Editora |
| 工业革命：伯明翰 | `versions[25].children[4].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[25].children[4].attributes.value` | 2026 |
| 工业革命：伯明翰 | `versions[25].children[5].tag` | productcode |
| 工业革命：伯明翰 | `versions[25].children[5].attributes.value` | CONC-JOG-BRASS-BIR-DLX-01 |
| 工业革命：伯明翰 | `versions[25].children[6].tag` | width |
| 工业革命：伯明翰 | `versions[25].children[6].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[25].children[7].tag` | length |
| 工业革命：伯明翰 | `versions[25].children[7].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[25].children[8].tag` | depth |
| 工业革命：伯明翰 | `versions[25].children[8].attributes.value` | 3.34646 |
| 工业革命：伯明翰 | `versions[25].children[9].tag` | weight |
| 工业革命：伯明翰 | `versions[25].children[9].attributes.value` | 6.52568 |
| 工业革命：伯明翰 | `versions[25].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[25].children[10].attributes.type` | language |
| 工业革命：伯明翰 | `versions[25].children[10].attributes.id` | 2200 |
| 工业革命：伯明翰 | `versions[25].children[10].attributes.value` | Portuguese |
| 工业革命：伯明翰 | `versions[26].tag` | item |
| 工业革命：伯明翰 | `versions[26].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[26].attributes.id` | 459032 |
| 工业革命：伯明翰 | `versions[26].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[26].children[0].text` | https://cf.geekdo-images.com/GNECsp4uMhplWthQ2e8r5Q__small/img/-jK70bm9xrQ-Q82R1Daqm8ZYvk8=/fit-in/200x150/filters:strip_icc()/pic5053653.png |
| 工业革命：伯明翰 | `versions[26].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[26].children[1].text` | https://cf.geekdo-images.com/GNECsp4uMhplWthQ2e8r5Q__original/img/tY7C94A4fexq6zrha3s_BzVWvo8=/0x0/filters:format(png)/pic5053653.png |
| 工业革命：伯明翰 | `versions[26].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[26].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[26].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[26].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[26].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[26].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[26].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[26].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[26].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[26].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[26].children[4].attributes.value` | Portuguese edition |
| 工业革命：伯明翰 | `versions[26].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[26].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[26].children[5].attributes.id` | 11043 |
| 工业革命：伯明翰 | `versions[26].children[5].attributes.value` | Conclave Editora |
| 工业革命：伯明翰 | `versions[26].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[26].children[6].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[26].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[26].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[26].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[26].children[8].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[26].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[26].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[26].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[26].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[26].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[26].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[26].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[26].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[26].children[12].attributes.id` | 2200 |
| 工业革命：伯明翰 | `versions[26].children[12].attributes.value` | Portuguese |
| 工业革命：伯明翰 | `versions[27].tag` | item |
| 工业革命：伯明翰 | `versions[27].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[27].attributes.id` | 750129 |
| 工业革命：伯明翰 | `versions[27].children[0].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[27].children[0].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[27].children[1].tag` | link |
| 工业革命：伯明翰 | `versions[27].children[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[27].children[1].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[27].children[1].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[27].children[1].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[27].children[2].tag` | name |
| 工业革命：伯明翰 | `versions[27].children[2].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[27].children[2].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[27].children[2].attributes.value` | Rebel Polish Deluxe edition |
| 工业革命：伯明翰 | `versions[27].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[27].children[3].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[27].children[3].attributes.id` | 7466 |
| 工业革命：伯明翰 | `versions[27].children[3].attributes.value` | Rebel Sp. z o.o. |
| 工业革命：伯明翰 | `versions[27].children[4].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[27].children[4].attributes.value` | 2025 |
| 工业革命：伯明翰 | `versions[27].children[5].tag` | productcode |
| 工业革命：伯明翰 | `versions[27].children[5].attributes.value` |  |
| 工业革命：伯明翰 | `versions[27].children[6].tag` | width |
| 工业革命：伯明翰 | `versions[27].children[6].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[27].children[7].tag` | length |
| 工业革命：伯明翰 | `versions[27].children[7].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[27].children[8].tag` | depth |
| 工业革命：伯明翰 | `versions[27].children[8].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[27].children[9].tag` | weight |
| 工业革命：伯明翰 | `versions[27].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[27].children[10].tag` | link |
| 工业革命：伯明翰 | `versions[27].children[10].attributes.type` | language |
| 工业革命：伯明翰 | `versions[27].children[10].attributes.id` | 2199 |
| 工业革命：伯明翰 | `versions[27].children[10].attributes.value` | Polish |
| 工业革命：伯明翰 | `versions[28].tag` | item |
| 工业革命：伯明翰 | `versions[28].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[28].attributes.id` | 657836 |
| 工业革命：伯明翰 | `versions[28].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[28].children[0].text` | https://cf.geekdo-images.com/utw524CltMi9ctQ6s_phSA__small/img/S6oQLuFalhJXA3FMremuVdwm3w0=/fit-in/200x150/filters:strip_icc()/pic8594085.jpg |
| 工业革命：伯明翰 | `versions[28].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[28].children[1].text` | https://cf.geekdo-images.com/utw524CltMi9ctQ6s_phSA__original/img/q9FIYyOnp0a5FCYPeK3pxD0AWLM=/0x0/filters:format(jpeg)/pic8594085.jpg |
| 工业革命：伯明翰 | `versions[28].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[28].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[28].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[28].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[28].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[28].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[28].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[28].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[28].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[28].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[28].children[4].attributes.value` | Rebel Polish edition |
| 工业革命：伯明翰 | `versions[28].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[28].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[28].children[5].attributes.id` | 7466 |
| 工业革命：伯明翰 | `versions[28].children[5].attributes.value` | Rebel Sp. z o.o. |
| 工业革命：伯明翰 | `versions[28].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[28].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[28].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[28].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[28].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[28].children[7].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[28].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[28].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[28].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[28].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[28].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[28].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[28].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[28].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[28].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[28].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[28].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[28].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[28].children[13].attributes.id` | 2199 |
| 工业革命：伯明翰 | `versions[28].children[13].attributes.value` | Polish |
| 工业革命：伯明翰 | `versions[29].tag` | item |
| 工业革命：伯明翰 | `versions[29].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[29].attributes.id` | 389051 |
| 工业革命：伯明翰 | `versions[29].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[29].children[0].text` | https://cf.geekdo-images.com/8T6i_O4pVclK7pT0P7zbtw__small/img/651vuVojWINXaYUh_9zo2HnS9Bs=/fit-in/200x150/filters:strip_icc()/pic4481093.jpg |
| 工业革命：伯明翰 | `versions[29].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[29].children[1].text` | https://cf.geekdo-images.com/8T6i_O4pVclK7pT0P7zbtw__original/img/USja68EZx5eBpbMfIv4onUqkWYM=/0x0/filters:format(jpeg)/pic4481093.jpg |
| 工业革命：伯明翰 | `versions[29].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[29].children[2].attributes.value` | Brass. Бирмингем |
| 工业革命：伯明翰 | `versions[29].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[29].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[29].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[29].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[29].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[29].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[29].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[29].children[4].attributes.value` | Russian edition |
| 工业革命：伯明翰 | `versions[29].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[29].children[5].attributes.id` | 34522 |
| 工业革命：伯明翰 | `versions[29].children[5].attributes.value` | CrowD Games |
| 工业革命：伯明翰 | `versions[29].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[29].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[29].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[29].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[29].children[7].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[29].children[7].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[29].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[29].children[8].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[29].children[8].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[29].children[9].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[9].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[29].children[9].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[29].children[9].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[29].children[10].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[29].children[10].attributes.value` | 2018 |
| 工业革命：伯明翰 | `versions[29].children[11].tag` | productcode |
| 工业革命：伯明翰 | `versions[29].children[11].attributes.value` |  |
| 工业革命：伯明翰 | `versions[29].children[12].tag` | width |
| 工业革命：伯明翰 | `versions[29].children[12].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[29].children[13].tag` | length |
| 工业革命：伯明翰 | `versions[29].children[13].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[29].children[14].tag` | depth |
| 工业革命：伯明翰 | `versions[29].children[14].attributes.value` | 2.95276 |
| 工业革命：伯明翰 | `versions[29].children[15].tag` | weight |
| 工业革命：伯明翰 | `versions[29].children[15].attributes.value` | 1.8 |
| 工业革命：伯明翰 | `versions[29].children[16].tag` | link |
| 工业革命：伯明翰 | `versions[29].children[16].attributes.type` | language |
| 工业革命：伯明翰 | `versions[29].children[16].attributes.id` | 2202 |
| 工业革命：伯明翰 | `versions[29].children[16].attributes.value` | Russian |
| 工业革命：伯明翰 | `versions[30].tag` | item |
| 工业革命：伯明翰 | `versions[30].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[30].attributes.id` | 767328 |
| 工业革命：伯明翰 | `versions[30].children[0].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[30].children[0].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[30].children[1].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[30].children[1].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[30].children[1].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[30].children[1].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[30].children[2].tag` | name |
| 工业革命：伯明翰 | `versions[30].children[2].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[30].children[2].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[30].children[2].attributes.value` | Serbian edition |
| 工业革命：伯明翰 | `versions[30].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[3].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[30].children[3].attributes.id` | 50696 |
| 工业革命：伯明翰 | `versions[30].children[3].attributes.value` | CoolPlay |
| 工业革命：伯明翰 | `versions[30].children[4].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[4].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[30].children[4].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[30].children[4].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[30].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[5].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[30].children[5].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[30].children[5].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[30].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[30].children[6].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[30].children[6].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[30].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[30].children[7].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[30].children[7].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[30].children[8].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[30].children[8].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[30].children[9].tag` | productcode |
| 工业革命：伯明翰 | `versions[30].children[9].attributes.value` | AA1010 |
| 工业革命：伯明翰 | `versions[30].children[10].tag` | width |
| 工业革命：伯明翰 | `versions[30].children[10].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[30].children[11].tag` | length |
| 工业革命：伯明翰 | `versions[30].children[11].attributes.value` | 11.811 |
| 工业革命：伯明翰 | `versions[30].children[12].tag` | depth |
| 工业革命：伯明翰 | `versions[30].children[12].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[30].children[13].tag` | weight |
| 工业革命：伯明翰 | `versions[30].children[13].attributes.value` | 4.62971 |
| 工业革命：伯明翰 | `versions[30].children[14].tag` | link |
| 工业革命：伯明翰 | `versions[30].children[14].attributes.type` | language |
| 工业革命：伯明翰 | `versions[30].children[14].attributes.id` | 2681 |
| 工业革命：伯明翰 | `versions[30].children[14].attributes.value` | Serbian |
| 工业革命：伯明翰 | `versions[31].tag` | item |
| 工业革命：伯明翰 | `versions[31].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[31].attributes.id` | 798264 |
| 工业革命：伯明翰 | `versions[31].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[31].children[0].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[31].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[31].children[1].text` | https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__original/img/FpyxH41Y6_ROoePAilPNEhXnzO8=/0x0/filters:format(jpeg)/pic3490053.jpg |
| 工业革命：伯明翰 | `versions[31].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[31].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[31].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[31].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[31].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[31].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[31].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[31].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[31].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[31].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[31].children[4].attributes.value` | Spanish Collector's edition |
| 工业革命：伯明翰 | `versions[31].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[31].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[31].children[5].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[31].children[5].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[31].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[31].children[6].attributes.value` | 2027 |
| 工业革命：伯明翰 | `versions[31].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[31].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[31].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[31].children[8].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[31].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[31].children[9].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[31].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[31].children[10].attributes.value` | 2.8 |
| 工业革命：伯明翰 | `versions[31].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[31].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[31].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[31].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[31].children[12].attributes.id` | 2203 |
| 工业革命：伯明翰 | `versions[31].children[12].attributes.value` | Spanish |
| 工业革命：伯明翰 | `versions[32].tag` | item |
| 工业革命：伯明翰 | `versions[32].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[32].attributes.id` | 742708 |
| 工业革命：伯明翰 | `versions[32].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[32].children[0].text` | https://cf.geekdo-images.com/A9x8ydbKq8W3ZZTSnQPn6A__small/img/BKwnr71F_1uNMLgo7EC_6iWoOs8=/fit-in/200x150/filters:strip_icc()/pic8594079.jpg |
| 工业革命：伯明翰 | `versions[32].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[32].children[1].text` | https://cf.geekdo-images.com/A9x8ydbKq8W3ZZTSnQPn6A__original/img/P6a6rVKLjnbnObx8Xwx6svpr9ac=/0x0/filters:format(jpeg)/pic8594079.jpg |
| 工业革命：伯明翰 | `versions[32].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[32].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[32].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[32].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[32].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[32].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[32].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[32].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[32].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[32].children[4].attributes.value` | Spanish deluxe edition |
| 工业革命：伯明翰 | `versions[32].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[32].children[5].attributes.id` | 30677 |
| 工业革命：伯明翰 | `versions[32].children[5].attributes.value` | Maldito Games |
| 工业革命：伯明翰 | `versions[32].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[6].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[32].children[6].attributes.id` | 70571 |
| 工业革命：伯明翰 | `versions[32].children[6].attributes.value` | Lina Cossette |
| 工业革命：伯明翰 | `versions[32].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[7].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[32].children[7].attributes.id` | 70568 |
| 工业革命：伯明翰 | `versions[32].children[7].attributes.value` | David Forest |
| 工业革命：伯明翰 | `versions[32].children[8].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[8].attributes.type` | boardgameartist |
| 工业革命：伯明翰 | `versions[32].children[8].attributes.id` | 38179 |
| 工业革命：伯明翰 | `versions[32].children[8].attributes.value` | Damien Mammoliti |
| 工业革命：伯明翰 | `versions[32].children[9].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[32].children[9].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[32].children[10].tag` | productcode |
| 工业革命：伯明翰 | `versions[32].children[10].attributes.value` | MALDITOGAMES-224517D |
| 工业革命：伯明翰 | `versions[32].children[11].tag` | width |
| 工业革命：伯明翰 | `versions[32].children[11].attributes.value` | 12.99 |
| 工业革命：伯明翰 | `versions[32].children[12].tag` | length |
| 工业革命：伯明翰 | `versions[32].children[12].attributes.value` | 13.78 |
| 工业革命：伯明翰 | `versions[32].children[13].tag` | depth |
| 工业革命：伯明翰 | `versions[32].children[13].attributes.value` | 4.72 |
| 工业革命：伯明翰 | `versions[32].children[14].tag` | weight |
| 工业革命：伯明翰 | `versions[32].children[14].attributes.value` | 7.5 |
| 工业革命：伯明翰 | `versions[32].children[15].tag` | link |
| 工业革命：伯明翰 | `versions[32].children[15].attributes.type` | language |
| 工业革命：伯明翰 | `versions[32].children[15].attributes.id` | 2203 |
| 工业革命：伯明翰 | `versions[32].children[15].attributes.value` | Spanish |
| 工业革命：伯明翰 | `versions[33].tag` | item |
| 工业革命：伯明翰 | `versions[33].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[33].attributes.id` | 447132 |
| 工业革命：伯明翰 | `versions[33].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[33].children[0].text` | https://cf.geekdo-images.com/Z-TYyh7aaWAQKziFRpkpKQ__small/img/vKzvyQRYlTUD0Kj9zRlu_Y9n75M=/fit-in/200x150/filters:strip_icc()/pic5916632.jpg |
| 工业革命：伯明翰 | `versions[33].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[33].children[1].text` | https://cf.geekdo-images.com/Z-TYyh7aaWAQKziFRpkpKQ__original/img/WDc_mP0eRTrybkZ-Ts9_H3X2psU=/0x0/filters:format(jpeg)/pic5916632.jpg |
| 工业革命：伯明翰 | `versions[33].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[33].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[33].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[33].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[33].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[33].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[33].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[33].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[33].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[33].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[33].children[4].attributes.value` | Spanish edition |
| 工业革命：伯明翰 | `versions[33].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[33].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[33].children[5].attributes.id` | 30677 |
| 工业革命：伯明翰 | `versions[33].children[5].attributes.value` | Maldito Games |
| 工业革命：伯明翰 | `versions[33].children[6].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[33].children[6].attributes.value` | 2019 |
| 工业革命：伯明翰 | `versions[33].children[7].tag` | productcode |
| 工业革命：伯明翰 | `versions[33].children[7].attributes.value` |  |
| 工业革命：伯明翰 | `versions[33].children[8].tag` | width |
| 工业革命：伯明翰 | `versions[33].children[8].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[33].children[9].tag` | length |
| 工业革命：伯明翰 | `versions[33].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[33].children[10].tag` | depth |
| 工业革命：伯明翰 | `versions[33].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[33].children[11].tag` | weight |
| 工业革命：伯明翰 | `versions[33].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[33].children[12].tag` | link |
| 工业革命：伯明翰 | `versions[33].children[12].attributes.type` | language |
| 工业革命：伯明翰 | `versions[33].children[12].attributes.id` | 2203 |
| 工业革命：伯明翰 | `versions[33].children[12].attributes.value` | Spanish |
| 工业革命：伯明翰 | `versions[34].tag` | item |
| 工业革命：伯明翰 | `versions[34].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[34].attributes.id` | 722810 |
| 工业革命：伯明翰 | `versions[34].children[0].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[34].children[0].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[34].children[1].tag` | link |
| 工业革命：伯明翰 | `versions[34].children[1].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[34].children[1].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[34].children[1].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[34].children[1].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[34].children[2].tag` | name |
| 工业革命：伯明翰 | `versions[34].children[2].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[34].children[2].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[34].children[2].attributes.value` | Spanish edition 2024 |
| 工业革命：伯明翰 | `versions[34].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[34].children[3].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[34].children[3].attributes.id` | 30677 |
| 工业革命：伯明翰 | `versions[34].children[3].attributes.value` | Maldito Games |
| 工业革命：伯明翰 | `versions[34].children[4].tag` | link |
| 工业革命：伯明翰 | `versions[34].children[4].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[34].children[4].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[34].children[4].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[34].children[5].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[34].children[5].attributes.value` | 2024 |
| 工业革命：伯明翰 | `versions[34].children[6].tag` | productcode |
| 工业革命：伯明翰 | `versions[34].children[6].attributes.value` |  |
| 工业革命：伯明翰 | `versions[34].children[7].tag` | width |
| 工业革命：伯明翰 | `versions[34].children[7].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[34].children[8].tag` | length |
| 工业革命：伯明翰 | `versions[34].children[8].attributes.value` | 11.7 |
| 工业革命：伯明翰 | `versions[34].children[9].tag` | depth |
| 工业革命：伯明翰 | `versions[34].children[9].attributes.value` | 2.8 |
| 工业革命：伯明翰 | `versions[34].children[10].tag` | weight |
| 工业革命：伯明翰 | `versions[34].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[34].children[11].tag` | link |
| 工业革命：伯明翰 | `versions[34].children[11].attributes.type` | language |
| 工业革命：伯明翰 | `versions[34].children[11].attributes.id` | 2203 |
| 工业革命：伯明翰 | `versions[34].children[11].attributes.value` | Spanish |
| 工业革命：伯明翰 | `versions[35].tag` | item |
| 工业革命：伯明翰 | `versions[35].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[35].attributes.id` | 651873 |
| 工业革命：伯明翰 | `versions[35].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[35].children[0].text` | https://cf.geekdo-images.com/8JUbggJeZKWpaXhAeEZrFQ__small/img/SU490aYIRfnb1ZgoHdBkPW8WELA=/fit-in/200x150/filters:strip_icc()/pic7374116.jpg |
| 工业革命：伯明翰 | `versions[35].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[35].children[1].text` | https://cf.geekdo-images.com/8JUbggJeZKWpaXhAeEZrFQ__original/img/XdKPJf5O8TPd5v06J6XED_4bv2Y=/0x0/filters:format(jpeg)/pic7374116.jpg |
| 工业革命：伯明翰 | `versions[35].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[35].children[2].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[35].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[35].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[35].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[35].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[35].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[35].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[35].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[35].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[35].children[4].attributes.value` | Thai edition |
| 工业革命：伯明翰 | `versions[35].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[35].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[35].children[5].attributes.id` | 21608 |
| 工业革命：伯明翰 | `versions[35].children[5].attributes.value` | CMON Global Limited |
| 工业革命：伯明翰 | `versions[35].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[35].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[35].children[6].attributes.id` | 36210 |
| 工业革命：伯明翰 | `versions[35].children[6].attributes.value` | Lanlalen |
| 工业革命：伯明翰 | `versions[35].children[7].tag` | link |
| 工业革命：伯明翰 | `versions[35].children[7].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[35].children[7].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[35].children[7].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[35].children[8].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[35].children[8].attributes.value` | 2020 |
| 工业革命：伯明翰 | `versions[35].children[9].tag` | productcode |
| 工业革命：伯明翰 | `versions[35].children[9].attributes.value` |  |
| 工业革命：伯明翰 | `versions[35].children[10].tag` | width |
| 工业革命：伯明翰 | `versions[35].children[10].attributes.value` | 12.0079 |
| 工业革命：伯明翰 | `versions[35].children[11].tag` | length |
| 工业革命：伯明翰 | `versions[35].children[11].attributes.value` | 12.0079 |
| 工业革命：伯明翰 | `versions[35].children[12].tag` | depth |
| 工业革命：伯明翰 | `versions[35].children[12].attributes.value` | 1.9685 |
| 工业革命：伯明翰 | `versions[35].children[13].tag` | weight |
| 工业革命：伯明翰 | `versions[35].children[13].attributes.value` | 4.23288 |
| 工业革命：伯明翰 | `versions[35].children[14].tag` | link |
| 工业革命：伯明翰 | `versions[35].children[14].attributes.type` | language |
| 工业革命：伯明翰 | `versions[35].children[14].attributes.id` | 2709 |
| 工业革命：伯明翰 | `versions[35].children[14].attributes.value` | Thai |
| 工业革命：伯明翰 | `versions[36].tag` | item |
| 工业革命：伯明翰 | `versions[36].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[36].attributes.id` | 538284 |
| 工业革命：伯明翰 | `versions[36].children[0].tag` | thumbnail |
| 工业革命：伯明翰 | `versions[36].children[0].text` | https://cf.geekdo-images.com/zMzGDe-ZbqFVdpajUV10TQ__small/img/xvxA4X5-b1R0GEZtHv7Q0CdcdRI=/fit-in/200x150/filters:strip_icc()/pic5811665.jpg |
| 工业革命：伯明翰 | `versions[36].children[1].tag` | image |
| 工业革命：伯明翰 | `versions[36].children[1].text` | https://cf.geekdo-images.com/zMzGDe-ZbqFVdpajUV10TQ__original/img/hHXfxiIR6A93Wc5Vbh_LmzCARxQ=/0x0/filters:format(jpeg)/pic5811665.jpg |
| 工业革命：伯明翰 | `versions[36].children[2].tag` | canonicalname |
| 工业革命：伯明翰 | `versions[36].children[2].attributes.value` | Brass. Бірмінгем |
| 工业革命：伯明翰 | `versions[36].children[3].tag` | link |
| 工业革命：伯明翰 | `versions[36].children[3].attributes.type` | boardgameversion |
| 工业革命：伯明翰 | `versions[36].children[3].attributes.id` | 224517 |
| 工业革命：伯明翰 | `versions[36].children[3].attributes.value` | Brass: Birmingham |
| 工业革命：伯明翰 | `versions[36].children[3].attributes.inbound` | true |
| 工业革命：伯明翰 | `versions[36].children[4].tag` | name |
| 工业革命：伯明翰 | `versions[36].children[4].attributes.type` | primary |
| 工业革命：伯明翰 | `versions[36].children[4].attributes.sortindex` | 1 |
| 工业革命：伯明翰 | `versions[36].children[4].attributes.value` | Ukrainian edition |
| 工业革命：伯明翰 | `versions[36].children[5].tag` | link |
| 工业革命：伯明翰 | `versions[36].children[5].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[36].children[5].attributes.id` | 46500 |
| 工业革命：伯明翰 | `versions[36].children[5].attributes.value` | Lord of Boards |
| 工业革命：伯明翰 | `versions[36].children[6].tag` | link |
| 工业革命：伯明翰 | `versions[36].children[6].attributes.type` | boardgamepublisher |
| 工业革命：伯明翰 | `versions[36].children[6].attributes.id` | 21765 |
| 工业革命：伯明翰 | `versions[36].children[6].attributes.value` | Roxley |
| 工业革命：伯明翰 | `versions[36].children[7].tag` | yearpublished |
| 工业革命：伯明翰 | `versions[36].children[7].attributes.value` | 2021 |
| 工业革命：伯明翰 | `versions[36].children[8].tag` | productcode |
| 工业革命：伯明翰 | `versions[36].children[8].attributes.value` |  |
| 工业革命：伯明翰 | `versions[36].children[9].tag` | width |
| 工业革命：伯明翰 | `versions[36].children[9].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[36].children[10].tag` | length |
| 工业革命：伯明翰 | `versions[36].children[10].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[36].children[11].tag` | depth |
| 工业革命：伯明翰 | `versions[36].children[11].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[36].children[12].tag` | weight |
| 工业革命：伯明翰 | `versions[36].children[12].attributes.value` | 0 |
| 工业革命：伯明翰 | `versions[36].children[13].tag` | link |
| 工业革命：伯明翰 | `versions[36].children[13].attributes.type` | language |
| 工业革命：伯明翰 | `versions[36].children[13].attributes.id` | 2665 |
| 工业革命：伯明翰 | `versions[36].children[13].attributes.value` | Ukrainian |
| 工业革命：伯明翰 | `videos_count` | 15 |
| 工业革命：伯明翰 | `videos[0].id` | 626311 |
| 工业革命：伯明翰 | `videos[0].title` | Brass Birmingham - Czy ten klasyk nadal się broni? &#124; Recenzja gry planszowej |
| 工业革命：伯明翰 | `videos[0].category` | review |
| 工业革命：伯明翰 | `videos[0].language` | Polish |
| 工业革命：伯明翰 | `videos[0].link` | http://www.youtube.com/watch?v=Su1xrwqNZ3U |
| 工业革命：伯明翰 | `videos[0].username` | chmod700 |
| 工业革命：伯明翰 | `videos[0].userid` | 1837323 |
| 工业革命：伯明翰 | `videos[0].postdate` | 2026-08-21T17:45:10-05:00 |
| 工业革命：伯明翰 | `videos[1].id` | 623544 |
| 工业革命：伯明翰 | `videos[1].title` | Is the Player Count on Board Games Accurate? I Checked 100 Games |
| 工业革命：伯明翰 | `videos[1].category` | other |
| 工业革命：伯明翰 | `videos[1].language` | English |
| 工业革命：伯明翰 | `videos[1].link` | http://www.youtube.com/watch?v=Mtz386BxJ_c |
| 工业革命：伯明翰 | `videos[1].username` | rob2kewl |
| 工业革命：伯明翰 | `videos[1].userid` | 536700 |
| 工业革命：伯明翰 | `videos[1].postdate` | 2026-08-03T12:15:13-05:00 |
| 工业革命：伯明翰 | `videos[2].id` | 620719 |
| 工业革命：伯明翰 | `videos[2].title` | Pion &amp; Pazur &#124; Brass Birmingham &#124; zasady + rozgrywka |
| 工业革命：伯明翰 | `videos[2].category` | session |
| 工业革命：伯明翰 | `videos[2].language` | Polish |
| 工业革命：伯明翰 | `videos[2].link` | http://www.youtube.com/watch?v=ovKB9LVzv4Q |
| 工业革命：伯明翰 | `videos[2].username` | Dr_Mike_ |
| 工业革命：伯明翰 | `videos[2].userid` | 3161430 |
| 工业革命：伯明翰 | `videos[2].postdate` | 2026-07-15T15:11:38-05:00 |
| 工业革命：伯明翰 | `videos[3].id` | 614862 |
| 工业革命：伯明翰 | `videos[3].title` | Unboxing: Brass Birmingham |
| 工业革命：伯明翰 | `videos[3].category` | unboxing |
| 工业革命：伯明翰 | `videos[3].language` | Spanish |
| 工业革命：伯明翰 | `videos[3].link` | http://www.youtube.com/watch?v=B2IA4Z81DYM |
| 工业革命：伯明翰 | `videos[3].username` | StarGamers |
| 工业革命：伯明翰 | `videos[3].userid` | 1907987 |
| 工业革命：伯明翰 | `videos[3].postdate` | 2026-06-05T15:52:00-05:00 |
| 工业革命：伯明翰 | `videos[4].id` | 613632 |
| 工业革命：伯明翰 | `videos[4].title` | All the Games with Steph: Deep Dive Review of Brass: Birmingham |
| 工业革命：伯明翰 | `videos[4].category` | review |
| 工业革命：伯明翰 | `videos[4].language` | English |
| 工业革命：伯明翰 | `videos[4].link` | http://www.youtube.com/watch?v=sR5ykZq-39g |
| 工业革命：伯明翰 | `videos[4].username` | boardgamersteph |
| 工业革命：伯明翰 | `videos[4].userid` | 212591 |
| 工业革命：伯明翰 | `videos[4].postdate` | 2026-05-27T23:53:46-05:00 |
| 工业革命：伯明翰 | `videos[5].id` | 613631 |
| 工业革命：伯明翰 | `videos[5].title` | All the Games with Steph: Brass: Birmingham - Teach |
| 工业革命：伯明翰 | `videos[5].category` | instructional |
| 工业革命：伯明翰 | `videos[5].language` | English |
| 工业革命：伯明翰 | `videos[5].link` | http://www.youtube.com/watch?v=vwnl4ZEaypM |
| 工业革命：伯明翰 | `videos[5].username` | boardgamersteph |
| 工业革命：伯明翰 | `videos[5].userid` | 212591 |
| 工业革命：伯明翰 | `videos[5].postdate` | 2026-05-27T23:53:42-05:00 |
| 工业革命：伯明翰 | `videos[6].id` | 612635 |
| 工业革命：伯明翰 | `videos[6].title` | Top 10 Solo Modes By Fans (&amp; 3 Fan Made Solo Modes for Brass Birmingham) |
| 工业革命：伯明翰 | `videos[6].category` | other |
| 工业革命：伯明翰 | `videos[6].language` | English |
| 工业革命：伯明翰 | `videos[6].link` | http://www.youtube.com/watch?v=whkc-7jPeXU |
| 工业革命：伯明翰 | `videos[6].username` | Boardgaymergirl |
| 工业革命：伯明翰 | `videos[6].userid` | 1466890 |
| 工业革命：伯明翰 | `videos[6].postdate` | 2026-05-21T00:23:12-05:00 |
| 工业革命：伯明翰 | `videos[7].id` | 611840 |
| 工业革命：伯明翰 | `videos[7].title` | Нумограй із двома гравцями від каналу "Board Game Fun" |
| 工业革命：伯明翰 | `videos[7].category` | session |
| 工业革命：伯明翰 | `videos[7].language` | Ukrainian |
| 工业革命：伯明翰 | `videos[7].link` | http://www.youtube.com/watch?v=PBY_kwNgI9E |
| 工业革命：伯明翰 | `videos[7].username` | davose |
| 工业革命：伯明翰 | `videos[7].userid` | 1472043 |
| 工业革命：伯明翰 | `videos[7].postdate` | 2026-05-15T06:26:58-05:00 |
| 工业革命：伯明翰 | `videos[8].id` | 609797 |
| 工业革命：伯明翰 | `videos[8].title` | Brass. Бирмингем настольная игра |
| 工业革命：伯明翰 | `videos[8].category` | session |
| 工业革命：伯明翰 | `videos[8].language` | Russian |
| 工业革命：伯明翰 | `videos[8].link` | http://www.youtube.com/watch?v=x2SLnJ3ysV0 |
| 工业革命：伯明翰 | `videos[8].username` | AlexArchanfel |
| 工业革命：伯明翰 | `videos[8].userid` | 3396602 |
| 工业革命：伯明翰 | `videos[8].postdate` | 2026-04-30T11:51:43-05:00 |
| 工业革命：伯明翰 | `videos[9].id` | 608970 |
| 工业革命：伯明翰 | `videos[9].title` | Brass: Regras CANTADAS em 4min |
| 工业革命：伯明翰 | `videos[9].category` | humor |
| 工业革命：伯明翰 | `videos[9].language` | Portuguese |
| 工业革命：伯明翰 | `videos[9].link` | http://www.youtube.com/watch?v=1BoRx3jv3L4 |
| 工业革命：伯明翰 | `videos[9].username` | DanielNobrega |
| 工业革命：伯明翰 | `videos[9].userid` | 529747 |
| 工业革命：伯明翰 | `videos[9].postdate` | 2026-04-24T09:58:39-05:00 |
| 工业革命：伯明翰 | `videos[10].id` | 608650 |
| 工业革命：伯明翰 | `videos[10].title` | Огляд настільної гри "Brass. Бірмінгем" від видавництва "Lord of boards" |
| 工业革命：伯明翰 | `videos[10].category` | review |
| 工业革命：伯明翰 | `videos[10].language` | Ukrainian |
| 工业革命：伯明翰 | `videos[10].link` | http://www.youtube.com/watch?v=jMVj5LbDxvc |
| 工业革命：伯明翰 | `videos[10].username` | Arkhandgel |
| 工业革命：伯明翰 | `videos[10].userid` | 3278135 |
| 工业革命：伯明翰 | `videos[10].postdate` | 2026-04-22T06:52:14-05:00 |
| 工业革命：伯明翰 | `videos[11].id` | 607764 |
| 工业革命：伯明翰 | `videos[11].title` | Board Buds Brass Birmingham Review |
| 工业革命：伯明翰 | `videos[11].category` | review |
| 工业革命：伯明翰 | `videos[11].language` | English |
| 工业革命：伯明翰 | `videos[11].link` | http://www.youtube.com/watch?v=CwXDmhXAWM8 |
| 工业革命：伯明翰 | `videos[11].username` | lupecazaril |
| 工业革命：伯明翰 | `videos[11].userid` | 349030 |
| 工业革命：伯明翰 | `videos[11].postdate` | 2026-04-16T06:19:56-05:00 |
| 工业革命：伯明翰 | `videos[12].id` | 607571 |
| 工业革命：伯明翰 | `videos[12].title` | Rulebook直說｜工業革命：伯明翰｜Brass: Birmingham｜教學｜廣東話 |
| 工业革命：伯明翰 | `videos[12].category` | instructional |
| 工业革命：伯明翰 | `videos[12].language` |  |
| 工业革命：伯明翰 | `videos[12].link` | http://www.youtube.com/watch?v=GpBkScKlI1o |
| 工业革命：伯明翰 | `videos[12].username` | sonofkyo |
| 工业革命：伯明翰 | `videos[12].userid` | 2885517 |
| 工业革命：伯明翰 | `videos[12].postdate` | 2026-04-15T15:40:17-05:00 |
| 工业革命：伯明翰 | `videos[13].id` | 607501 |
| 工业革命：伯明翰 | `videos[13].title` | Brass Birmingham - Erklärung am Spielabend |
| 工业革命：伯明翰 | `videos[13].category` | instructional |
| 工业革命：伯明翰 | `videos[13].language` | German |
| 工业革命：伯明翰 | `videos[13].link` | http://www.youtube.com/watch?v=qbw7AwLEGqc |
| 工业革命：伯明翰 | `videos[13].username` | brettspielfieber |
| 工业革命：伯明翰 | `videos[13].userid` | 1952235 |
| 工业革命：伯明翰 | `videos[13].postdate` | 2026-04-15T10:41:53-05:00 |
| 工业革命：伯明翰 | `videos[14].id` | 604826 |
| 工业革命：伯明翰 | `videos[14].title` | Brass: Birmingham (Revisited) - 4p Play-through &amp; Roundtable Discussion by Heavy Cardboard |
| 工业革命：伯明翰 | `videos[14].category` | session |
| 工业革命：伯明翰 | `videos[14].language` | English |
| 工业革命：伯明翰 | `videos[14].link` | http://www.youtube.com/watch?v=hz5nplEq_Xg |
| 工业革命：伯明翰 | `videos[14].username` | eapeas |
| 工业革命：伯明翰 | `videos[14].userid` | 377742 |
| 工业革命：伯明翰 | `videos[14].postdate` | 2026-03-29T20:09:07-05:00 |
| 方舟动物园 | `bgg_rank_at_capture` | 2 |
| 方舟动物园 | `bgg_id` | 342942 |
| 方舟动物园 | `type` | boardgame |
| 方舟动物园 | `bgg_url` | https://boardgamegeek.com/boardgame/342942 |
| 方舟动物园 | `names.primary` | Ark Nova |
| 方舟动物园 | `names.alternate[0]` | Archa Nova |
| 方舟动物园 | `names.alternate[1]` | Arche Nova |
| 方舟动物园 | `names.alternate[2]` | Новий ковчег |
| 方舟动物园 | `names.alternate[3]` | นาวาสรรพสัตว์ |
| 方舟动物园 | `names.alternate[4]` | アーク・ノヴァ 新たなる方舟 |
| 方舟动物园 | `names.alternate[5]` | 方舟动物园 |
| 方舟动物园 | `names.alternate[6]` | 方舟動物園 |
| 方舟动物园 | `names.alternate[7]` | 아크 노바 |
| 方舟动物园 | `names.all[0].type` | primary |
| 方舟动物园 | `names.all[0].sortindex` | 1 |
| 方舟动物园 | `names.all[0].value` | Ark Nova |
| 方舟动物园 | `names.all[1].type` | alternate |
| 方舟动物园 | `names.all[1].sortindex` | 1 |
| 方舟动物园 | `names.all[1].value` | Archa Nova |
| 方舟动物园 | `names.all[2].type` | alternate |
| 方舟动物园 | `names.all[2].sortindex` | 1 |
| 方舟动物园 | `names.all[2].value` | Arche Nova |
| 方舟动物园 | `names.all[3].type` | alternate |
| 方舟动物园 | `names.all[3].sortindex` | 1 |
| 方舟动物园 | `names.all[3].value` | Новий ковчег |
| 方舟动物园 | `names.all[4].type` | alternate |
| 方舟动物园 | `names.all[4].sortindex` | 1 |
| 方舟动物园 | `names.all[4].value` | นาวาสรรพสัตว์ |
| 方舟动物园 | `names.all[5].type` | alternate |
| 方舟动物园 | `names.all[5].sortindex` | 1 |
| 方舟动物园 | `names.all[5].value` | アーク・ノヴァ 新たなる方舟 |
| 方舟动物园 | `names.all[6].type` | alternate |
| 方舟动物园 | `names.all[6].sortindex` | 1 |
| 方舟动物园 | `names.all[6].value` | 方舟动物园 |
| 方舟动物园 | `names.all[7].type` | alternate |
| 方舟动物园 | `names.all[7].sortindex` | 1 |
| 方舟动物园 | `names.all[7].value` | 方舟動物園 |
| 方舟动物园 | `names.all[8].type` | alternate |
| 方舟动物园 | `names.all[8].sortindex` | 1 |
| 方舟动物园 | `names.all[8].value` | 아크 노바 |
| 方舟动物园 | `description` | In Ark Nova, you will plan and design a modern, scientifically managed zoo. With the ultimate goal of owning the most successful zoological establishment, you will build enclosures, accommodate animals, and support conservation projects all over the world. Specialists and unique buildings will help you in achieving this goal.<br><br>Each player has a set of five action cards to manage their gameplay, and the power of an action is determined by the slot the card currently occupies. The cards in question are:<br><br><br>    CARDS: Allows you to gain new zoo cards (animals, sponsors, and conservation project cards).<br>    BUILD: Allows you to build standard or special enclosures, kiosks, and pavilions.<br>    ANIMALS: Allows you to accommodate animals in your zoo.<br>    ASSOCIATION: Allows your association workers to carry out different tasks.<br>    SPONSORS: Allows you to play a sponsor card in your zoo or to raise money.<br><br><br>255 cards featuring animals, specialists, special enclosures, and conservation projects, each with a special ability, are at the heart of Ark Nova. Use them to increase the appeal and scientific reputation of your zoo and collect conservation points.<br><br>—description from the publisher<br><br> |
| 方舟动物园 | `year_published` | 2021 |
| 方舟动物园 | `players.min` | 1 |
| 方舟动物园 | `players.max` | 4 |
| 方舟动物园 | `playing_time_minutes.nominal` | 150 |
| 方舟动物园 | `playing_time_minutes.min` | 90 |
| 方舟动物园 | `playing_time_minutes.max` | 150 |
| 方舟动物园 | `minimum_age` | 14 |
| 方舟动物园 | `images.image_url` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `images.thumbnail_url` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `images.local_cover` | covers/02-342942.jpg |
| 方舟动物园 | `polls[0].name` | suggested_numplayers |
| 方舟动物园 | `polls[0].title` | User Suggested Number of Players |
| 方舟动物园 | `polls[0].total_votes` | 2393 |
| 方舟动物园 | `polls[0].results[0].attributes.numplayers` | 1 |
| 方舟动物园 | `polls[0].results[0].options[0].value` | Best |
| 方舟动物园 | `polls[0].results[0].options[0].numvotes` | 226 |
| 方舟动物园 | `polls[0].results[0].options[1].value` | Recommended |
| 方舟动物园 | `polls[0].results[0].options[1].numvotes` | 1006 |
| 方舟动物园 | `polls[0].results[0].options[2].value` | Not Recommended |
| 方舟动物园 | `polls[0].results[0].options[2].numvotes` | 312 |
| 方舟动物园 | `polls[0].results[1].attributes.numplayers` | 2 |
| 方舟动物园 | `polls[0].results[1].options[0].value` | Best |
| 方舟动物园 | `polls[0].results[1].options[0].numvotes` | 1562 |
| 方舟动物园 | `polls[0].results[1].options[1].value` | Recommended |
| 方舟动物园 | `polls[0].results[1].options[1].numvotes` | 591 |
| 方舟动物园 | `polls[0].results[1].options[2].value` | Not Recommended |
| 方舟动物园 | `polls[0].results[1].options[2].numvotes` | 47 |
| 方舟动物园 | `polls[0].results[2].attributes.numplayers` | 3 |
| 方舟动物园 | `polls[0].results[2].options[0].value` | Best |
| 方舟动物园 | `polls[0].results[2].options[0].numvotes` | 673 |
| 方舟动物园 | `polls[0].results[2].options[1].value` | Recommended |
| 方舟动物园 | `polls[0].results[2].options[1].numvotes` | 1093 |
| 方舟动物园 | `polls[0].results[2].options[2].value` | Not Recommended |
| 方舟动物园 | `polls[0].results[2].options[2].numvotes` | 182 |
| 方舟动物园 | `polls[0].results[3].attributes.numplayers` | 4 |
| 方舟动物园 | `polls[0].results[3].options[0].value` | Best |
| 方舟动物园 | `polls[0].results[3].options[0].numvotes` | 115 |
| 方舟动物园 | `polls[0].results[3].options[1].value` | Recommended |
| 方舟动物园 | `polls[0].results[3].options[1].numvotes` | 674 |
| 方舟动物园 | `polls[0].results[3].options[2].value` | Not Recommended |
| 方舟动物园 | `polls[0].results[3].options[2].numvotes` | 1055 |
| 方舟动物园 | `polls[0].results[4].attributes.numplayers` | 4+ |
| 方舟动物园 | `polls[0].results[4].options[0].value` | Best |
| 方舟动物园 | `polls[0].results[4].options[0].numvotes` | 4 |
| 方舟动物园 | `polls[0].results[4].options[1].value` | Recommended |
| 方舟动物园 | `polls[0].results[4].options[1].numvotes` | 9 |
| 方舟动物园 | `polls[0].results[4].options[2].value` | Not Recommended |
| 方舟动物园 | `polls[0].results[4].options[2].numvotes` | 1207 |
| 方舟动物园 | `polls[1].name` | suggested_playerage |
| 方舟动物园 | `polls[1].title` | User Suggested Player Age |
| 方舟动物园 | `polls[1].total_votes` | 330 |
| 方舟动物园 | `polls[1].results[0].attributes` | {} |
| 方舟动物园 | `polls[1].results[0].options[0].value` | 2 |
| 方舟动物园 | `polls[1].results[0].options[0].numvotes` | 2 |
| 方舟动物园 | `polls[1].results[0].options[1].value` | 3 |
| 方舟动物园 | `polls[1].results[0].options[1].numvotes` | 0 |
| 方舟动物园 | `polls[1].results[0].options[2].value` | 4 |
| 方舟动物园 | `polls[1].results[0].options[2].numvotes` | 0 |
| 方舟动物园 | `polls[1].results[0].options[3].value` | 5 |
| 方舟动物园 | `polls[1].results[0].options[3].numvotes` | 0 |
| 方舟动物园 | `polls[1].results[0].options[4].value` | 6 |
| 方舟动物园 | `polls[1].results[0].options[4].numvotes` | 2 |
| 方舟动物园 | `polls[1].results[0].options[5].value` | 8 |
| 方舟动物园 | `polls[1].results[0].options[5].numvotes` | 11 |
| 方舟动物园 | `polls[1].results[0].options[6].value` | 10 |
| 方舟动物园 | `polls[1].results[0].options[6].numvotes` | 40 |
| 方舟动物园 | `polls[1].results[0].options[7].value` | 12 |
| 方舟动物园 | `polls[1].results[0].options[7].numvotes` | 105 |
| 方舟动物园 | `polls[1].results[0].options[8].value` | 14 |
| 方舟动物园 | `polls[1].results[0].options[8].numvotes` | 147 |
| 方舟动物园 | `polls[1].results[0].options[9].value` | 16 |
| 方舟动物园 | `polls[1].results[0].options[9].numvotes` | 20 |
| 方舟动物园 | `polls[1].results[0].options[10].value` | 18 |
| 方舟动物园 | `polls[1].results[0].options[10].numvotes` | 3 |
| 方舟动物园 | `polls[1].results[0].options[11].value` | 21 and up |
| 方舟动物园 | `polls[1].results[0].options[11].numvotes` | 0 |
| 方舟动物园 | `polls[2].name` | language_dependence |
| 方舟动物园 | `polls[2].title` | Language Dependence |
| 方舟动物园 | `polls[2].total_votes` | 83 |
| 方舟动物园 | `polls[2].results[0].attributes` | {} |
| 方舟动物园 | `polls[2].results[0].options[0].level` | 1 |
| 方舟动物园 | `polls[2].results[0].options[0].value` | No necessary in-game text |
| 方舟动物园 | `polls[2].results[0].options[0].numvotes` | 0 |
| 方舟动物园 | `polls[2].results[0].options[1].level` | 2 |
| 方舟动物园 | `polls[2].results[0].options[1].value` | Some necessary text - easily memorized or small crib sheet |
| 方舟动物园 | `polls[2].results[0].options[1].numvotes` | 0 |
| 方舟动物园 | `polls[2].results[0].options[2].level` | 3 |
| 方舟动物园 | `polls[2].results[0].options[2].value` | Moderate in-game text - needs crib sheet or paste ups |
| 方舟动物园 | `polls[2].results[0].options[2].numvotes` | 25 |
| 方舟动物园 | `polls[2].results[0].options[3].level` | 4 |
| 方舟动物园 | `polls[2].results[0].options[3].value` | Extensive use of text - massive conversion needed to be playable |
| 方舟动物园 | `polls[2].results[0].options[3].numvotes` | 53 |
| 方舟动物园 | `polls[2].results[0].options[4].level` | 5 |
| 方舟动物园 | `polls[2].results[0].options[4].value` | Unplayable in another language |
| 方舟动物园 | `polls[2].results[0].options[4].numvotes` | 5 |
| 方舟动物园 | `links.boardgamecategory[0].id` | 1089 |
| 方舟动物园 | `links.boardgamecategory[0].name` | Animals |
| 方舟动物园 | `links.boardgamecategory[0].inbound` | null |
| 方舟动物园 | `links.boardgamecategory[1].id` | 1002 |
| 方舟动物园 | `links.boardgamecategory[1].name` | Card Game |
| 方舟动物园 | `links.boardgamecategory[1].inbound` | null |
| 方舟动物园 | `links.boardgamecategory[2].id` | 1084 |
| 方舟动物园 | `links.boardgamecategory[2].name` | Environmental |
| 方舟动物园 | `links.boardgamecategory[2].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[0].id` | 2912 |
| 方舟动物园 | `links.boardgamemechanic[0].name` | Contracts |
| 方舟动物园 | `links.boardgamemechanic[0].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[1].id` | 2875 |
| 方舟动物园 | `links.boardgamemechanic[1].name` | End Game Bonuses |
| 方舟动物园 | `links.boardgamemechanic[1].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[2].id` | 2850 |
| 方舟动物园 | `links.boardgamemechanic[2].name` | Events |
| 方舟动物园 | `links.boardgamemechanic[2].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[3].id` | 2978 |
| 方舟动物园 | `links.boardgamemechanic[3].name` | Grid Coverage |
| 方舟动物园 | `links.boardgamemechanic[3].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[4].id` | 2040 |
| 方舟动物园 | `links.boardgamemechanic[4].name` | Hand Management |
| 方舟动物园 | `links.boardgamemechanic[4].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[5].id` | 2026 |
| 方舟动物园 | `links.boardgamemechanic[5].name` | Hexagon Grid |
| 方舟动物园 | `links.boardgamemechanic[5].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[6].id` | 2902 |
| 方舟动物园 | `links.boardgamemechanic[6].name` | Income |
| 方舟动物园 | `links.boardgamemechanic[6].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[7].id` | 2914 |
| 方舟动物园 | `links.boardgamemechanic[7].name` | Increase Value of Unchosen Resources |
| 方舟动物园 | `links.boardgamemechanic[7].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[8].id` | 2041 |
| 方舟动物园 | `links.boardgamemechanic[8].name` | Open Drafting |
| 方舟动物园 | `links.boardgamemechanic[8].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[9].id` | 2876 |
| 方舟动物园 | `links.boardgamemechanic[9].name` | Race |
| 方舟动物园 | `links.boardgamemechanic[9].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[10].id` | 2004 |
| 方舟动物园 | `links.boardgamemechanic[10].name` | Set Collection |
| 方舟动物园 | `links.boardgamemechanic[10].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[11].id` | 2819 |
| 方舟动物园 | `links.boardgamemechanic[11].name` | Solo / Solitaire Game |
| 方舟动物园 | `links.boardgamemechanic[11].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[12].id` | 3100 |
| 方舟动物园 | `links.boardgamemechanic[12].name` | Tags |
| 方舟动物园 | `links.boardgamemechanic[12].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[13].id` | 2002 |
| 方舟动物园 | `links.boardgamemechanic[13].name` | Tile Placement |
| 方舟动物园 | `links.boardgamemechanic[13].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[14].id` | 2939 |
| 方舟动物园 | `links.boardgamemechanic[14].name` | Track Movement |
| 方舟动物园 | `links.boardgamemechanic[14].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[15].id` | 2015 |
| 方舟动物园 | `links.boardgamemechanic[15].name` | Variable Player Powers |
| 方舟动物园 | `links.boardgamemechanic[15].inbound` | null |
| 方舟动物园 | `links.boardgamemechanic[16].id` | 2897 |
| 方舟动物园 | `links.boardgamemechanic[16].name` | Variable Set-up |
| 方舟动物园 | `links.boardgamemechanic[16].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[0].id` | 110926 |
| 方舟动物园 | `links.boardgamefamily[0].name` | Animals: Okapi |
| 方舟动物园 | `links.boardgamefamily[0].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[1].id` | 67874 |
| 方舟动物园 | `links.boardgamefamily[1].name` | Components: Hexagonal Tiles |
| 方舟动物园 | `links.boardgamefamily[1].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[2].id` | 27383 |
| 方舟动物园 | `links.boardgamefamily[2].name` | Continents: Africa |
| 方舟动物园 | `links.boardgamefamily[2].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[3].id` | 9470 |
| 方舟动物园 | `links.boardgamefamily[3].name` | Continents: Asia |
| 方舟动物园 | `links.boardgamefamily[3].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[4].id` | 50153 |
| 方舟动物园 | `links.boardgamefamily[4].name` | Continents: Europe |
| 方舟动物园 | `links.boardgamefamily[4].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[5].id` | 61646 |
| 方舟动物园 | `links.boardgamefamily[5].name` | Continents: North America |
| 方舟动物园 | `links.boardgamefamily[5].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[6].id` | 61645 |
| 方舟动物园 | `links.boardgamefamily[6].name` | Continents: South America |
| 方舟动物园 | `links.boardgamefamily[6].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[7].id` | 10167 |
| 方舟动物园 | `links.boardgamefamily[7].name` | Country: Australia |
| 方舟动物园 | `links.boardgamefamily[7].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[8].id` | 104952 |
| 方舟动物园 | `links.boardgamefamily[8].name` | Digital Implementations: Apple App Store |
| 方舟动物园 | `links.boardgamefamily[8].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[9].id` | 70360 |
| 方舟动物园 | `links.boardgamefamily[9].name` | Digital Implementations: Board Game Arena |
| 方舟动物园 | `links.boardgamefamily[9].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[10].id` | 78432 |
| 方舟动物园 | `links.boardgamefamily[10].name` | Digital Implementations: Google Play |
| 方舟动物园 | `links.boardgamefamily[10].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[11].id` | 77349 |
| 方舟动物园 | `links.boardgamefamily[11].name` | Digital Implementations: Steam |
| 方舟动物园 | `links.boardgamefamily[11].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[12].id` | 73596 |
| 方舟动物园 | `links.boardgamefamily[12].name` | Digital Implementations: TableTop Simulator Mod (TTS) |
| 方舟动物园 | `links.boardgamefamily[12].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[13].id` | 76649 |
| 方舟动物园 | `links.boardgamefamily[13].name` | Game: Ark Nova |
| 方舟动物园 | `links.boardgamefamily[13].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[14].id` | 27646 |
| 方舟动物园 | `links.boardgamefamily[14].name` | Mechanism: Tableau Building |
| 方舟动物园 | `links.boardgamefamily[14].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[15].id` | 5666 |
| 方舟动物园 | `links.boardgamefamily[15].name` | Players: Games with Solitaire Rules |
| 方舟动物园 | `links.boardgamefamily[15].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[16].id` | 59442 |
| 方舟动物园 | `links.boardgamefamily[16].name` | Theme: Biology |
| 方舟动物园 | `links.boardgamefamily[16].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[17].id` | 68335 |
| 方舟动物园 | `links.boardgamefamily[17].name` | Theme: Ecology |
| 方舟动物园 | `links.boardgamefamily[17].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[18].id` | 66167 |
| 方舟动物园 | `links.boardgamefamily[18].name` | Theme: Science |
| 方舟动物园 | `links.boardgamefamily[18].inbound` | null |
| 方舟动物园 | `links.boardgamefamily[19].id` | 76846 |
| 方舟动物园 | `links.boardgamefamily[19].name` | Theme: Zoos, Aquaria, Safari Parks |
| 方舟动物园 | `links.boardgamefamily[19].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[0].id` | 452698 |
| 方舟动物园 | `links.boardgameexpansion[0].name` | Ark Nova: 3D Colored Arcade Promo Building &amp; Card |
| 方舟动物园 | `links.boardgameexpansion[0].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[1].id` | 450126 |
| 方舟动物园 | `links.boardgameexpansion[1].name` | Ark Nova: 3Dition |
| 方舟动物园 | `links.boardgameexpansion[1].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[2].id` | 452699 |
| 方舟动物园 | `links.boardgameexpansion[2].name` | Ark Nova: Board Game Arena Maps |
| 方舟动物园 | `links.boardgameexpansion[2].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[3].id` | 368966 |
| 方舟动物园 | `links.boardgameexpansion[3].name` | Ark Nova: Marine Worlds |
| 方舟动物园 | `links.boardgameexpansion[3].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[4].id` | 433207 |
| 方舟动物园 | `links.boardgameexpansion[4].name` | Ark Nova: Promotion Team &amp; Capybara Promo Cards |
| 方舟动物园 | `links.boardgameexpansion[4].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[5].id` | 368158 |
| 方舟动物园 | `links.boardgameexpansion[5].name` | Ark Nova: Zoo Map Pack 1 |
| 方舟动物园 | `links.boardgameexpansion[5].inbound` | null |
| 方舟动物园 | `links.boardgameexpansion[6].id` | 426978 |
| 方舟动物园 | `links.boardgameexpansion[6].name` | Ark Nova: Zoo Map Pack 2 |
| 方舟动物园 | `links.boardgameexpansion[6].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[0].id` | 433128 |
| 方舟动物园 | `links.boardgameaccessory[0].name` | Ark Nova + Marine Worlds: Eurohell Design Insert |
| 方舟动物园 | `links.boardgameaccessory[0].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[1].id` | 366502 |
| 方舟动物园 | `links.boardgameaccessory[1].name` | Ark Nova: BGExpansions Full Upgrade Kit |
| 方舟动物园 | `links.boardgameaccessory[1].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[2].id` | 449408 |
| 方舟动物园 | `links.boardgameaccessory[2].name` | Ark Nova: Board Bento Organizer |
| 方舟动物园 | `links.boardgameaccessory[2].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[3].id` | 365692 |
| 方舟动物园 | `links.boardgameaccessory[3].name` | Ark Nova: Board Game Amplifier Acrylic Overlay |
| 方舟动物园 | `links.boardgameaccessory[3].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[4].id` | 447976 |
| 方舟动物园 | `links.boardgameaccessory[4].name` | Ark Nova: Deluxygames Upgrade Kit |
| 方舟动物园 | `links.boardgameaccessory[4].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[5].id` | 413174 |
| 方舟动物园 | `links.boardgameaccessory[5].name` | Ark Nova: e-Raptor Insert UV Print |
| 方舟动物园 | `links.boardgameaccessory[5].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[6].id` | 375802 |
| 方舟动物园 | `links.boardgameaccessory[6].name` | Ark Nova: Eurohell Design Coffee Mug |
| 方舟动物园 | `links.boardgameaccessory[6].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[7].id` | 357875 |
| 方舟动物园 | `links.boardgameaccessory[7].name` | Ark Nova: Eurohell Design Insert |
| 方舟动物园 | `links.boardgameaccessory[7].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[8].id` | 366164 |
| 方舟动物园 | `links.boardgameaccessory[8].name` | Ark Nova: Eurohell Design Upgrade Coins |
| 方舟动物园 | `links.boardgameaccessory[8].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[9].id` | 375801 |
| 方舟动物园 | `links.boardgameaccessory[9].name` | Ark Nova: Eurohell Design X-tokens |
| 方舟动物园 | `links.boardgameaccessory[9].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[10].id` | 360411 |
| 方舟动物园 | `links.boardgameaccessory[10].name` | Ark Nova: Folded Space Insert |
| 方舟动物园 | `links.boardgameaccessory[10].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[11].id` | 419823 |
| 方舟动物园 | `links.boardgameaccessory[11].name` | Ark Nova: LaserLand 112 Token Upgrades |
| 方舟动物园 | `links.boardgameaccessory[11].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[12].id` | 419824 |
| 方舟动物园 | `links.boardgameaccessory[12].name` | Ark Nova: LaserLand Marine Worlds Association Board Overlay |
| 方舟动物园 | `links.boardgameaccessory[12].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[13].id` | 419822 |
| 方舟动物园 | `links.boardgameaccessory[13].name` | Ark Nova: LaserLand Player Board Overlays |
| 方舟动物园 | `links.boardgameaccessory[13].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[14].id` | 367202 |
| 方舟动物园 | `links.boardgameaccessory[14].name` | Ark Nova: Laserox Organizer |
| 方舟动物园 | `links.boardgameaccessory[14].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[15].id` | 426880 |
| 方舟动物园 | `links.boardgameaccessory[15].name` | Ark Nova: Moedas &amp; Co. Metal Coins |
| 方舟动物园 | `links.boardgameaccessory[15].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[16].id` | 462114 |
| 方舟动物园 | `links.boardgameaccessory[16].name` | Ark Nova: PolandGames Insert |
| 方舟动物园 | `links.boardgameaccessory[16].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[17].id` | 434368 |
| 方舟动物园 | `links.boardgameaccessory[17].name` | Ark Nova: Polandgames Token Set |
| 方舟动物园 | `links.boardgameaccessory[17].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[18].id` | 368014 |
| 方舟动物园 | `links.boardgameaccessory[18].name` | Ark Nova: reDrewno Insert |
| 方舟动物园 | `links.boardgameaccessory[18].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[19].id` | 382556 |
| 方舟动物园 | `links.boardgameaccessory[19].name` | Ark Nova: Sloyca Insert |
| 方舟动物园 | `links.boardgameaccessory[19].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[20].id` | 378754 |
| 方舟动物园 | `links.boardgameaccessory[20].name` | Ark Nova: Spielmaterial.de Upgrade |
| 方舟动物园 | `links.boardgameaccessory[20].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[21].id` | 367999 |
| 方舟动物园 | `links.boardgameaccessory[21].name` | Ark Nova: The GiftForge Insert |
| 方舟动物园 | `links.boardgameaccessory[21].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[22].id` | 448891 |
| 方舟动物园 | `links.boardgameaccessory[22].name` | Ark Nova: Wooden Break Token |
| 方舟动物园 | `links.boardgameaccessory[22].inbound` | null |
| 方舟动物园 | `links.boardgameaccessory[23].id` | 367516 |
| 方舟动物园 | `links.boardgameaccessory[23].name` | Ark Nova: Wooden tokens |
| 方舟动物园 | `links.boardgameaccessory[23].inbound` | null |
| 方舟动物园 | `links.boardgameimplementation[0].id` | 441696 |
| 方舟动物园 | `links.boardgameimplementation[0].name` | Sanctuary |
| 方舟动物园 | `links.boardgameimplementation[0].inbound` | null |
| 方舟动物园 | `links.boardgamedesigner[0].id` | 138517 |
| 方舟动物园 | `links.boardgamedesigner[0].name` | Mathias Wigge |
| 方舟动物园 | `links.boardgamedesigner[0].inbound` | null |
| 方舟动物园 | `links.boardgameartist[0].id` | 138547 |
| 方舟动物园 | `links.boardgameartist[0].name` | Steffen Bieker |
| 方舟动物园 | `links.boardgameartist[0].inbound` | null |
| 方舟动物园 | `links.boardgameartist[1].id` | 11462 |
| 方舟动物园 | `links.boardgameartist[1].name` | Loïc Billiau |
| 方舟动物园 | `links.boardgameartist[1].inbound` | null |
| 方舟动物园 | `links.boardgameartist[2].id` | 12484 |
| 方舟动物园 | `links.boardgameartist[2].name` | Dennis Lohausen |
| 方舟动物园 | `links.boardgameartist[2].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[0].id` | 22380 |
| 方舟动物园 | `links.boardgamepublisher[0].name` | Feuerland Spiele |
| 方舟动物园 | `links.boardgamepublisher[0].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[1].id` | 30958 |
| 方舟动物园 | `links.boardgamepublisher[1].name` | Capstone Games |
| 方舟动物园 | `links.boardgamepublisher[1].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[2].id` | 21608 |
| 方舟动物园 | `links.boardgamepublisher[2].name` | CMON Global Limited |
| 方舟动物园 | `links.boardgamepublisher[2].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[3].id` | 10768 |
| 方舟动物园 | `links.boardgamepublisher[3].name` | Cranio Creations |
| 方舟动物园 | `links.boardgamepublisher[3].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[4].id` | 12540 |
| 方舟动物园 | `links.boardgamepublisher[4].name` | Game Harbor |
| 方舟动物园 | `links.boardgamepublisher[4].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[5].id` | 8820 |
| 方舟动物园 | `links.boardgamepublisher[5].name` | Gémklub |
| 方舟动物园 | `links.boardgamepublisher[5].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[6].id` | 42325 |
| 方舟动物园 | `links.boardgamepublisher[6].name` | Grok Games |
| 方舟动物园 | `links.boardgamepublisher[6].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[7].id` | 17179 |
| 方舟动物园 | `links.boardgamepublisher[7].name` | IGAMES |
| 方舟动物园 | `links.boardgamepublisher[7].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[8].id` | 8291 |
| 方舟动物园 | `links.boardgamepublisher[8].name` | Korea Boardgames |
| 方舟动物园 | `links.boardgamepublisher[8].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[9].id` | 3218 |
| 方舟动物园 | `links.boardgamepublisher[9].name` | Lautapelit.fi |
| 方舟动物园 | `links.boardgamepublisher[9].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[10].id` | 29242 |
| 方舟动物园 | `links.boardgamepublisher[10].name` | Ludofy Creative |
| 方舟动物园 | `links.boardgamepublisher[10].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[11].id` | 30677 |
| 方舟动物园 | `links.boardgamepublisher[11].name` | Maldito Games |
| 方舟动物园 | `links.boardgamepublisher[11].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[12].id` | 7992 |
| 方舟动物园 | `links.boardgamepublisher[12].name` | MINDOK |
| 方舟动物园 | `links.boardgamepublisher[12].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[13].id` | 51614 |
| 方舟动物园 | `links.boardgamepublisher[13].name` | MIPL |
| 方舟动物园 | `links.boardgamepublisher[13].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[14].id` | 2726 |
| 方舟动物园 | `links.boardgamepublisher[14].name` | Portal Games |
| 方舟动物园 | `links.boardgamepublisher[14].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[15].id` | 44241 |
| 方舟动物园 | `links.boardgamepublisher[15].name` | Regatul Jocurilor |
| 方舟动物园 | `links.boardgamepublisher[15].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[16].id` | 29409 |
| 方舟动物园 | `links.boardgamepublisher[16].name` | Super Meeple |
| 方舟动物园 | `links.boardgamepublisher[16].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[17].id` | 22609 |
| 方舟动物园 | `links.boardgamepublisher[17].name` | テンデイズゲームズ (TendaysGames) |
| 方舟动物园 | `links.boardgamepublisher[17].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[18].id` | 39774 |
| 方舟动物园 | `links.boardgamepublisher[18].name` | Tower Tactic Games |
| 方舟动物园 | `links.boardgamepublisher[18].inbound` | null |
| 方舟动物园 | `links.boardgamepublisher[19].id` | 4932 |
| 方舟动物园 | `links.boardgamepublisher[19].name` | White Goblin Games |
| 方舟动物园 | `links.boardgamepublisher[19].inbound` | null |
| 方舟动物园 | `statistics.users_rated` | 62733 |
| 方舟动物园 | `statistics.average_rating` | 8.53801 |
| 方舟动物园 | `statistics.bayes_average` | 8.35351 |
| 方舟动物园 | `statistics.stddev` | 1.41167 |
| 方舟动物园 | `statistics.median` | 0 |
| 方舟动物园 | `statistics.owned` | 91341 |
| 方舟动物园 | `statistics.trading` | 464 |
| 方舟动物园 | `statistics.wanting` | 1057 |
| 方舟动物园 | `statistics.wishing` | 18230 |
| 方舟动物园 | `statistics.num_comments` | 8292 |
| 方舟动物园 | `statistics.num_weights` | 3217 |
| 方舟动物园 | `statistics.average_weight` | 3.7979 |
| 方舟动物园 | `statistics.ranks[0].type` | subtype |
| 方舟动物园 | `statistics.ranks[0].id` | 1 |
| 方舟动物园 | `statistics.ranks[0].name` | boardgame |
| 方舟动物园 | `statistics.ranks[0].friendlyname` | Board Game Rank |
| 方舟动物园 | `statistics.ranks[0].value` | 2 |
| 方舟动物园 | `statistics.ranks[0].bayesaverage` | 8.35351 |
| 方舟动物园 | `statistics.ranks[1].type` | family |
| 方舟动物园 | `statistics.ranks[1].id` | 5497 |
| 方舟动物园 | `statistics.ranks[1].name` | strategygames |
| 方舟动物园 | `statistics.ranks[1].friendlyname` | Strategy Game Rank |
| 方舟动物园 | `statistics.ranks[1].value` | 2 |
| 方舟动物园 | `statistics.ranks[1].bayesaverage` | 8.35301 |
| 方舟动物园 | `versions_count` | 37 |
| 方舟动物园 | `versions[0].tag` | item |
| 方舟动物园 | `versions[0].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[0].attributes.id` | 591904 |
| 方舟动物园 | `versions[0].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[0].children[0].text` | https://cf.geekdo-images.com/tCZw-OlXpBxoyccIhpq_fA__small/img/NKuJ_mPoRHuBAE_LNXElBRxhIkE=/fit-in/200x150/filters:strip_icc()/pic6569437.jpg |
| 方舟动物园 | `versions[0].children[1].tag` | image |
| 方舟动物园 | `versions[0].children[1].text` | https://cf.geekdo-images.com/tCZw-OlXpBxoyccIhpq_fA__original/img/GtA3ypvDqoqWF7B9COxzfVvq_Ig=/0x0/filters:format(jpeg)/pic6569437.jpg |
| 方舟动物园 | `versions[0].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[0].children[2].attributes.value` | 方舟动物园 |
| 方舟动物园 | `versions[0].children[3].tag` | link |
| 方舟动物园 | `versions[0].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[0].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[0].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[0].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[0].children[4].tag` | name |
| 方舟动物园 | `versions[0].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[0].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[0].children[4].attributes.value` | Chinese edition |
| 方舟动物园 | `versions[0].children[5].tag` | link |
| 方舟动物园 | `versions[0].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[0].children[5].attributes.id` | 12540 |
| 方舟动物园 | `versions[0].children[5].attributes.value` | Game Harbor |
| 方舟动物园 | `versions[0].children[6].tag` | yearpublished |
| 方舟动物园 | `versions[0].children[6].attributes.value` | 2021 |
| 方舟动物园 | `versions[0].children[7].tag` | productcode |
| 方舟动物园 | `versions[0].children[7].attributes.value` |  |
| 方舟动物园 | `versions[0].children[8].tag` | width |
| 方舟动物园 | `versions[0].children[8].attributes.value` | 0 |
| 方舟动物园 | `versions[0].children[9].tag` | length |
| 方舟动物园 | `versions[0].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[0].children[10].tag` | depth |
| 方舟动物园 | `versions[0].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[0].children[11].tag` | weight |
| 方舟动物园 | `versions[0].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[0].children[12].tag` | link |
| 方舟动物园 | `versions[0].children[12].attributes.type` | language |
| 方舟动物园 | `versions[0].children[12].attributes.id` | 2181 |
| 方舟动物园 | `versions[0].children[12].attributes.value` | Chinese |
| 方舟动物园 | `versions[1].tag` | item |
| 方舟动物园 | `versions[1].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[1].attributes.id` | 623699 |
| 方舟动物园 | `versions[1].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[1].children[0].text` | https://cf.geekdo-images.com/4YNqMhlYr72yfx6OjIHKmA__small/img/MOT7atjcCxJF52_rMAIBWrA8N6U=/fit-in/200x150/filters:strip_icc()/pic7100185.jpg |
| 方舟动物园 | `versions[1].children[1].tag` | image |
| 方舟动物园 | `versions[1].children[1].text` | https://cf.geekdo-images.com/4YNqMhlYr72yfx6OjIHKmA__original/img/bT9df5oiYyflXGWJpFcwlTiiZoc=/0x0/filters:format(jpeg)/pic7100185.jpg |
| 方舟动物园 | `versions[1].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[1].children[2].attributes.value` | Archa Nova |
| 方舟动物园 | `versions[1].children[3].tag` | link |
| 方舟动物园 | `versions[1].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[1].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[1].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[1].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[1].children[4].tag` | name |
| 方舟动物园 | `versions[1].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[1].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[1].children[4].attributes.value` | Czech edition |
| 方舟动物园 | `versions[1].children[5].tag` | link |
| 方舟动物园 | `versions[1].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[1].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[1].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[1].children[6].tag` | link |
| 方舟动物园 | `versions[1].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[1].children[6].attributes.id` | 7992 |
| 方舟动物园 | `versions[1].children[6].attributes.value` | MINDOK |
| 方舟动物园 | `versions[1].children[7].tag` | link |
| 方舟动物园 | `versions[1].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[1].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[1].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[1].children[8].tag` | link |
| 方舟动物园 | `versions[1].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[1].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[1].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[1].children[9].tag` | link |
| 方舟动物园 | `versions[1].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[1].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[1].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[1].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[1].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[1].children[11].tag` | productcode |
| 方舟动物园 | `versions[1].children[11].attributes.value` |  |
| 方舟动物园 | `versions[1].children[12].tag` | width |
| 方舟动物园 | `versions[1].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[1].children[13].tag` | length |
| 方舟动物园 | `versions[1].children[13].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[1].children[14].tag` | depth |
| 方舟动物园 | `versions[1].children[14].attributes.value` | 2.87402 |
| 方舟动物园 | `versions[1].children[15].tag` | weight |
| 方舟动物园 | `versions[1].children[15].attributes.value` | 5.4851 |
| 方舟动物园 | `versions[1].children[16].tag` | link |
| 方舟动物园 | `versions[1].children[16].attributes.type` | language |
| 方舟动物园 | `versions[1].children[16].attributes.id` | 2180 |
| 方舟动物园 | `versions[1].children[16].attributes.value` | Czech |
| 方舟动物园 | `versions[2].tag` | item |
| 方舟动物园 | `versions[2].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[2].attributes.id` | 584007 |
| 方舟动物园 | `versions[2].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[2].children[0].text` | https://cf.geekdo-images.com/V_MtLByECScjeHcZtgX9XQ__small/img/_hFIo5mmDWGOCX-EwFyQYHU0gCo=/fit-in/200x150/filters:strip_icc()/pic7059817.jpg |
| 方舟动物园 | `versions[2].children[1].tag` | image |
| 方舟动物园 | `versions[2].children[1].text` | https://cf.geekdo-images.com/V_MtLByECScjeHcZtgX9XQ__original/img/tcn2crrOwbDO_2_UfFVj6MYA1kw=/0x0/filters:format(jpeg)/pic7059817.jpg |
| 方舟动物园 | `versions[2].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[2].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[2].children[3].tag` | link |
| 方舟动物园 | `versions[2].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[2].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[2].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[2].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[2].children[4].tag` | name |
| 方舟动物园 | `versions[2].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[2].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[2].children[4].attributes.value` | Dutch edition |
| 方舟动物园 | `versions[2].children[5].tag` | link |
| 方舟动物园 | `versions[2].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[2].children[5].attributes.id` | 4932 |
| 方舟动物园 | `versions[2].children[5].attributes.value` | White Goblin Games |
| 方舟动物园 | `versions[2].children[6].tag` | link |
| 方舟动物园 | `versions[2].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[2].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[2].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[2].children[7].tag` | link |
| 方舟动物园 | `versions[2].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[2].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[2].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[2].children[8].tag` | link |
| 方舟动物园 | `versions[2].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[2].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[2].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[2].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[2].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[2].children[10].tag` | productcode |
| 方舟动物园 | `versions[2].children[10].attributes.value` | 2230 |
| 方舟动物园 | `versions[2].children[11].tag` | width |
| 方舟动物园 | `versions[2].children[11].attributes.value` | 11.811 |
| 方舟动物园 | `versions[2].children[12].tag` | length |
| 方舟动物园 | `versions[2].children[12].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[2].children[13].tag` | depth |
| 方舟动物园 | `versions[2].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[2].children[14].tag` | weight |
| 方舟动物园 | `versions[2].children[14].attributes.value` | 5.37928 |
| 方舟动物园 | `versions[2].children[15].tag` | link |
| 方舟动物园 | `versions[2].children[15].attributes.type` | language |
| 方舟动物园 | `versions[2].children[15].attributes.id` | 2183 |
| 方舟动物园 | `versions[2].children[15].attributes.value` | Dutch |
| 方舟动物园 | `versions[3].tag` | item |
| 方舟动物园 | `versions[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[3].attributes.id` | 789012 |
| 方舟动物园 | `versions[3].children[0].tag` | canonicalname |
| 方舟动物园 | `versions[3].children[0].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[3].children[1].tag` | link |
| 方舟动物园 | `versions[3].children[1].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[3].children[1].attributes.id` | 342942 |
| 方舟动物园 | `versions[3].children[1].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[3].children[1].attributes.inbound` | true |
| 方舟动物园 | `versions[3].children[2].tag` | name |
| 方舟动物园 | `versions[3].children[2].attributes.type` | primary |
| 方舟动物园 | `versions[3].children[2].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[3].children[2].attributes.value` | English 2.1 edition |
| 方舟动物园 | `versions[3].children[3].tag` | link |
| 方舟动物园 | `versions[3].children[3].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[3].children[3].attributes.id` | 30958 |
| 方舟动物园 | `versions[3].children[3].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[3].children[4].tag` | link |
| 方舟动物园 | `versions[3].children[4].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[3].children[4].attributes.id` | 22380 |
| 方舟动物园 | `versions[3].children[4].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[3].children[5].tag` | yearpublished |
| 方舟动物园 | `versions[3].children[5].attributes.value` | 2025 |
| 方舟动物园 | `versions[3].children[6].tag` | productcode |
| 方舟动物园 | `versions[3].children[6].attributes.value` | Whatz Games-02/2025 |
| 方舟动物园 | `versions[3].children[7].tag` | width |
| 方舟动物园 | `versions[3].children[7].attributes.value` | 14.25 |
| 方舟动物园 | `versions[3].children[8].tag` | length |
| 方舟动物园 | `versions[3].children[8].attributes.value` | 11.75 |
| 方舟动物园 | `versions[3].children[9].tag` | depth |
| 方舟动物园 | `versions[3].children[9].attributes.value` | 3 |
| 方舟动物园 | `versions[3].children[10].tag` | weight |
| 方舟动物园 | `versions[3].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[3].children[11].tag` | link |
| 方舟动物园 | `versions[3].children[11].attributes.type` | language |
| 方舟动物园 | `versions[3].children[11].attributes.id` | 2184 |
| 方舟动物园 | `versions[3].children[11].attributes.value` | English |
| 方舟动物园 | `versions[4].tag` | item |
| 方舟动物园 | `versions[4].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[4].attributes.id` | 740534 |
| 方舟动物园 | `versions[4].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[4].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[4].children[1].tag` | image |
| 方舟动物园 | `versions[4].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[4].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[4].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[4].children[3].tag` | link |
| 方舟动物园 | `versions[4].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[4].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[4].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[4].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[4].children[4].tag` | name |
| 方舟动物园 | `versions[4].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[4].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[4].children[4].attributes.value` | English edition 2023 |
| 方舟动物园 | `versions[4].children[5].tag` | link |
| 方舟动物园 | `versions[4].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[4].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[4].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[4].children[6].tag` | link |
| 方舟动物园 | `versions[4].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[4].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[4].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[4].children[7].tag` | link |
| 方舟动物园 | `versions[4].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[4].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[4].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[4].children[8].tag` | link |
| 方舟动物园 | `versions[4].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[4].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[4].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[4].children[9].tag` | link |
| 方舟动物园 | `versions[4].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[4].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[4].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[4].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[4].children[10].attributes.value` | 2023 |
| 方舟动物园 | `versions[4].children[11].tag` | productcode |
| 方舟动物园 | `versions[4].children[11].attributes.value` |  |
| 方舟动物园 | `versions[4].children[12].tag` | width |
| 方舟动物园 | `versions[4].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[4].children[13].tag` | length |
| 方舟动物园 | `versions[4].children[13].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[4].children[14].tag` | depth |
| 方舟动物园 | `versions[4].children[14].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[4].children[15].tag` | weight |
| 方舟动物园 | `versions[4].children[15].attributes.value` | 5.51156 |
| 方舟动物园 | `versions[4].children[16].tag` | link |
| 方舟动物园 | `versions[4].children[16].attributes.type` | language |
| 方舟动物园 | `versions[4].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[4].children[16].attributes.value` | English |
| 方舟动物园 | `versions[5].tag` | item |
| 方舟动物园 | `versions[5].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[5].attributes.id` | 770649 |
| 方舟动物园 | `versions[5].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[5].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[5].children[1].tag` | image |
| 方舟动物园 | `versions[5].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[5].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[5].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[5].children[3].tag` | link |
| 方舟动物园 | `versions[5].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[5].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[5].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[5].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[5].children[4].tag` | name |
| 方舟动物园 | `versions[5].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[5].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[5].children[4].attributes.value` | English edition 2024 |
| 方舟动物园 | `versions[5].children[5].tag` | link |
| 方舟动物园 | `versions[5].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[5].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[5].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[5].children[6].tag` | link |
| 方舟动物园 | `versions[5].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[5].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[5].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[5].children[7].tag` | link |
| 方舟动物园 | `versions[5].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[5].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[5].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[5].children[8].tag` | link |
| 方舟动物园 | `versions[5].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[5].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[5].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[5].children[9].tag` | link |
| 方舟动物园 | `versions[5].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[5].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[5].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[5].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[5].children[10].attributes.value` | 2024 |
| 方舟动物园 | `versions[5].children[11].tag` | productcode |
| 方舟动物园 | `versions[5].children[11].attributes.value` | Whatz Games - 08/2024 |
| 方舟动物园 | `versions[5].children[12].tag` | width |
| 方舟动物园 | `versions[5].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[5].children[13].tag` | length |
| 方舟动物园 | `versions[5].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[5].children[14].tag` | depth |
| 方舟动物园 | `versions[5].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[5].children[15].tag` | weight |
| 方舟动物园 | `versions[5].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[5].children[16].tag` | link |
| 方舟动物园 | `versions[5].children[16].attributes.type` | language |
| 方舟动物园 | `versions[5].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[5].children[16].attributes.value` | English |
| 方舟动物园 | `versions[6].tag` | item |
| 方舟动物园 | `versions[6].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[6].attributes.id` | 638107 |
| 方舟动物园 | `versions[6].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[6].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[6].children[1].tag` | image |
| 方舟动物园 | `versions[6].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[6].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[6].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[6].children[3].tag` | link |
| 方舟动物园 | `versions[6].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[6].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[6].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[6].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[6].children[4].tag` | name |
| 方舟动物园 | `versions[6].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[6].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[6].children[4].attributes.value` | English edition, fifth printing |
| 方舟动物园 | `versions[6].children[5].tag` | link |
| 方舟动物园 | `versions[6].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[6].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[6].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[6].children[6].tag` | link |
| 方舟动物园 | `versions[6].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[6].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[6].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[6].children[7].tag` | link |
| 方舟动物园 | `versions[6].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[6].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[6].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[6].children[8].tag` | link |
| 方舟动物园 | `versions[6].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[6].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[6].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[6].children[9].tag` | link |
| 方舟动物园 | `versions[6].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[6].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[6].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[6].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[6].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[6].children[11].tag` | productcode |
| 方舟动物园 | `versions[6].children[11].attributes.value` |  |
| 方舟动物园 | `versions[6].children[12].tag` | width |
| 方舟动物园 | `versions[6].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[6].children[13].tag` | length |
| 方舟动物园 | `versions[6].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[6].children[14].tag` | depth |
| 方舟动物园 | `versions[6].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[6].children[15].tag` | weight |
| 方舟动物园 | `versions[6].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[6].children[16].tag` | link |
| 方舟动物园 | `versions[6].children[16].attributes.type` | language |
| 方舟动物园 | `versions[6].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[6].children[16].attributes.value` | English |
| 方舟动物园 | `versions[7].tag` | item |
| 方舟动物园 | `versions[7].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[7].attributes.id` | 571944 |
| 方舟动物园 | `versions[7].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[7].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[7].children[1].tag` | image |
| 方舟动物园 | `versions[7].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[7].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[7].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[7].children[3].tag` | link |
| 方舟动物园 | `versions[7].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[7].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[7].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[7].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[7].children[4].tag` | name |
| 方舟动物园 | `versions[7].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[7].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[7].children[4].attributes.value` | English edition, first printing |
| 方舟动物园 | `versions[7].children[5].tag` | link |
| 方舟动物园 | `versions[7].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[7].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[7].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[7].children[6].tag` | link |
| 方舟动物园 | `versions[7].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[7].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[7].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[7].children[7].tag` | link |
| 方舟动物园 | `versions[7].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[7].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[7].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[7].children[8].tag` | link |
| 方舟动物园 | `versions[7].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[7].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[7].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[7].children[9].tag` | link |
| 方舟动物园 | `versions[7].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[7].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[7].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[7].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[7].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[7].children[11].tag` | productcode |
| 方舟动物园 | `versions[7].children[11].attributes.value` |  |
| 方舟动物园 | `versions[7].children[12].tag` | width |
| 方舟动物园 | `versions[7].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[7].children[13].tag` | length |
| 方舟动物园 | `versions[7].children[13].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[7].children[14].tag` | depth |
| 方舟动物园 | `versions[7].children[14].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[7].children[15].tag` | weight |
| 方舟动物园 | `versions[7].children[15].attributes.value` | 5.5 |
| 方舟动物园 | `versions[7].children[16].tag` | link |
| 方舟动物园 | `versions[7].children[16].attributes.type` | language |
| 方舟动物园 | `versions[7].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[7].children[16].attributes.value` | English |
| 方舟动物园 | `versions[8].tag` | item |
| 方舟动物园 | `versions[8].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[8].attributes.id` | 633383 |
| 方舟动物园 | `versions[8].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[8].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[8].children[1].tag` | image |
| 方舟动物园 | `versions[8].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[8].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[8].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[8].children[3].tag` | link |
| 方舟动物园 | `versions[8].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[8].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[8].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[8].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[8].children[4].tag` | name |
| 方舟动物园 | `versions[8].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[8].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[8].children[4].attributes.value` | English edition, fourth printing |
| 方舟动物园 | `versions[8].children[5].tag` | link |
| 方舟动物园 | `versions[8].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[8].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[8].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[8].children[6].tag` | link |
| 方舟动物园 | `versions[8].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[8].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[8].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[8].children[7].tag` | link |
| 方舟动物园 | `versions[8].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[8].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[8].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[8].children[8].tag` | link |
| 方舟动物园 | `versions[8].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[8].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[8].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[8].children[9].tag` | link |
| 方舟动物园 | `versions[8].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[8].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[8].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[8].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[8].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[8].children[11].tag` | productcode |
| 方舟动物园 | `versions[8].children[11].attributes.value` | 57640 |
| 方舟动物园 | `versions[8].children[12].tag` | width |
| 方舟动物园 | `versions[8].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[8].children[13].tag` | length |
| 方舟动物园 | `versions[8].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[8].children[14].tag` | depth |
| 方舟动物园 | `versions[8].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[8].children[15].tag` | weight |
| 方舟动物园 | `versions[8].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[8].children[16].tag` | link |
| 方舟动物园 | `versions[8].children[16].attributes.type` | language |
| 方舟动物园 | `versions[8].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[8].children[16].attributes.value` | English |
| 方舟动物园 | `versions[9].tag` | item |
| 方舟动物园 | `versions[9].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[9].attributes.id` | 615223 |
| 方舟动物园 | `versions[9].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[9].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[9].children[1].tag` | image |
| 方舟动物园 | `versions[9].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[9].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[9].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[9].children[3].tag` | link |
| 方舟动物园 | `versions[9].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[9].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[9].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[9].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[9].children[4].tag` | name |
| 方舟动物园 | `versions[9].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[9].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[9].children[4].attributes.value` | English edition, second printing |
| 方舟动物园 | `versions[9].children[5].tag` | link |
| 方舟动物园 | `versions[9].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[9].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[9].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[9].children[6].tag` | link |
| 方舟动物园 | `versions[9].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[9].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[9].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[9].children[7].tag` | link |
| 方舟动物园 | `versions[9].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[9].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[9].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[9].children[8].tag` | link |
| 方舟动物园 | `versions[9].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[9].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[9].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[9].children[9].tag` | link |
| 方舟动物园 | `versions[9].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[9].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[9].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[9].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[9].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[9].children[11].tag` | productcode |
| 方舟动物园 | `versions[9].children[11].attributes.value` |  |
| 方舟动物园 | `versions[9].children[12].tag` | width |
| 方舟动物园 | `versions[9].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[9].children[13].tag` | length |
| 方舟动物园 | `versions[9].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[9].children[14].tag` | depth |
| 方舟动物园 | `versions[9].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[9].children[15].tag` | weight |
| 方舟动物园 | `versions[9].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[9].children[16].tag` | link |
| 方舟动物园 | `versions[9].children[16].attributes.type` | language |
| 方舟动物园 | `versions[9].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[9].children[16].attributes.value` | English |
| 方舟动物园 | `versions[10].tag` | item |
| 方舟动物园 | `versions[10].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[10].attributes.id` | 684630 |
| 方舟动物园 | `versions[10].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[10].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[10].children[1].tag` | image |
| 方舟动物园 | `versions[10].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[10].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[10].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[10].children[3].tag` | link |
| 方舟动物园 | `versions[10].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[10].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[10].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[10].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[10].children[4].tag` | name |
| 方舟动物园 | `versions[10].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[10].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[10].children[4].attributes.value` | English edition, seventh printing |
| 方舟动物园 | `versions[10].children[5].tag` | link |
| 方舟动物园 | `versions[10].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[10].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[10].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[10].children[6].tag` | link |
| 方舟动物园 | `versions[10].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[10].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[10].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[10].children[7].tag` | link |
| 方舟动物园 | `versions[10].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[10].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[10].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[10].children[8].tag` | link |
| 方舟动物园 | `versions[10].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[10].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[10].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[10].children[9].tag` | link |
| 方舟动物园 | `versions[10].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[10].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[10].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[10].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[10].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[10].children[11].tag` | productcode |
| 方舟动物园 | `versions[10].children[11].attributes.value` |  |
| 方舟动物园 | `versions[10].children[12].tag` | width |
| 方舟动物园 | `versions[10].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[10].children[13].tag` | length |
| 方舟动物园 | `versions[10].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[10].children[14].tag` | depth |
| 方舟动物园 | `versions[10].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[10].children[15].tag` | weight |
| 方舟动物园 | `versions[10].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[10].children[16].tag` | link |
| 方舟动物园 | `versions[10].children[16].attributes.type` | language |
| 方舟动物园 | `versions[10].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[10].children[16].attributes.value` | English |
| 方舟动物园 | `versions[11].tag` | item |
| 方舟动物园 | `versions[11].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[11].attributes.id` | 653093 |
| 方舟动物园 | `versions[11].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[11].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[11].children[1].tag` | image |
| 方舟动物园 | `versions[11].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[11].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[11].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[11].children[3].tag` | link |
| 方舟动物园 | `versions[11].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[11].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[11].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[11].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[11].children[4].tag` | name |
| 方舟动物园 | `versions[11].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[11].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[11].children[4].attributes.value` | English edition, sixth printing |
| 方舟动物园 | `versions[11].children[5].tag` | link |
| 方舟动物园 | `versions[11].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[11].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[11].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[11].children[6].tag` | link |
| 方舟动物园 | `versions[11].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[11].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[11].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[11].children[7].tag` | link |
| 方舟动物园 | `versions[11].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[11].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[11].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[11].children[8].tag` | link |
| 方舟动物园 | `versions[11].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[11].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[11].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[11].children[9].tag` | link |
| 方舟动物园 | `versions[11].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[11].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[11].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[11].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[11].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[11].children[11].tag` | productcode |
| 方舟动物园 | `versions[11].children[11].attributes.value` |  |
| 方舟动物园 | `versions[11].children[12].tag` | width |
| 方舟动物园 | `versions[11].children[12].attributes.value` | 11.81 |
| 方舟动物园 | `versions[11].children[13].tag` | length |
| 方舟动物园 | `versions[11].children[13].attributes.value` | 14.57 |
| 方舟动物园 | `versions[11].children[14].tag` | depth |
| 方舟动物园 | `versions[11].children[14].attributes.value` | 2.76 |
| 方舟动物园 | `versions[11].children[15].tag` | weight |
| 方舟动物园 | `versions[11].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[11].children[16].tag` | link |
| 方舟动物园 | `versions[11].children[16].attributes.type` | language |
| 方舟动物园 | `versions[11].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[11].children[16].attributes.value` | English |
| 方舟动物园 | `versions[12].tag` | item |
| 方舟动物园 | `versions[12].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[12].attributes.id` | 615224 |
| 方舟动物园 | `versions[12].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[12].children[0].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__small/img/4KuHNTWSMPf8vTNDKSRMMI3oOv8=/fit-in/200x150/filters:strip_icc()/pic6293412.jpg |
| 方舟动物园 | `versions[12].children[1].tag` | image |
| 方舟动物园 | `versions[12].children[1].text` | https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg |
| 方舟动物园 | `versions[12].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[12].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[12].children[3].tag` | link |
| 方舟动物园 | `versions[12].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[12].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[12].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[12].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[12].children[4].tag` | name |
| 方舟动物园 | `versions[12].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[12].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[12].children[4].attributes.value` | English edition, third printing |
| 方舟动物园 | `versions[12].children[5].tag` | link |
| 方舟动物园 | `versions[12].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[12].children[5].attributes.id` | 30958 |
| 方舟动物园 | `versions[12].children[5].attributes.value` | Capstone Games |
| 方舟动物园 | `versions[12].children[6].tag` | link |
| 方舟动物园 | `versions[12].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[12].children[6].attributes.id` | 22380 |
| 方舟动物园 | `versions[12].children[6].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[12].children[7].tag` | link |
| 方舟动物园 | `versions[12].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[12].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[12].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[12].children[8].tag` | link |
| 方舟动物园 | `versions[12].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[12].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[12].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[12].children[9].tag` | link |
| 方舟动物园 | `versions[12].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[12].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[12].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[12].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[12].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[12].children[11].tag` | productcode |
| 方舟动物园 | `versions[12].children[11].attributes.value` |  |
| 方舟动物园 | `versions[12].children[12].tag` | width |
| 方舟动物园 | `versions[12].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[12].children[13].tag` | length |
| 方舟动物园 | `versions[12].children[13].attributes.value` | 0 |
| 方舟动物园 | `versions[12].children[14].tag` | depth |
| 方舟动物园 | `versions[12].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[12].children[15].tag` | weight |
| 方舟动物园 | `versions[12].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[12].children[16].tag` | link |
| 方舟动物园 | `versions[12].children[16].attributes.type` | language |
| 方舟动物园 | `versions[12].children[16].attributes.id` | 2184 |
| 方舟动物园 | `versions[12].children[16].attributes.value` | English |
| 方舟动物园 | `versions[13].tag` | item |
| 方舟动物园 | `versions[13].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[13].attributes.id` | 620296 |
| 方舟动物园 | `versions[13].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[13].children[0].text` | https://cf.geekdo-images.com/cer25E1PhVhgrK8Dn8OYkw__small/img/FgVCEZbNyXT7_bxiDXhjwZPHK1Q=/fit-in/200x150/filters:strip_icc()/pic7166886.jpg |
| 方舟动物园 | `versions[13].children[1].tag` | image |
| 方舟动物园 | `versions[13].children[1].text` | https://cf.geekdo-images.com/cer25E1PhVhgrK8Dn8OYkw__original/img/t6zOgHUW2BRX-wBSQoPk9mtX-U0=/0x0/filters:format(jpeg)/pic7166886.jpg |
| 方舟动物园 | `versions[13].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[13].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[13].children[3].tag` | link |
| 方舟动物园 | `versions[13].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[13].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[13].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[13].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[13].children[4].tag` | name |
| 方舟动物园 | `versions[13].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[13].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[13].children[4].attributes.value` | Finnish edition |
| 方舟动物园 | `versions[13].children[5].tag` | link |
| 方舟动物园 | `versions[13].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[13].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[13].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[13].children[6].tag` | link |
| 方舟动物园 | `versions[13].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[13].children[6].attributes.id` | 3218 |
| 方舟动物园 | `versions[13].children[6].attributes.value` | Lautapelit.fi |
| 方舟动物园 | `versions[13].children[7].tag` | link |
| 方舟动物园 | `versions[13].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[13].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[13].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[13].children[8].tag` | link |
| 方舟动物园 | `versions[13].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[13].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[13].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[13].children[9].tag` | link |
| 方舟动物园 | `versions[13].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[13].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[13].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[13].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[13].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[13].children[11].tag` | productcode |
| 方舟动物园 | `versions[13].children[11].attributes.value` |  |
| 方舟动物园 | `versions[13].children[12].tag` | width |
| 方舟动物园 | `versions[13].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[13].children[13].tag` | length |
| 方舟动物园 | `versions[13].children[13].attributes.value` | 0 |
| 方舟动物园 | `versions[13].children[14].tag` | depth |
| 方舟动物园 | `versions[13].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[13].children[15].tag` | weight |
| 方舟动物园 | `versions[13].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[13].children[16].tag` | link |
| 方舟动物园 | `versions[13].children[16].attributes.type` | language |
| 方舟动物园 | `versions[13].children[16].attributes.id` | 2186 |
| 方舟动物园 | `versions[13].children[16].attributes.value` | Finnish |
| 方舟动物园 | `versions[14].tag` | item |
| 方舟动物园 | `versions[14].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[14].attributes.id` | 583278 |
| 方舟动物园 | `versions[14].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[14].children[0].text` | https://cf.geekdo-images.com/Qc0898I81-4Biw2PhxaMJw__small/img/emn_Tj4fQRrZkH6WK2lipKoTn1c=/fit-in/200x150/filters:strip_icc()/pic6921531.png |
| 方舟动物园 | `versions[14].children[1].tag` | image |
| 方舟动物园 | `versions[14].children[1].text` | https://cf.geekdo-images.com/Qc0898I81-4Biw2PhxaMJw__original/img/XTet_MmbeIX9twGTS8IHPOdgf8c=/0x0/filters:format(png)/pic6921531.png |
| 方舟动物园 | `versions[14].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[14].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[14].children[3].tag` | link |
| 方舟动物园 | `versions[14].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[14].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[14].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[14].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[14].children[4].tag` | name |
| 方舟动物园 | `versions[14].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[14].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[14].children[4].attributes.value` | French edition |
| 方舟动物园 | `versions[14].children[5].tag` | link |
| 方舟动物园 | `versions[14].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[14].children[5].attributes.id` | 29409 |
| 方舟动物园 | `versions[14].children[5].attributes.value` | Super Meeple |
| 方舟动物园 | `versions[14].children[6].tag` | link |
| 方舟动物园 | `versions[14].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[14].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[14].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[14].children[7].tag` | link |
| 方舟动物园 | `versions[14].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[14].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[14].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[14].children[8].tag` | link |
| 方舟动物园 | `versions[14].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[14].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[14].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[14].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[14].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[14].children[10].tag` | productcode |
| 方舟动物园 | `versions[14].children[10].attributes.value` |  |
| 方舟动物园 | `versions[14].children[11].tag` | width |
| 方舟动物园 | `versions[14].children[11].attributes.value` | 11.811 |
| 方舟动物园 | `versions[14].children[12].tag` | length |
| 方舟动物园 | `versions[14].children[12].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[14].children[13].tag` | depth |
| 方舟动物园 | `versions[14].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[14].children[14].tag` | weight |
| 方舟动物园 | `versions[14].children[14].attributes.value` | 5 |
| 方舟动物园 | `versions[14].children[15].tag` | link |
| 方舟动物园 | `versions[14].children[15].attributes.type` | language |
| 方舟动物园 | `versions[14].children[15].attributes.id` | 2187 |
| 方舟动物园 | `versions[14].children[15].attributes.value` | French |
| 方舟动物园 | `versions[15].tag` | item |
| 方舟动物园 | `versions[15].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[15].attributes.id` | 775030 |
| 方舟动物园 | `versions[15].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[15].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[15].children[1].tag` | image |
| 方舟动物园 | `versions[15].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[15].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[15].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[15].children[3].tag` | link |
| 方舟动物园 | `versions[15].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[15].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[15].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[15].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[15].children[4].tag` | name |
| 方舟动物园 | `versions[15].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[15].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[15].children[4].attributes.value` | German edition, eigth printing |
| 方舟动物园 | `versions[15].children[5].tag` | link |
| 方舟动物园 | `versions[15].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[15].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[15].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[15].children[6].tag` | link |
| 方舟动物园 | `versions[15].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[15].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[15].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[15].children[7].tag` | link |
| 方舟动物园 | `versions[15].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[15].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[15].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[15].children[8].tag` | link |
| 方舟动物园 | `versions[15].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[15].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[15].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[15].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[15].children[9].attributes.value` | 2024 |
| 方舟动物园 | `versions[15].children[10].tag` | productcode |
| 方舟动物园 | `versions[15].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[15].children[11].tag` | width |
| 方舟动物园 | `versions[15].children[11].attributes.value` | 11.811 |
| 方舟动物园 | `versions[15].children[12].tag` | length |
| 方舟动物园 | `versions[15].children[12].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[15].children[13].tag` | depth |
| 方舟动物园 | `versions[15].children[13].attributes.value` | 2.83465 |
| 方舟动物园 | `versions[15].children[14].tag` | weight |
| 方舟动物园 | `versions[15].children[14].attributes.value` | 5.29109 |
| 方舟动物园 | `versions[15].children[15].tag` | link |
| 方舟动物园 | `versions[15].children[15].attributes.type` | language |
| 方舟动物园 | `versions[15].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[15].children[15].attributes.value` | German |
| 方舟动物园 | `versions[16].tag` | item |
| 方舟动物园 | `versions[16].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[16].attributes.id` | 643677 |
| 方舟动物园 | `versions[16].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[16].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[16].children[1].tag` | image |
| 方舟动物园 | `versions[16].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[16].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[16].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[16].children[3].tag` | link |
| 方舟动物园 | `versions[16].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[16].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[16].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[16].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[16].children[4].tag` | name |
| 方舟动物园 | `versions[16].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[16].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[16].children[4].attributes.value` | German edition, fifth printing |
| 方舟动物园 | `versions[16].children[5].tag` | link |
| 方舟动物园 | `versions[16].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[16].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[16].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[16].children[6].tag` | link |
| 方舟动物园 | `versions[16].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[16].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[16].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[16].children[7].tag` | link |
| 方舟动物园 | `versions[16].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[16].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[16].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[16].children[8].tag` | link |
| 方舟动物园 | `versions[16].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[16].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[16].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[16].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[16].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[16].children[10].tag` | productcode |
| 方舟动物园 | `versions[16].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[16].children[11].tag` | width |
| 方舟动物园 | `versions[16].children[11].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[16].children[12].tag` | length |
| 方舟动物园 | `versions[16].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[16].children[13].tag` | depth |
| 方舟动物园 | `versions[16].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[16].children[14].tag` | weight |
| 方舟动物园 | `versions[16].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[16].children[15].tag` | link |
| 方舟动物园 | `versions[16].children[15].attributes.type` | language |
| 方舟动物园 | `versions[16].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[16].children[15].attributes.value` | German |
| 方舟动物园 | `versions[17].tag` | item |
| 方舟动物园 | `versions[17].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[17].attributes.id` | 571945 |
| 方舟动物园 | `versions[17].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[17].children[0].text` | https://cf.geekdo-images.com/i-STYl4vtiyOoxehKIx_EA__small/img/Keu0fSfiy7KsiHGGuRUx40pzVt4=/fit-in/200x150/filters:strip_icc()/pic6570411.jpg |
| 方舟动物园 | `versions[17].children[1].tag` | image |
| 方舟动物园 | `versions[17].children[1].text` | https://cf.geekdo-images.com/i-STYl4vtiyOoxehKIx_EA__original/img/uwFMsibZ0AlEzlc-J0rl7o5MU5M=/0x0/filters:format(jpeg)/pic6570411.jpg |
| 方舟动物园 | `versions[17].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[17].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[17].children[3].tag` | link |
| 方舟动物园 | `versions[17].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[17].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[17].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[17].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[17].children[4].tag` | name |
| 方舟动物园 | `versions[17].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[17].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[17].children[4].attributes.value` | German edition, first printing |
| 方舟动物园 | `versions[17].children[5].tag` | link |
| 方舟动物园 | `versions[17].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[17].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[17].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[17].children[6].tag` | link |
| 方舟动物园 | `versions[17].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[17].children[6].attributes.id` | 11462 |
| 方舟动物园 | `versions[17].children[6].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[17].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[17].children[7].attributes.value` | 2021 |
| 方舟动物园 | `versions[17].children[8].tag` | productcode |
| 方舟动物园 | `versions[17].children[8].attributes.value` | 31012 |
| 方舟动物园 | `versions[17].children[9].tag` | width |
| 方舟动物园 | `versions[17].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[17].children[10].tag` | length |
| 方舟动物园 | `versions[17].children[10].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[17].children[11].tag` | depth |
| 方舟动物园 | `versions[17].children[11].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[17].children[12].tag` | weight |
| 方舟动物园 | `versions[17].children[12].attributes.value` | 5 |
| 方舟动物园 | `versions[17].children[13].tag` | link |
| 方舟动物园 | `versions[17].children[13].attributes.type` | language |
| 方舟动物园 | `versions[17].children[13].attributes.id` | 2188 |
| 方舟动物园 | `versions[17].children[13].attributes.value` | German |
| 方舟动物园 | `versions[18].tag` | item |
| 方舟动物园 | `versions[18].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[18].attributes.id` | 641350 |
| 方舟动物园 | `versions[18].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[18].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[18].children[1].tag` | image |
| 方舟动物园 | `versions[18].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[18].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[18].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[18].children[3].tag` | link |
| 方舟动物园 | `versions[18].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[18].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[18].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[18].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[18].children[4].tag` | name |
| 方舟动物园 | `versions[18].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[18].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[18].children[4].attributes.value` | German edition, fourth printing |
| 方舟动物园 | `versions[18].children[5].tag` | link |
| 方舟动物园 | `versions[18].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[18].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[18].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[18].children[6].tag` | link |
| 方舟动物园 | `versions[18].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[18].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[18].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[18].children[7].tag` | link |
| 方舟动物园 | `versions[18].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[18].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[18].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[18].children[8].tag` | link |
| 方舟动物园 | `versions[18].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[18].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[18].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[18].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[18].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[18].children[10].tag` | productcode |
| 方舟动物园 | `versions[18].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[18].children[11].tag` | width |
| 方舟动物园 | `versions[18].children[11].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[18].children[12].tag` | length |
| 方舟动物园 | `versions[18].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[18].children[13].tag` | depth |
| 方舟动物园 | `versions[18].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[18].children[14].tag` | weight |
| 方舟动物园 | `versions[18].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[18].children[15].tag` | link |
| 方舟动物园 | `versions[18].children[15].attributes.type` | language |
| 方舟动物园 | `versions[18].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[18].children[15].attributes.value` | German |
| 方舟动物园 | `versions[19].tag` | item |
| 方舟动物园 | `versions[19].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[19].attributes.id` | 615221 |
| 方舟动物园 | `versions[19].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[19].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[19].children[1].tag` | image |
| 方舟动物园 | `versions[19].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[19].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[19].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[19].children[3].tag` | link |
| 方舟动物园 | `versions[19].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[19].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[19].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[19].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[19].children[4].tag` | name |
| 方舟动物园 | `versions[19].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[19].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[19].children[4].attributes.value` | German edition, second printing |
| 方舟动物园 | `versions[19].children[5].tag` | link |
| 方舟动物园 | `versions[19].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[19].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[19].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[19].children[6].tag` | link |
| 方舟动物园 | `versions[19].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[19].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[19].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[19].children[7].tag` | link |
| 方舟动物园 | `versions[19].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[19].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[19].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[19].children[8].tag` | link |
| 方舟动物园 | `versions[19].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[19].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[19].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[19].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[19].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[19].children[10].tag` | productcode |
| 方舟动物园 | `versions[19].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[19].children[11].tag` | width |
| 方舟动物园 | `versions[19].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[19].children[12].tag` | length |
| 方舟动物园 | `versions[19].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[19].children[13].tag` | depth |
| 方舟动物园 | `versions[19].children[13].attributes.value` | 0 |
| 方舟动物园 | `versions[19].children[14].tag` | weight |
| 方舟动物园 | `versions[19].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[19].children[15].tag` | link |
| 方舟动物园 | `versions[19].children[15].attributes.type` | language |
| 方舟动物园 | `versions[19].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[19].children[15].attributes.value` | German |
| 方舟动物园 | `versions[20].tag` | item |
| 方舟动物园 | `versions[20].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[20].attributes.id` | 756566 |
| 方舟动物园 | `versions[20].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[20].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[20].children[1].tag` | image |
| 方舟动物园 | `versions[20].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[20].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[20].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[20].children[3].tag` | link |
| 方舟动物园 | `versions[20].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[20].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[20].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[20].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[20].children[4].tag` | name |
| 方舟动物园 | `versions[20].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[20].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[20].children[4].attributes.value` | German edition, seventh printing |
| 方舟动物园 | `versions[20].children[5].tag` | link |
| 方舟动物园 | `versions[20].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[20].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[20].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[20].children[6].tag` | link |
| 方舟动物园 | `versions[20].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[20].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[20].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[20].children[7].tag` | link |
| 方舟动物园 | `versions[20].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[20].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[20].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[20].children[8].tag` | link |
| 方舟动物园 | `versions[20].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[20].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[20].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[20].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[20].children[9].attributes.value` | 2023 |
| 方舟动物园 | `versions[20].children[10].tag` | productcode |
| 方舟动物园 | `versions[20].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[20].children[11].tag` | width |
| 方舟动物园 | `versions[20].children[11].attributes.value` | 11.811 |
| 方舟动物园 | `versions[20].children[12].tag` | length |
| 方舟动物园 | `versions[20].children[12].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[20].children[13].tag` | depth |
| 方舟动物园 | `versions[20].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[20].children[14].tag` | weight |
| 方舟动物园 | `versions[20].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[20].children[15].tag` | link |
| 方舟动物园 | `versions[20].children[15].attributes.type` | language |
| 方舟动物园 | `versions[20].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[20].children[15].attributes.value` | German |
| 方舟动物园 | `versions[21].tag` | item |
| 方舟动物园 | `versions[21].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[21].attributes.id` | 657726 |
| 方舟动物园 | `versions[21].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[21].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[21].children[1].tag` | image |
| 方舟动物园 | `versions[21].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[21].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[21].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[21].children[3].tag` | link |
| 方舟动物园 | `versions[21].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[21].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[21].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[21].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[21].children[4].tag` | name |
| 方舟动物园 | `versions[21].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[21].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[21].children[4].attributes.value` | German edition, sixth printing |
| 方舟动物园 | `versions[21].children[5].tag` | link |
| 方舟动物园 | `versions[21].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[21].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[21].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[21].children[6].tag` | link |
| 方舟动物园 | `versions[21].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[21].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[21].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[21].children[7].tag` | link |
| 方舟动物园 | `versions[21].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[21].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[21].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[21].children[8].tag` | link |
| 方舟动物园 | `versions[21].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[21].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[21].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[21].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[21].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[21].children[10].tag` | productcode |
| 方舟动物园 | `versions[21].children[10].attributes.value` | 31012 |
| 方舟动物园 | `versions[21].children[11].tag` | width |
| 方舟动物园 | `versions[21].children[11].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[21].children[12].tag` | length |
| 方舟动物园 | `versions[21].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[21].children[13].tag` | depth |
| 方舟动物园 | `versions[21].children[13].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[21].children[14].tag` | weight |
| 方舟动物园 | `versions[21].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[21].children[15].tag` | link |
| 方舟动物园 | `versions[21].children[15].attributes.type` | language |
| 方舟动物园 | `versions[21].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[21].children[15].attributes.value` | German |
| 方舟动物园 | `versions[22].tag` | item |
| 方舟动物园 | `versions[22].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[22].attributes.id` | 615222 |
| 方舟动物园 | `versions[22].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[22].children[0].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__small/img/wA7kVVCch8d9ivj1jhdEEJNxk28=/fit-in/200x150/filters:strip_icc()/pic7239207.jpg |
| 方舟动物园 | `versions[22].children[1].tag` | image |
| 方舟动物园 | `versions[22].children[1].text` | https://cf.geekdo-images.com/J2XVIZmOWfh19LBO_CrdNA__original/img/2k2bO9nDljTTZ0hlpF3kcB0mebM=/0x0/filters:format(jpeg)/pic7239207.jpg |
| 方舟动物园 | `versions[22].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[22].children[2].attributes.value` | Arche Nova |
| 方舟动物园 | `versions[22].children[3].tag` | link |
| 方舟动物园 | `versions[22].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[22].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[22].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[22].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[22].children[4].tag` | name |
| 方舟动物园 | `versions[22].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[22].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[22].children[4].attributes.value` | German edition, third printing |
| 方舟动物园 | `versions[22].children[5].tag` | link |
| 方舟动物园 | `versions[22].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[22].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[22].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[22].children[6].tag` | link |
| 方舟动物园 | `versions[22].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[22].children[6].attributes.id` | 138547 |
| 方舟动物园 | `versions[22].children[6].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[22].children[7].tag` | link |
| 方舟动物园 | `versions[22].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[22].children[7].attributes.id` | 11462 |
| 方舟动物园 | `versions[22].children[7].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[22].children[8].tag` | link |
| 方舟动物园 | `versions[22].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[22].children[8].attributes.id` | 12484 |
| 方舟动物园 | `versions[22].children[8].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[22].children[9].tag` | yearpublished |
| 方舟动物园 | `versions[22].children[9].attributes.value` | 2022 |
| 方舟动物园 | `versions[22].children[10].tag` | productcode |
| 方舟动物园 | `versions[22].children[10].attributes.value` |  |
| 方舟动物园 | `versions[22].children[11].tag` | width |
| 方舟动物园 | `versions[22].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[22].children[12].tag` | length |
| 方舟动物园 | `versions[22].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[22].children[13].tag` | depth |
| 方舟动物园 | `versions[22].children[13].attributes.value` | 0 |
| 方舟动物园 | `versions[22].children[14].tag` | weight |
| 方舟动物园 | `versions[22].children[14].attributes.value` | 0 |
| 方舟动物园 | `versions[22].children[15].tag` | link |
| 方舟动物园 | `versions[22].children[15].attributes.type` | language |
| 方舟动物园 | `versions[22].children[15].attributes.id` | 2188 |
| 方舟动物园 | `versions[22].children[15].attributes.value` | German |
| 方舟动物园 | `versions[23].tag` | item |
| 方舟动物园 | `versions[23].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[23].attributes.id` | 599393 |
| 方舟动物园 | `versions[23].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[23].children[0].text` | https://cf.geekdo-images.com/GVpF0ELxF2SFLtoWGo1kIA__small/img/tbMKVL_dxb37Wqy-_sr0iHr0G_A=/fit-in/200x150/filters:strip_icc()/pic8963303.jpg |
| 方舟动物园 | `versions[23].children[1].tag` | image |
| 方舟动物园 | `versions[23].children[1].text` | https://cf.geekdo-images.com/GVpF0ELxF2SFLtoWGo1kIA__original/img/RdyvqQvgT7FfvDkhQjjF5FUWyg8=/0x0/filters:format(jpeg)/pic8963303.jpg |
| 方舟动物园 | `versions[23].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[23].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[23].children[3].tag` | link |
| 方舟动物园 | `versions[23].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[23].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[23].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[23].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[23].children[4].tag` | name |
| 方舟动物园 | `versions[23].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[23].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[23].children[4].attributes.value` | Hungarian first edition |
| 方舟动物园 | `versions[23].children[5].tag` | link |
| 方舟动物园 | `versions[23].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[23].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[23].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[23].children[6].tag` | link |
| 方舟动物园 | `versions[23].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[23].children[6].attributes.id` | 8820 |
| 方舟动物园 | `versions[23].children[6].attributes.value` | Gémklub |
| 方舟动物园 | `versions[23].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[23].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[23].children[8].tag` | productcode |
| 方舟动物园 | `versions[23].children[8].attributes.value` |  |
| 方舟动物园 | `versions[23].children[9].tag` | width |
| 方舟动物园 | `versions[23].children[9].attributes.value` | 11.81 |
| 方舟动物园 | `versions[23].children[10].tag` | length |
| 方舟动物园 | `versions[23].children[10].attributes.value` | 14.57 |
| 方舟动物园 | `versions[23].children[11].tag` | depth |
| 方舟动物园 | `versions[23].children[11].attributes.value` | 2.76 |
| 方舟动物园 | `versions[23].children[12].tag` | weight |
| 方舟动物园 | `versions[23].children[12].attributes.value` | 5.51156 |
| 方舟动物园 | `versions[23].children[13].tag` | link |
| 方舟动物园 | `versions[23].children[13].attributes.type` | language |
| 方舟动物园 | `versions[23].children[13].attributes.id` | 2191 |
| 方舟动物园 | `versions[23].children[13].attributes.value` | Hungarian |
| 方舟动物园 | `versions[24].tag` | item |
| 方舟动物园 | `versions[24].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[24].attributes.id` | 768047 |
| 方舟动物园 | `versions[24].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[24].children[0].text` | https://cf.geekdo-images.com/GVpF0ELxF2SFLtoWGo1kIA__small/img/tbMKVL_dxb37Wqy-_sr0iHr0G_A=/fit-in/200x150/filters:strip_icc()/pic8963303.jpg |
| 方舟动物园 | `versions[24].children[1].tag` | image |
| 方舟动物园 | `versions[24].children[1].text` | https://cf.geekdo-images.com/GVpF0ELxF2SFLtoWGo1kIA__original/img/RdyvqQvgT7FfvDkhQjjF5FUWyg8=/0x0/filters:format(jpeg)/pic8963303.jpg |
| 方舟动物园 | `versions[24].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[24].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[24].children[3].tag` | link |
| 方舟动物园 | `versions[24].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[24].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[24].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[24].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[24].children[4].tag` | name |
| 方舟动物园 | `versions[24].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[24].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[24].children[4].attributes.value` | Hungarian second edition |
| 方舟动物园 | `versions[24].children[5].tag` | link |
| 方舟动物园 | `versions[24].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[24].children[5].attributes.id` | 8820 |
| 方舟动物园 | `versions[24].children[5].attributes.value` | Gémklub |
| 方舟动物园 | `versions[24].children[6].tag` | yearpublished |
| 方舟动物园 | `versions[24].children[6].attributes.value` | 2023 |
| 方舟动物园 | `versions[24].children[7].tag` | productcode |
| 方舟动物园 | `versions[24].children[7].attributes.value` | 754022 |
| 方舟动物园 | `versions[24].children[8].tag` | width |
| 方舟动物园 | `versions[24].children[8].attributes.value` | 11.811 |
| 方舟动物园 | `versions[24].children[9].tag` | length |
| 方舟动物园 | `versions[24].children[9].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[24].children[10].tag` | depth |
| 方舟动物园 | `versions[24].children[10].attributes.value` | 2.83465 |
| 方舟动物园 | `versions[24].children[11].tag` | weight |
| 方舟动物园 | `versions[24].children[11].attributes.value` | 5.37928 |
| 方舟动物园 | `versions[24].children[12].tag` | link |
| 方舟动物园 | `versions[24].children[12].attributes.type` | language |
| 方舟动物园 | `versions[24].children[12].attributes.id` | 2191 |
| 方舟动物园 | `versions[24].children[12].attributes.value` | Hungarian |
| 方舟动物园 | `versions[25].tag` | item |
| 方舟动物园 | `versions[25].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[25].attributes.id` | 591051 |
| 方舟动物园 | `versions[25].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[25].children[0].text` | https://cf.geekdo-images.com/2_pCEHfQOChCKYgKyaSLlw__small/img/6I_61whGGsJhWdzOOJzSipV0nK4=/fit-in/200x150/filters:strip_icc()/pic9287046.png |
| 方舟动物园 | `versions[25].children[1].tag` | image |
| 方舟动物园 | `versions[25].children[1].text` | https://cf.geekdo-images.com/2_pCEHfQOChCKYgKyaSLlw__original/img/iTNCtSmZfItjrYBv38mCsRgdGdI=/0x0/filters:format(png)/pic9287046.png |
| 方舟动物园 | `versions[25].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[25].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[25].children[3].tag` | link |
| 方舟动物园 | `versions[25].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[25].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[25].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[25].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[25].children[4].tag` | name |
| 方舟动物园 | `versions[25].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[25].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[25].children[4].attributes.value` | Italian edition |
| 方舟动物园 | `versions[25].children[5].tag` | link |
| 方舟动物园 | `versions[25].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[25].children[5].attributes.id` | 10768 |
| 方舟动物园 | `versions[25].children[5].attributes.value` | Cranio Creations |
| 方舟动物园 | `versions[25].children[6].tag` | link |
| 方舟动物园 | `versions[25].children[6].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[25].children[6].attributes.id` | 11462 |
| 方舟动物园 | `versions[25].children[6].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[25].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[25].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[25].children[8].tag` | productcode |
| 方舟动物园 | `versions[25].children[8].attributes.value` | CC331 |
| 方舟动物园 | `versions[25].children[9].tag` | width |
| 方舟动物园 | `versions[25].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[25].children[10].tag` | length |
| 方舟动物园 | `versions[25].children[10].attributes.value` | 14.1732 |
| 方舟动物园 | `versions[25].children[11].tag` | depth |
| 方舟动物园 | `versions[25].children[11].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[25].children[12].tag` | weight |
| 方舟动物园 | `versions[25].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[25].children[13].tag` | link |
| 方舟动物园 | `versions[25].children[13].attributes.type` | language |
| 方舟动物园 | `versions[25].children[13].attributes.id` | 2193 |
| 方舟动物园 | `versions[25].children[13].attributes.value` | Italian |
| 方舟动物园 | `versions[26].tag` | item |
| 方舟动物园 | `versions[26].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[26].attributes.id` | 609764 |
| 方舟动物园 | `versions[26].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[26].children[0].text` | https://cf.geekdo-images.com/DMmP3NtNyx8spemaNVPyAw__small/img/_uMfh9H2RtugX8qoMf3RfwWvbJs=/fit-in/200x150/filters:strip_icc()/pic6973630.jpg |
| 方舟动物园 | `versions[26].children[1].tag` | image |
| 方舟动物园 | `versions[26].children[1].text` | https://cf.geekdo-images.com/DMmP3NtNyx8spemaNVPyAw__original/img/1IX9VinxsdtSb4ad6QmNf6Tfk30=/0x0/filters:format(jpeg)/pic6973630.jpg |
| 方舟动物园 | `versions[26].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[26].children[2].attributes.value` | アーク・ノヴァ 新たなる方舟 |
| 方舟动物园 | `versions[26].children[3].tag` | link |
| 方舟动物园 | `versions[26].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[26].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[26].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[26].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[26].children[4].tag` | name |
| 方舟动物园 | `versions[26].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[26].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[26].children[4].attributes.value` | Japanese edition |
| 方舟动物园 | `versions[26].children[5].tag` | link |
| 方舟动物园 | `versions[26].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[26].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[26].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[26].children[6].tag` | link |
| 方舟动物园 | `versions[26].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[26].children[6].attributes.id` | 22609 |
| 方舟动物园 | `versions[26].children[6].attributes.value` | テンデイズゲームズ (TendaysGames) |
| 方舟动物园 | `versions[26].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[26].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[26].children[8].tag` | productcode |
| 方舟动物园 | `versions[26].children[8].attributes.value` |  |
| 方舟动物园 | `versions[26].children[9].tag` | width |
| 方舟动物园 | `versions[26].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[26].children[10].tag` | length |
| 方舟动物园 | `versions[26].children[10].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[26].children[11].tag` | depth |
| 方舟动物园 | `versions[26].children[11].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[26].children[12].tag` | weight |
| 方舟动物园 | `versions[26].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[26].children[13].tag` | link |
| 方舟动物园 | `versions[26].children[13].attributes.type` | language |
| 方舟动物园 | `versions[26].children[13].attributes.id` | 2194 |
| 方舟动物园 | `versions[26].children[13].attributes.value` | Japanese |
| 方舟动物园 | `versions[27].tag` | item |
| 方舟动物园 | `versions[27].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[27].attributes.id` | 588632 |
| 方舟动物园 | `versions[27].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[27].children[0].text` | https://cf.geekdo-images.com/7Rl7ex5-G7ezt-XscpSzTg__small/img/321D3KVongDG25qzX_4Qj_lP8H4=/fit-in/200x150/filters:strip_icc()/pic6524979.png |
| 方舟动物园 | `versions[27].children[1].tag` | image |
| 方舟动物园 | `versions[27].children[1].text` | https://cf.geekdo-images.com/7Rl7ex5-G7ezt-XscpSzTg__original/img/4mfR5lPzwYBQDQCv2VAxDRYfoRg=/0x0/filters:format(png)/pic6524979.png |
| 方舟动物园 | `versions[27].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[27].children[2].attributes.value` | 아크 노바 |
| 方舟动物园 | `versions[27].children[3].tag` | link |
| 方舟动物园 | `versions[27].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[27].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[27].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[27].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[27].children[4].tag` | name |
| 方舟动物园 | `versions[27].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[27].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[27].children[4].attributes.value` | Korean edition |
| 方舟动物园 | `versions[27].children[5].tag` | link |
| 方舟动物园 | `versions[27].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[27].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[27].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[27].children[6].tag` | link |
| 方舟动物园 | `versions[27].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[27].children[6].attributes.id` | 8291 |
| 方舟动物园 | `versions[27].children[6].attributes.value` | Korea Boardgames |
| 方舟动物园 | `versions[27].children[7].tag` | link |
| 方舟动物园 | `versions[27].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[27].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[27].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[27].children[8].tag` | link |
| 方舟动物园 | `versions[27].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[27].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[27].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[27].children[9].tag` | link |
| 方舟动物园 | `versions[27].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[27].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[27].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[27].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[27].children[10].attributes.value` | 2022 |
| 方舟动物园 | `versions[27].children[11].tag` | productcode |
| 方舟动物园 | `versions[27].children[11].attributes.value` |  |
| 方舟动物园 | `versions[27].children[12].tag` | width |
| 方舟动物园 | `versions[27].children[12].attributes.value` | 11.6142 |
| 方舟动物园 | `versions[27].children[13].tag` | length |
| 方舟动物园 | `versions[27].children[13].attributes.value` | 14.1732 |
| 方舟动物园 | `versions[27].children[14].tag` | depth |
| 方舟动物园 | `versions[27].children[14].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[27].children[15].tag` | weight |
| 方舟动物园 | `versions[27].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[27].children[16].tag` | link |
| 方舟动物园 | `versions[27].children[16].attributes.type` | language |
| 方舟动物园 | `versions[27].children[16].attributes.id` | 2195 |
| 方舟动物园 | `versions[27].children[16].attributes.value` | Korean |
| 方舟动物园 | `versions[28].tag` | item |
| 方舟动物园 | `versions[28].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[28].attributes.id` | 597384 |
| 方舟动物园 | `versions[28].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[28].children[0].text` | https://cf.geekdo-images.com/PJXqdmRtG4z2p30GMfZSXw__small/img/Mf6TngCNrFqKic53bo_PHhjf0i0=/fit-in/200x150/filters:strip_icc()/pic8567813.jpg |
| 方舟动物园 | `versions[28].children[1].tag` | image |
| 方舟动物园 | `versions[28].children[1].text` | https://cf.geekdo-images.com/PJXqdmRtG4z2p30GMfZSXw__original/img/YH6zGu0kc1DY7mtZfg95GBdL3Zg=/0x0/filters:format(jpeg)/pic8567813.jpg |
| 方舟动物园 | `versions[28].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[28].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[28].children[3].tag` | link |
| 方舟动物园 | `versions[28].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[28].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[28].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[28].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[28].children[4].tag` | name |
| 方舟动物园 | `versions[28].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[28].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[28].children[4].attributes.value` | Polish edition |
| 方舟动物园 | `versions[28].children[5].tag` | link |
| 方舟动物园 | `versions[28].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[28].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[28].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[28].children[6].tag` | link |
| 方舟动物园 | `versions[28].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[28].children[6].attributes.id` | 2726 |
| 方舟动物园 | `versions[28].children[6].attributes.value` | Portal Games |
| 方舟动物园 | `versions[28].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[28].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[28].children[8].tag` | productcode |
| 方舟动物园 | `versions[28].children[8].attributes.value` | ARN010222PL |
| 方舟动物园 | `versions[28].children[9].tag` | width |
| 方舟动物园 | `versions[28].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[28].children[10].tag` | length |
| 方舟动物园 | `versions[28].children[10].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[28].children[11].tag` | depth |
| 方舟动物园 | `versions[28].children[11].attributes.value` | 2.79528 |
| 方舟动物园 | `versions[28].children[12].tag` | weight |
| 方舟动物园 | `versions[28].children[12].attributes.value` | 5.57329 |
| 方舟动物园 | `versions[28].children[13].tag` | link |
| 方舟动物园 | `versions[28].children[13].attributes.type` | language |
| 方舟动物园 | `versions[28].children[13].attributes.id` | 2199 |
| 方舟动物园 | `versions[28].children[13].attributes.value` | Polish |
| 方舟动物园 | `versions[29].tag` | item |
| 方舟动物园 | `versions[29].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[29].attributes.id` | 652910 |
| 方舟动物园 | `versions[29].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[29].children[0].text` | https://cf.geekdo-images.com/NspWVxrErgJnCB2jhL6LBw__small/img/S8WiFMB8SQ_S-Y5CauU8PFLSnyw=/fit-in/200x150/filters:strip_icc()/pic7394595.png |
| 方舟动物园 | `versions[29].children[1].tag` | image |
| 方舟动物园 | `versions[29].children[1].text` | https://cf.geekdo-images.com/NspWVxrErgJnCB2jhL6LBw__original/img/wkZ-iFeAtc1_sIcH0wpi1wdFtXM=/0x0/filters:format(png)/pic7394595.png |
| 方舟动物园 | `versions[29].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[29].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[29].children[3].tag` | link |
| 方舟动物园 | `versions[29].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[29].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[29].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[29].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[29].children[4].tag` | name |
| 方舟动物园 | `versions[29].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[29].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[29].children[4].attributes.value` | Portuguese edition |
| 方舟动物园 | `versions[29].children[5].tag` | link |
| 方舟动物园 | `versions[29].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[29].children[5].attributes.id` | 42325 |
| 方舟动物园 | `versions[29].children[5].attributes.value` | Grok Games |
| 方舟动物园 | `versions[29].children[6].tag` | link |
| 方舟动物园 | `versions[29].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[29].children[6].attributes.id` | 29242 |
| 方舟动物园 | `versions[29].children[6].attributes.value` | Ludofy Creative |
| 方舟动物园 | `versions[29].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[29].children[7].attributes.value` | 2023 |
| 方舟动物园 | `versions[29].children[8].tag` | productcode |
| 方舟动物园 | `versions[29].children[8].attributes.value` |  |
| 方舟动物园 | `versions[29].children[9].tag` | width |
| 方舟动物园 | `versions[29].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[29].children[10].tag` | length |
| 方舟动物园 | `versions[29].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[29].children[11].tag` | depth |
| 方舟动物园 | `versions[29].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[29].children[12].tag` | weight |
| 方舟动物园 | `versions[29].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[29].children[13].tag` | link |
| 方舟动物园 | `versions[29].children[13].attributes.type` | language |
| 方舟动物园 | `versions[29].children[13].attributes.id` | 2200 |
| 方舟动物园 | `versions[29].children[13].attributes.value` | Portuguese |
| 方舟动物园 | `versions[30].tag` | item |
| 方舟动物园 | `versions[30].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[30].attributes.id` | 625892 |
| 方舟动物园 | `versions[30].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[30].children[0].text` | https://cf.geekdo-images.com/_V7uMu2neMaPs9QZ-Xs6Bw__small/img/2qdRfRmgkSN__EiIOdEJ-RD865M=/fit-in/200x150/filters:strip_icc()/pic6983802.jpg |
| 方舟动物园 | `versions[30].children[1].tag` | image |
| 方舟动物园 | `versions[30].children[1].text` | https://cf.geekdo-images.com/_V7uMu2neMaPs9QZ-Xs6Bw__original/img/24ZCbUpm_JecbvqWi_4EtgroIec=/0x0/filters:format(jpeg)/pic6983802.jpg |
| 方舟动物园 | `versions[30].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[30].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[30].children[3].tag` | link |
| 方舟动物园 | `versions[30].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[30].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[30].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[30].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[30].children[4].tag` | name |
| 方舟动物园 | `versions[30].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[30].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[30].children[4].attributes.value` | Romanian edition |
| 方舟动物园 | `versions[30].children[5].tag` | link |
| 方舟动物园 | `versions[30].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[30].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[30].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[30].children[6].tag` | link |
| 方舟动物园 | `versions[30].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[30].children[6].attributes.id` | 44241 |
| 方舟动物园 | `versions[30].children[6].attributes.value` | Regatul Jocurilor |
| 方舟动物园 | `versions[30].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[30].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[30].children[8].tag` | productcode |
| 方舟动物园 | `versions[30].children[8].attributes.value` |  |
| 方舟动物园 | `versions[30].children[9].tag` | width |
| 方舟动物园 | `versions[30].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[30].children[10].tag` | length |
| 方舟动物园 | `versions[30].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[30].children[11].tag` | depth |
| 方舟动物园 | `versions[30].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[30].children[12].tag` | weight |
| 方舟动物园 | `versions[30].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[30].children[13].tag` | link |
| 方舟动物园 | `versions[30].children[13].attributes.type` | language |
| 方舟动物园 | `versions[30].children[13].attributes.id` | 2201 |
| 方舟动物园 | `versions[30].children[13].attributes.value` | Romanian |
| 方舟动物园 | `versions[31].tag` | item |
| 方舟动物园 | `versions[31].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[31].attributes.id` | 690178 |
| 方舟动物园 | `versions[31].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[31].children[0].text` | https://cf.geekdo-images.com/qpsD9Do6D2H0J2mwOQ2Aaw__small/img/LuPNoppg8eq1WhvEjcBGchpCeq8=/fit-in/200x150/filters:strip_icc()/pic7865942.jpg |
| 方舟动物园 | `versions[31].children[1].tag` | image |
| 方舟动物园 | `versions[31].children[1].text` | https://cf.geekdo-images.com/qpsD9Do6D2H0J2mwOQ2Aaw__original/img/yXTQWKDVBIK10bgSlD9AmcNk1MI=/0x0/filters:format(jpeg)/pic7865942.jpg |
| 方舟动物园 | `versions[31].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[31].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[31].children[3].tag` | link |
| 方舟动物园 | `versions[31].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[31].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[31].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[31].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[31].children[4].tag` | name |
| 方舟动物园 | `versions[31].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[31].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[31].children[4].attributes.value` | Serbian edition |
| 方舟动物园 | `versions[31].children[5].tag` | link |
| 方舟动物园 | `versions[31].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[31].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[31].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[31].children[6].tag` | link |
| 方舟动物园 | `versions[31].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[31].children[6].attributes.id` | 51614 |
| 方舟动物园 | `versions[31].children[6].attributes.value` | MIPL |
| 方舟动物园 | `versions[31].children[7].tag` | link |
| 方舟动物园 | `versions[31].children[7].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[31].children[7].attributes.id` | 138547 |
| 方舟动物园 | `versions[31].children[7].attributes.value` | Steffen Bieker |
| 方舟动物园 | `versions[31].children[8].tag` | link |
| 方舟动物园 | `versions[31].children[8].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[31].children[8].attributes.id` | 11462 |
| 方舟动物园 | `versions[31].children[8].attributes.value` | Loïc Billiau |
| 方舟动物园 | `versions[31].children[9].tag` | link |
| 方舟动物园 | `versions[31].children[9].attributes.type` | boardgameartist |
| 方舟动物园 | `versions[31].children[9].attributes.id` | 12484 |
| 方舟动物园 | `versions[31].children[9].attributes.value` | Dennis Lohausen |
| 方舟动物园 | `versions[31].children[10].tag` | yearpublished |
| 方舟动物园 | `versions[31].children[10].attributes.value` | 2023 |
| 方舟动物园 | `versions[31].children[11].tag` | productcode |
| 方舟动物园 | `versions[31].children[11].attributes.value` |  |
| 方舟动物园 | `versions[31].children[12].tag` | width |
| 方舟动物园 | `versions[31].children[12].attributes.value` | 11.811 |
| 方舟动物园 | `versions[31].children[13].tag` | length |
| 方舟动物园 | `versions[31].children[13].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[31].children[14].tag` | depth |
| 方舟动物园 | `versions[31].children[14].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[31].children[15].tag` | weight |
| 方舟动物园 | `versions[31].children[15].attributes.value` | 0 |
| 方舟动物园 | `versions[31].children[16].tag` | link |
| 方舟动物园 | `versions[31].children[16].attributes.type` | language |
| 方舟动物园 | `versions[31].children[16].attributes.id` | 2681 |
| 方舟动物园 | `versions[31].children[16].attributes.value` | Serbian |
| 方舟动物园 | `versions[32].tag` | item |
| 方舟动物园 | `versions[32].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[32].attributes.id` | 598385 |
| 方舟动物园 | `versions[32].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[32].children[0].text` | https://cf.geekdo-images.com/G4E49iT20jcf8XM8H_fNkA__small/img/JKelMpNqJU1BXXvVUZHQm7gJ-Eg=/fit-in/200x150/filters:strip_icc()/pic6657491.jpg |
| 方舟动物园 | `versions[32].children[1].tag` | image |
| 方舟动物园 | `versions[32].children[1].text` | https://cf.geekdo-images.com/G4E49iT20jcf8XM8H_fNkA__original/img/qc5wUU0mfY8Ukk4TOTHFCKJ9st8=/0x0/filters:format(jpeg)/pic6657491.jpg |
| 方舟动物园 | `versions[32].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[32].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[32].children[3].tag` | link |
| 方舟动物园 | `versions[32].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[32].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[32].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[32].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[32].children[4].tag` | name |
| 方舟动物园 | `versions[32].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[32].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[32].children[4].attributes.value` | Spanish edition, first printing |
| 方舟动物园 | `versions[32].children[5].tag` | link |
| 方舟动物园 | `versions[32].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[32].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[32].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[32].children[6].tag` | link |
| 方舟动物园 | `versions[32].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[32].children[6].attributes.id` | 30677 |
| 方舟动物园 | `versions[32].children[6].attributes.value` | Maldito Games |
| 方舟动物园 | `versions[32].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[32].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[32].children[8].tag` | productcode |
| 方舟动物园 | `versions[32].children[8].attributes.value` |  |
| 方舟动物园 | `versions[32].children[9].tag` | width |
| 方舟动物园 | `versions[32].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[32].children[10].tag` | length |
| 方舟动物园 | `versions[32].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[32].children[11].tag` | depth |
| 方舟动物园 | `versions[32].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[32].children[12].tag` | weight |
| 方舟动物园 | `versions[32].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[32].children[13].tag` | link |
| 方舟动物园 | `versions[32].children[13].attributes.type` | language |
| 方舟动物园 | `versions[32].children[13].attributes.id` | 2203 |
| 方舟动物园 | `versions[32].children[13].attributes.value` | Spanish |
| 方舟动物园 | `versions[33].tag` | item |
| 方舟动物园 | `versions[33].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[33].attributes.id` | 722076 |
| 方舟动物园 | `versions[33].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[33].children[0].text` | https://cf.geekdo-images.com/G4E49iT20jcf8XM8H_fNkA__small/img/JKelMpNqJU1BXXvVUZHQm7gJ-Eg=/fit-in/200x150/filters:strip_icc()/pic6657491.jpg |
| 方舟动物园 | `versions[33].children[1].tag` | image |
| 方舟动物园 | `versions[33].children[1].text` | https://cf.geekdo-images.com/G4E49iT20jcf8XM8H_fNkA__original/img/qc5wUU0mfY8Ukk4TOTHFCKJ9st8=/0x0/filters:format(jpeg)/pic6657491.jpg |
| 方舟动物园 | `versions[33].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[33].children[2].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[33].children[3].tag` | link |
| 方舟动物园 | `versions[33].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[33].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[33].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[33].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[33].children[4].tag` | name |
| 方舟动物园 | `versions[33].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[33].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[33].children[4].attributes.value` | Spanish edition, second printing |
| 方舟动物园 | `versions[33].children[5].tag` | link |
| 方舟动物园 | `versions[33].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[33].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[33].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[33].children[6].tag` | link |
| 方舟动物园 | `versions[33].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[33].children[6].attributes.id` | 30677 |
| 方舟动物园 | `versions[33].children[6].attributes.value` | Maldito Games |
| 方舟动物园 | `versions[33].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[33].children[7].attributes.value` | 2022 |
| 方舟动物园 | `versions[33].children[8].tag` | productcode |
| 方舟动物园 | `versions[33].children[8].attributes.value` |  |
| 方舟动物园 | `versions[33].children[9].tag` | width |
| 方舟动物园 | `versions[33].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[33].children[10].tag` | length |
| 方舟动物园 | `versions[33].children[10].attributes.value` | 14.5669 |
| 方舟动物园 | `versions[33].children[11].tag` | depth |
| 方舟动物园 | `versions[33].children[11].attributes.value` | 2.75591 |
| 方舟动物园 | `versions[33].children[12].tag` | weight |
| 方舟动物园 | `versions[33].children[12].attributes.value` | 5.51156 |
| 方舟动物园 | `versions[33].children[13].tag` | link |
| 方舟动物园 | `versions[33].children[13].attributes.type` | language |
| 方舟动物园 | `versions[33].children[13].attributes.id` | 2203 |
| 方舟动物园 | `versions[33].children[13].attributes.value` | Spanish |
| 方舟动物园 | `versions[34].tag` | item |
| 方舟动物园 | `versions[34].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[34].attributes.id` | 649679 |
| 方舟动物园 | `versions[34].children[0].tag` | canonicalname |
| 方舟动物园 | `versions[34].children[0].attributes.value` | นาวาสรรพสัตว์ |
| 方舟动物园 | `versions[34].children[1].tag` | link |
| 方舟动物园 | `versions[34].children[1].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[34].children[1].attributes.id` | 342942 |
| 方舟动物园 | `versions[34].children[1].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[34].children[1].attributes.inbound` | true |
| 方舟动物园 | `versions[34].children[2].tag` | name |
| 方舟动物园 | `versions[34].children[2].attributes.type` | primary |
| 方舟动物园 | `versions[34].children[2].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[34].children[2].attributes.value` | Thai edition |
| 方舟动物园 | `versions[34].children[3].tag` | link |
| 方舟动物园 | `versions[34].children[3].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[34].children[3].attributes.id` | 21608 |
| 方舟动物园 | `versions[34].children[3].attributes.value` | CMON Global Limited |
| 方舟动物园 | `versions[34].children[4].tag` | link |
| 方舟动物园 | `versions[34].children[4].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[34].children[4].attributes.id` | 22380 |
| 方舟动物园 | `versions[34].children[4].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[34].children[5].tag` | link |
| 方舟动物园 | `versions[34].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[34].children[5].attributes.id` | 39774 |
| 方舟动物园 | `versions[34].children[5].attributes.value` | Tower Tactic Games |
| 方舟动物园 | `versions[34].children[6].tag` | yearpublished |
| 方舟动物园 | `versions[34].children[6].attributes.value` | 2023 |
| 方舟动物园 | `versions[34].children[7].tag` | productcode |
| 方舟动物园 | `versions[34].children[7].attributes.value` |  |
| 方舟动物园 | `versions[34].children[8].tag` | width |
| 方舟动物园 | `versions[34].children[8].attributes.value` | 14.3701 |
| 方舟动物园 | `versions[34].children[9].tag` | length |
| 方舟动物园 | `versions[34].children[9].attributes.value` | 11.811 |
| 方舟动物园 | `versions[34].children[10].tag` | depth |
| 方舟动物园 | `versions[34].children[10].attributes.value` | 2.87402 |
| 方舟动物园 | `versions[34].children[11].tag` | weight |
| 方舟动物园 | `versions[34].children[11].attributes.value` | 5.40133 |
| 方舟动物园 | `versions[34].children[12].tag` | link |
| 方舟动物园 | `versions[34].children[12].attributes.type` | language |
| 方舟动物园 | `versions[34].children[12].attributes.id` | 2709 |
| 方舟动物园 | `versions[34].children[12].attributes.value` | Thai |
| 方舟动物园 | `versions[35].tag` | item |
| 方舟动物园 | `versions[35].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[35].attributes.id` | 654587 |
| 方舟动物园 | `versions[35].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[35].children[0].text` | https://cf.geekdo-images.com/k8F-Cp18G2zj6bTcH-a8IA__small/img/mXAXLH7fVxF4OlX61ZCFyhN7yZ8=/fit-in/200x150/filters:strip_icc()/pic7385009.jpg |
| 方舟动物园 | `versions[35].children[1].tag` | image |
| 方舟动物园 | `versions[35].children[1].text` | https://cf.geekdo-images.com/k8F-Cp18G2zj6bTcH-a8IA__original/img/q885NkA_9p2HmIf-IBX80LWvBH8=/0x0/filters:format(jpeg)/pic7385009.jpg |
| 方舟动物园 | `versions[35].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[35].children[2].attributes.value` | 方舟動物園 |
| 方舟动物园 | `versions[35].children[3].tag` | link |
| 方舟动物园 | `versions[35].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[35].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[35].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[35].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[35].children[4].tag` | name |
| 方舟动物园 | `versions[35].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[35].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[35].children[4].attributes.value` | Traditional Chinese edition |
| 方舟动物园 | `versions[35].children[5].tag` | link |
| 方舟动物园 | `versions[35].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[35].children[5].attributes.id` | 12540 |
| 方舟动物园 | `versions[35].children[5].attributes.value` | Game Harbor |
| 方舟动物园 | `versions[35].children[6].tag` | yearpublished |
| 方舟动物园 | `versions[35].children[6].attributes.value` | 0 |
| 方舟动物园 | `versions[35].children[7].tag` | productcode |
| 方舟动物园 | `versions[35].children[7].attributes.value` |  |
| 方舟动物园 | `versions[35].children[8].tag` | width |
| 方舟动物园 | `versions[35].children[8].attributes.value` | 0 |
| 方舟动物园 | `versions[35].children[9].tag` | length |
| 方舟动物园 | `versions[35].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[35].children[10].tag` | depth |
| 方舟动物园 | `versions[35].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[35].children[11].tag` | weight |
| 方舟动物园 | `versions[35].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[35].children[12].tag` | link |
| 方舟动物园 | `versions[35].children[12].attributes.type` | language |
| 方舟动物园 | `versions[35].children[12].attributes.id` | 2181 |
| 方舟动物园 | `versions[35].children[12].attributes.value` | Chinese |
| 方舟动物园 | `versions[36].tag` | item |
| 方舟动物园 | `versions[36].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[36].attributes.id` | 644052 |
| 方舟动物园 | `versions[36].children[0].tag` | thumbnail |
| 方舟动物园 | `versions[36].children[0].text` | https://cf.geekdo-images.com/e754XPMKebPqFakJgBwqCA__small/img/QoG6H2LWR0JoW41du8CUvNy7emA=/fit-in/200x150/filters:strip_icc()/pic7241448.jpg |
| 方舟动物园 | `versions[36].children[1].tag` | image |
| 方舟动物园 | `versions[36].children[1].text` | https://cf.geekdo-images.com/e754XPMKebPqFakJgBwqCA__original/img/WXPFMsPQKytK3sEnMcJ2MvYGuXE=/0x0/filters:format(jpeg)/pic7241448.jpg |
| 方舟动物园 | `versions[36].children[2].tag` | canonicalname |
| 方舟动物园 | `versions[36].children[2].attributes.value` | Новий ковчег |
| 方舟动物园 | `versions[36].children[3].tag` | link |
| 方舟动物园 | `versions[36].children[3].attributes.type` | boardgameversion |
| 方舟动物园 | `versions[36].children[3].attributes.id` | 342942 |
| 方舟动物园 | `versions[36].children[3].attributes.value` | Ark Nova |
| 方舟动物园 | `versions[36].children[3].attributes.inbound` | true |
| 方舟动物园 | `versions[36].children[4].tag` | name |
| 方舟动物园 | `versions[36].children[4].attributes.type` | primary |
| 方舟动物园 | `versions[36].children[4].attributes.sortindex` | 1 |
| 方舟动物园 | `versions[36].children[4].attributes.value` | Ukrainian edition |
| 方舟动物园 | `versions[36].children[5].tag` | link |
| 方舟动物园 | `versions[36].children[5].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[36].children[5].attributes.id` | 22380 |
| 方舟动物园 | `versions[36].children[5].attributes.value` | Feuerland Spiele |
| 方舟动物园 | `versions[36].children[6].tag` | link |
| 方舟动物园 | `versions[36].children[6].attributes.type` | boardgamepublisher |
| 方舟动物园 | `versions[36].children[6].attributes.id` | 17179 |
| 方舟动物园 | `versions[36].children[6].attributes.value` | IGAMES |
| 方舟动物园 | `versions[36].children[7].tag` | yearpublished |
| 方舟动物园 | `versions[36].children[7].attributes.value` | 2023 |
| 方舟动物园 | `versions[36].children[8].tag` | productcode |
| 方舟动物园 | `versions[36].children[8].attributes.value` |  |
| 方舟动物园 | `versions[36].children[9].tag` | width |
| 方舟动物园 | `versions[36].children[9].attributes.value` | 0 |
| 方舟动物园 | `versions[36].children[10].tag` | length |
| 方舟动物园 | `versions[36].children[10].attributes.value` | 0 |
| 方舟动物园 | `versions[36].children[11].tag` | depth |
| 方舟动物园 | `versions[36].children[11].attributes.value` | 0 |
| 方舟动物园 | `versions[36].children[12].tag` | weight |
| 方舟动物园 | `versions[36].children[12].attributes.value` | 0 |
| 方舟动物园 | `versions[36].children[13].tag` | link |
| 方舟动物园 | `versions[36].children[13].attributes.type` | language |
| 方舟动物园 | `versions[36].children[13].attributes.id` | 2665 |
| 方舟动物园 | `versions[36].children[13].attributes.value` | Ukrainian |
| 方舟动物园 | `videos_count` | 15 |
| 方舟动物园 | `videos[0].id` | 626341 |
| 方舟动物园 | `videos[0].title` | Ark Nova Unboxing by MyBoardGames.net |
| 方舟动物园 | `videos[0].category` | unboxing |
| 方舟动物园 | `videos[0].language` | English |
| 方舟动物园 | `videos[0].link` | http://www.youtube.com/watch?v=R3wxb_76BHU |
| 方舟动物园 | `videos[0].username` | My_BoardGames |
| 方舟动物园 | `videos[0].userid` | 4345861 |
| 方舟动物园 | `videos[0].postdate` | 2026-08-21T22:27:55-05:00 |
| 方舟动物园 | `videos[1].id` | 626314 |
| 方舟动物园 | `videos[1].title` | Ark Nova - symulator ZOO &#124; Recenzja gry planszowej |
| 方舟动物园 | `videos[1].category` | review |
| 方舟动物园 | `videos[1].language` | Polish |
| 方舟动物园 | `videos[1].link` | http://www.youtube.com/watch?v=t9ciKj2nlEE |
| 方舟动物园 | `videos[1].username` | chmod700 |
| 方舟动物园 | `videos[1].userid` | 1837323 |
| 方舟动物园 | `videos[1].postdate` | 2026-08-21T17:47:42-05:00 |
| 方舟动物园 | `videos[2].id` | 626083 |
| 方舟动物园 | `videos[2].title` | Conociendo ARK NOVA. Cómo jugar y partida a 2 |
| 方舟动物园 | `videos[2].category` | session |
| 方舟动物园 | `videos[2].language` | Spanish |
| 方舟动物园 | `videos[2].link` | http://www.youtube.com/watch?v=89UkJkFSEpw |
| 方舟动物园 | `videos[2].username` | santosresena |
| 方舟动物园 | `videos[2].userid` | 3542758 |
| 方舟动物园 | `videos[2].postdate` | 2026-08-20T12:28:04-05:00 |
| 方舟动物园 | `videos[3].id` | 624748 |
| 方舟动物园 | `videos[3].title` | Ark Nova Unboxing - What's Inside the Award Winning Zoo Building Game? |
| 方舟动物园 | `videos[3].category` | unboxing |
| 方舟动物园 | `videos[3].language` | English |
| 方舟动物园 | `videos[3].link` | http://www.youtube.com/watch?v=Vg5ZErNS-_Y |
| 方舟动物园 | `videos[3].username` | SkytigerGaming |
| 方舟动物园 | `videos[3].userid` | 4286431 |
| 方舟动物园 | `videos[3].postdate` | 2026-08-11T11:08:34-05:00 |
| 方舟动物园 | `videos[4].id` | 624263 |
| 方舟动物园 | `videos[4].title` | Ark Nova |
| 方舟动物园 | `videos[4].category` | review |
| 方舟动物园 | `videos[4].language` | English |
| 方舟动物园 | `videos[4].link` | http://www.youtube.com/watch?v=tT-FOPOY1zQ |
| 方舟动物园 | `videos[4].username` | Melaniebarr |
| 方舟动物园 | `videos[4].userid` | 1626931 |
| 方舟动物园 | `videos[4].postdate` | 2026-08-07T13:02:09-05:00 |
| 方舟动物园 | `videos[5].id` | 617984 |
| 方舟动物园 | `videos[5].title` | Ark Nova Soundtrack |
| 方舟动物园 | `videos[5].category` | other |
| 方舟动物园 | `videos[5].language` | English |
| 方舟动物园 | `videos[5].link` | http://www.youtube.com/watch?v=r4j5AQZnPMU |
| 方舟动物园 | `videos[5].username` | max984 |
| 方舟动物园 | `videos[5].userid` | 1069647 |
| 方舟动物园 | `videos[5].postdate` | 2026-06-28T16:17:25-05:00 |
| 方舟动物园 | `videos[6].id` | 616519 |
| 方舟动物园 | `videos[6].title` | Ark Nova настольная игра |
| 方舟动物园 | `videos[6].category` | session |
| 方舟动物园 | `videos[6].language` | Russian |
| 方舟动物园 | `videos[6].link` | http://www.youtube.com/watch?v=Eb4DpjfQH58 |
| 方舟动物园 | `videos[6].username` | AlexArchanfel |
| 方舟动物园 | `videos[6].userid` | 3396602 |
| 方舟动物园 | `videos[6].postdate` | 2026-06-17T15:12:10-05:00 |
| 方舟动物园 | `videos[7].id` | 612365 |
| 方舟动物园 | `videos[7].title` | A quick view of Ark Nova |
| 方舟动物园 | `videos[7].category` | review |
| 方舟动物园 | `videos[7].language` | English |
| 方舟动物园 | `videos[7].link` | http://www.youtube.com/watch?v=-Fs1jrKCyv0 |
| 方舟动物园 | `videos[7].username` | fanlandria |
| 方舟动物园 | `videos[7].userid` | 3703221 |
| 方舟动物园 | `videos[7].postdate` | 2026-05-19T06:48:41-05:00 |
| 方舟动物园 | `videos[8].id` | 612101 |
| 方舟动物园 | `videos[8].title` | Unboxing a fave |
| 方舟动物园 | `videos[8].category` | unboxing |
| 方舟动物园 | `videos[8].language` | English |
| 方舟动物园 | `videos[8].link` | http://www.youtube.com/watch?v=1aKZQgEHn7w |
| 方舟动物园 | `videos[8].username` | DuffmanGaming |
| 方舟动物园 | `videos[8].userid` | 2135717 |
| 方舟动物园 | `videos[8].postdate` | 2026-05-17T09:41:56-05:00 |
| 方舟动物园 | `videos[9].id` | 608753 |
| 方舟动物园 | `videos[9].title` | 5 Almost Perfect Board Games |
| 方舟动物园 | `videos[9].category` | other |
| 方舟动物园 | `videos[9].language` | English |
| 方舟动物园 | `videos[9].link` | http://www.youtube.com/watch?v=d5QcmK5om6U |
| 方舟动物园 | `videos[9].username` | GamingCaravan |
| 方舟动物园 | `videos[9].userid` | 3426893 |
| 方舟动物园 | `videos[9].postdate` | 2026-04-22T23:17:52-05:00 |
| 方舟动物园 | `videos[10].id` | 606492 |
| 方舟动物园 | `videos[10].title` | Ark Nova: Regras CANTADAS em 3min  |
| 方舟动物园 | `videos[10].category` | humor |
| 方舟动物园 | `videos[10].language` | Portuguese |
| 方舟动物园 | `videos[10].link` | http://www.youtube.com/watch?v=8y9qKzYZpgg |
| 方舟动物园 | `videos[10].username` | DanielNobrega |
| 方舟动物园 | `videos[10].userid` | 529747 |
| 方舟动物园 | `videos[10].postdate` | 2026-04-09T09:30:04-05:00 |
| 方舟动物园 | `videos[11].id` | 605938 |
| 方舟动物园 | `videos[11].title` | Everyone gets board game new releases of 2026?. 'Arnold Schwarzenegger' board game parody |
| 方舟动物园 | `videos[11].category` | humor |
| 方舟动物园 | `videos[11].language` | English |
| 方舟动物园 | `videos[11].link` | http://www.youtube.com/watch?v=gVhzg_DO_hw |
| 方舟动物园 | `videos[11].username` | JetSkiPopper |
| 方舟动物园 | `videos[11].userid` | 1310667 |
| 方舟动物园 | `videos[11].postdate` | 2026-04-06T08:01:50-05:00 |
| 方舟动物园 | `videos[12].id` | 602721 |
| 方舟动物园 | `videos[12].title` | What's in the Box? - Ark Nova |
| 方舟动物园 | `videos[12].category` | unboxing |
| 方舟动物园 | `videos[12].language` | English |
| 方舟动物园 | `videos[12].link` | http://www.youtube.com/watch?v=2cvu-N9b5Mc |
| 方舟动物园 | `videos[12].username` | GeeksPlusTabletop |
| 方舟动物园 | `videos[12].userid` | 3924629 |
| 方舟动物园 | `videos[12].postdate` | 2026-03-16T10:23:27-05:00 |
| 方舟动物园 | `videos[13].id` | 602612 |
| 方舟动物园 | `videos[13].title` | Règles complètes en 10 minutes! |
| 方舟动物园 | `videos[13].category` | instructional |
| 方舟动物园 | `videos[13].language` | French |
| 方舟动物园 | `videos[13].link` | http://www.youtube.com/watch?v=qoPXgYr2ZLk |
| 方舟动物园 | `videos[13].username` | NoiramB |
| 方舟动物园 | `videos[13].userid` | 2801510 |
| 方舟动物园 | `videos[13].postdate` | 2026-03-15T13:03:09-05:00 |
| 方舟动物园 | `videos[14].id` | 602271 |
| 方舟动物园 | `videos[14].title` | #ArkNova players, get ready to defend yourself ? |
| 方舟动物园 | `videos[14].category` | humor |
| 方舟动物园 | `videos[14].language` | English |
| 方舟动物园 | `videos[14].link` | http://www.youtube.com/watch?v=QTAex3OLEq0 |
| 方舟动物园 | `videos[14].username` | JetSkiPopper |
| 方舟动物园 | `videos[14].userid` | 1310667 |
| 方舟动物园 | `videos[14].postdate` | 2026-03-13T07:01:03-05:00 |
| 幽港迷城 | `bgg_rank_at_capture` | 4 |
| 幽港迷城 | `bgg_id` | 174430 |
| 幽港迷城 | `type` | boardgame |
| 幽港迷城 | `bgg_url` | https://boardgamegeek.com/boardgame/174430 |
| 幽港迷城 | `names.primary` | Gloomhaven |
| 幽港迷城 | `names.alternate[0]` | Gloomhaven: Aventures à Havrenuit |
| 幽港迷城 | `names.alternate[1]` | Gloomhaven: Мрачная Гавань |
| 幽港迷城 | `names.alternate[2]` | Homályrév |
| 幽港迷城 | `names.alternate[3]` | グルームヘイヴン |
| 幽港迷城 | `names.alternate[4]` | 幽港迷城 |
| 幽港迷城 | `names.alternate[5]` | 글룸헤이븐 |
| 幽港迷城 | `names.all[0].type` | primary |
| 幽港迷城 | `names.all[0].sortindex` | 1 |
| 幽港迷城 | `names.all[0].value` | Gloomhaven |
| 幽港迷城 | `names.all[1].type` | alternate |
| 幽港迷城 | `names.all[1].sortindex` | 1 |
| 幽港迷城 | `names.all[1].value` | Gloomhaven: Aventures à Havrenuit |
| 幽港迷城 | `names.all[2].type` | alternate |
| 幽港迷城 | `names.all[2].sortindex` | 1 |
| 幽港迷城 | `names.all[2].value` | Gloomhaven: Мрачная Гавань |
| 幽港迷城 | `names.all[3].type` | alternate |
| 幽港迷城 | `names.all[3].sortindex` | 1 |
| 幽港迷城 | `names.all[3].value` | Homályrév |
| 幽港迷城 | `names.all[4].type` | alternate |
| 幽港迷城 | `names.all[4].sortindex` | 1 |
| 幽港迷城 | `names.all[4].value` | グルームヘイヴン |
| 幽港迷城 | `names.all[5].type` | alternate |
| 幽港迷城 | `names.all[5].sortindex` | 1 |
| 幽港迷城 | `names.all[5].value` | 幽港迷城 |
| 幽港迷城 | `names.all[6].type` | alternate |
| 幽港迷城 | `names.all[6].sortindex` | 1 |
| 幽港迷城 | `names.all[6].value` | 글룸헤이븐 |
| 幽港迷城 | `description` | Gloomhaven  is a game of Euro-inspired tactical combat in a persistent world of shifting motives. Players will take on the roles of wandering adventurers with their own special sets of skills and their own reasons for traveling to this dark corner of the world. Players must work together out of necessity to clear out menacing dungeons and forgotten ruins. In the process, they will enhance their abilities with experience and loot, discover new locations to explore and plunder, and expand an ever-branching story fueled by the decisions they make.<br> This is a game with a persistent and changing world that is ideally played over many game sessions. After a scenario, players will make decisions about what to do next, which will determine how the story continues, kind of like a “Choose Your Own Adventure” book. Playing through a scenario is a co-operative affair where players will fight against automated monsters using an innovative card system to determine the order of play and what a player does on their turn.<br><br>Each turn, a player chooses two cards to play out of their hand. The number on the top card determines their initiative for the round. Each card also has a top and bottom power, and when it is a player’s turn in the initiative order, they determine whether to use the top power of one card and the bottom power of the other, or vice-versa. Players must be careful, though, because over time they will permanently lose cards from their hands. If they take too long to clear a dungeon, they may end u exhausted and be forced to retreat.<br><br> |
| 幽港迷城 | `year_published` | 2017 |
| 幽港迷城 | `players.min` | 1 |
| 幽港迷城 | `players.max` | 4 |
| 幽港迷城 | `playing_time_minutes.nominal` | 120 |
| 幽港迷城 | `playing_time_minutes.min` | 60 |
| 幽港迷城 | `playing_time_minutes.max` | 120 |
| 幽港迷城 | `minimum_age` | 14 |
| 幽港迷城 | `images.image_url` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `images.thumbnail_url` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `images.local_cover` | covers/04-174430.jpg |
| 幽港迷城 | `polls[0].name` | suggested_numplayers |
| 幽港迷城 | `polls[0].title` | User Suggested Number of Players |
| 幽港迷城 | `polls[0].total_votes` | 1647 |
| 幽港迷城 | `polls[0].results[0].attributes.numplayers` | 1 |
| 幽港迷城 | `polls[0].results[0].options[0].value` | Best |
| 幽港迷城 | `polls[0].results[0].options[0].numvotes` | 156 |
| 幽港迷城 | `polls[0].results[0].options[1].value` | Recommended |
| 幽港迷城 | `polls[0].results[0].options[1].numvotes` | 715 |
| 幽港迷城 | `polls[0].results[0].options[2].value` | Not Recommended |
| 幽港迷城 | `polls[0].results[0].options[2].numvotes` | 396 |
| 幽港迷城 | `polls[0].results[1].attributes.numplayers` | 2 |
| 幽港迷城 | `polls[0].results[1].options[0].value` | Best |
| 幽港迷城 | `polls[0].results[1].options[0].numvotes` | 415 |
| 幽港迷城 | `polls[0].results[1].options[1].value` | Recommended |
| 幽港迷城 | `polls[0].results[1].options[1].numvotes` | 901 |
| 幽港迷城 | `polls[0].results[1].options[2].value` | Not Recommended |
| 幽港迷城 | `polls[0].results[1].options[2].numvotes` | 96 |
| 幽港迷城 | `polls[0].results[2].attributes.numplayers` | 3 |
| 幽港迷城 | `polls[0].results[2].options[0].value` | Best |
| 幽港迷城 | `polls[0].results[2].options[0].numvotes` | 817 |
| 幽港迷城 | `polls[0].results[2].options[1].value` | Recommended |
| 幽港迷城 | `polls[0].results[2].options[1].numvotes` | 545 |
| 幽港迷城 | `polls[0].results[2].options[2].value` | Not Recommended |
| 幽港迷城 | `polls[0].results[2].options[2].numvotes` | 41 |
| 幽港迷城 | `polls[0].results[3].attributes.numplayers` | 4 |
| 幽港迷城 | `polls[0].results[3].options[0].value` | Best |
| 幽港迷城 | `polls[0].results[3].options[0].numvotes` | 502 |
| 幽港迷城 | `polls[0].results[3].options[1].value` | Recommended |
| 幽港迷城 | `polls[0].results[3].options[1].numvotes` | 666 |
| 幽港迷城 | `polls[0].results[3].options[2].value` | Not Recommended |
| 幽港迷城 | `polls[0].results[3].options[2].numvotes` | 177 |
| 幽港迷城 | `polls[0].results[4].attributes.numplayers` | 4+ |
| 幽港迷城 | `polls[0].results[4].options[0].value` | Best |
| 幽港迷城 | `polls[0].results[4].options[0].numvotes` | 6 |
| 幽港迷城 | `polls[0].results[4].options[1].value` | Recommended |
| 幽港迷城 | `polls[0].results[4].options[1].numvotes` | 55 |
| 幽港迷城 | `polls[0].results[4].options[2].value` | Not Recommended |
| 幽港迷城 | `polls[0].results[4].options[2].numvotes` | 939 |
| 幽港迷城 | `polls[1].name` | suggested_playerage |
| 幽港迷城 | `polls[1].title` | User Suggested Player Age |
| 幽港迷城 | `polls[1].total_votes` | 338 |
| 幽港迷城 | `polls[1].results[0].attributes` | {} |
| 幽港迷城 | `polls[1].results[0].options[0].value` | 2 |
| 幽港迷城 | `polls[1].results[0].options[0].numvotes` | 5 |
| 幽港迷城 | `polls[1].results[0].options[1].value` | 3 |
| 幽港迷城 | `polls[1].results[0].options[1].numvotes` | 0 |
| 幽港迷城 | `polls[1].results[0].options[2].value` | 4 |
| 幽港迷城 | `polls[1].results[0].options[2].numvotes` | 0 |
| 幽港迷城 | `polls[1].results[0].options[3].value` | 5 |
| 幽港迷城 | `polls[1].results[0].options[3].numvotes` | 0 |
| 幽港迷城 | `polls[1].results[0].options[4].value` | 6 |
| 幽港迷城 | `polls[1].results[0].options[4].numvotes` | 0 |
| 幽港迷城 | `polls[1].results[0].options[5].value` | 8 |
| 幽港迷城 | `polls[1].results[0].options[5].numvotes` | 7 |
| 幽港迷城 | `polls[1].results[0].options[6].value` | 10 |
| 幽港迷城 | `polls[1].results[0].options[6].numvotes` | 45 |
| 幽港迷城 | `polls[1].results[0].options[7].value` | 12 |
| 幽港迷城 | `polls[1].results[0].options[7].numvotes` | 95 |
| 幽港迷城 | `polls[1].results[0].options[8].value` | 14 |
| 幽港迷城 | `polls[1].results[0].options[8].numvotes` | 156 |
| 幽港迷城 | `polls[1].results[0].options[9].value` | 16 |
| 幽港迷城 | `polls[1].results[0].options[9].numvotes` | 23 |
| 幽港迷城 | `polls[1].results[0].options[10].value` | 18 |
| 幽港迷城 | `polls[1].results[0].options[10].numvotes` | 3 |
| 幽港迷城 | `polls[1].results[0].options[11].value` | 21 and up |
| 幽港迷城 | `polls[1].results[0].options[11].numvotes` | 4 |
| 幽港迷城 | `polls[2].name` | language_dependence |
| 幽港迷城 | `polls[2].title` | Language Dependence |
| 幽港迷城 | `polls[2].total_votes` | 72 |
| 幽港迷城 | `polls[2].results[0].attributes` | {} |
| 幽港迷城 | `polls[2].results[0].options[0].level` | 1 |
| 幽港迷城 | `polls[2].results[0].options[0].value` | No necessary in-game text |
| 幽港迷城 | `polls[2].results[0].options[0].numvotes` | 1 |
| 幽港迷城 | `polls[2].results[0].options[1].level` | 2 |
| 幽港迷城 | `polls[2].results[0].options[1].value` | Some necessary text - easily memorized or small crib sheet |
| 幽港迷城 | `polls[2].results[0].options[1].numvotes` | 0 |
| 幽港迷城 | `polls[2].results[0].options[2].level` | 3 |
| 幽港迷城 | `polls[2].results[0].options[2].value` | Moderate in-game text - needs crib sheet or paste ups |
| 幽港迷城 | `polls[2].results[0].options[2].numvotes` | 2 |
| 幽港迷城 | `polls[2].results[0].options[3].level` | 4 |
| 幽港迷城 | `polls[2].results[0].options[3].value` | Extensive use of text - massive conversion needed to be playable |
| 幽港迷城 | `polls[2].results[0].options[3].numvotes` | 48 |
| 幽港迷城 | `polls[2].results[0].options[4].level` | 5 |
| 幽港迷城 | `polls[2].results[0].options[4].value` | Unplayable in another language |
| 幽港迷城 | `polls[2].results[0].options[4].numvotes` | 21 |
| 幽港迷城 | `links.boardgamecategory[0].id` | 1022 |
| 幽港迷城 | `links.boardgamecategory[0].name` | Adventure |
| 幽港迷城 | `links.boardgamecategory[0].inbound` | null |
| 幽港迷城 | `links.boardgamecategory[1].id` | 1020 |
| 幽港迷城 | `links.boardgamecategory[1].name` | Exploration |
| 幽港迷城 | `links.boardgamecategory[1].inbound` | null |
| 幽港迷城 | `links.boardgamecategory[2].id` | 1010 |
| 幽港迷城 | `links.boardgamecategory[2].name` | Fantasy |
| 幽港迷城 | `links.boardgamecategory[2].inbound` | null |
| 幽港迷城 | `links.boardgamecategory[3].id` | 1046 |
| 幽港迷城 | `links.boardgamecategory[3].name` | Fighting |
| 幽港迷城 | `links.boardgamecategory[3].inbound` | null |
| 幽港迷城 | `links.boardgamecategory[4].id` | 1047 |
| 幽港迷城 | `links.boardgamecategory[4].name` | Miniatures |
| 幽港迷城 | `links.boardgamecategory[4].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[0].id` | 2689 |
| 幽港迷城 | `links.boardgamemechanic[0].name` | Action Queue |
| 幽港迷城 | `links.boardgamemechanic[0].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[1].id` | 2839 |
| 幽港迷城 | `links.boardgamemechanic[1].name` | Action Retrieval |
| 幽港迷城 | `links.boardgamemechanic[1].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[2].id` | 2018 |
| 幽港迷城 | `links.boardgamemechanic[2].name` | Campaign / Battle Card Driven |
| 幽港迷城 | `links.boardgamemechanic[2].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[3].id` | 2857 |
| 幽港迷城 | `links.boardgamemechanic[3].name` | Card Play Conflict Resolution |
| 幽港迷城 | `links.boardgamemechanic[3].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[4].id` | 2893 |
| 幽港迷城 | `links.boardgamemechanic[4].name` | Communication Limits |
| 幽港迷城 | `links.boardgamemechanic[4].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[5].id` | 2023 |
| 幽港迷城 | `links.boardgamemechanic[5].name` | Cooperative Game |
| 幽港迷城 | `links.boardgamemechanic[5].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[6].id` | 2854 |
| 幽港迷城 | `links.boardgamemechanic[6].name` | Critical Hits and Failures |
| 幽港迷城 | `links.boardgamemechanic[6].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[7].id` | 3004 |
| 幽港迷城 | `links.boardgamemechanic[7].name` | Deck Construction |
| 幽港迷城 | `links.boardgamemechanic[7].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[8].id` | 2676 |
| 幽港迷城 | `links.boardgamemechanic[8].name` | Grid Movement |
| 幽港迷城 | `links.boardgamemechanic[8].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[9].id` | 2040 |
| 幽港迷城 | `links.boardgamemechanic[9].name` | Hand Management |
| 幽港迷城 | `links.boardgamemechanic[9].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[10].id` | 2026 |
| 幽港迷城 | `links.boardgamemechanic[10].name` | Hexagon Grid |
| 幽港迷城 | `links.boardgamemechanic[10].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[11].id` | 2824 |
| 幽港迷城 | `links.boardgamemechanic[11].name` | Legacy Game |
| 幽港迷城 | `links.boardgamemechanic[11].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[12].id` | 2975 |
| 幽港迷城 | `links.boardgamemechanic[12].name` | Line of Sight |
| 幽港迷城 | `links.boardgamemechanic[12].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[13].id` | 2011 |
| 幽港迷城 | `links.boardgamemechanic[13].name` | Modular Board |
| 幽港迷城 | `links.boardgamemechanic[13].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[14].id` | 2947 |
| 幽港迷城 | `links.boardgamemechanic[14].name` | Movement Points |
| 幽港迷城 | `links.boardgamemechanic[14].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[15].id` | 3099 |
| 幽港迷城 | `links.boardgamemechanic[15].name` | Multi-Use Cards |
| 幽港迷城 | `links.boardgamemechanic[15].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[16].id` | 2965 |
| 幽港迷城 | `links.boardgamemechanic[16].name` | Multiple Maps |
| 幽港迷城 | `links.boardgamemechanic[16].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[17].id` | 2851 |
| 幽港迷城 | `links.boardgamemechanic[17].name` | Narrative Choice / Paragraph |
| 幽港迷城 | `links.boardgamemechanic[17].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[18].id` | 2846 |
| 幽港迷城 | `links.boardgamemechanic[18].name` | Once-Per-Game Abilities |
| 幽港迷城 | `links.boardgamemechanic[18].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[19].id` | 2685 |
| 幽港迷城 | `links.boardgamemechanic[19].name` | Player Elimination |
| 幽港迷城 | `links.boardgamemechanic[19].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[20].id` | 2028 |
| 幽港迷城 | `links.boardgamemechanic[20].name` | Role Playing |
| 幽港迷城 | `links.boardgamemechanic[20].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[21].id` | 2822 |
| 幽港迷城 | `links.boardgamemechanic[21].name` | Scenario / Mission / Campaign Game |
| 幽港迷城 | `links.boardgamemechanic[21].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[22].id` | 2020 |
| 幽港迷城 | `links.boardgamemechanic[22].name` | Simultaneous Action Selection |
| 幽港迷城 | `links.boardgamemechanic[22].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[23].id` | 2819 |
| 幽港迷城 | `links.boardgamemechanic[23].name` | Solo / Solitaire Game |
| 幽港迷城 | `links.boardgamemechanic[23].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[24].id` | 2027 |
| 幽港迷城 | `links.boardgamemechanic[24].name` | Storytelling |
| 幽港迷城 | `links.boardgamemechanic[24].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[25].id` | 3100 |
| 幽港迷城 | `links.boardgamemechanic[25].name` | Tags |
| 幽港迷城 | `links.boardgamemechanic[25].inbound` | null |
| 幽港迷城 | `links.boardgamemechanic[26].id` | 2015 |
| 幽港迷城 | `links.boardgamemechanic[26].name` | Variable Player Powers |
| 幽港迷城 | `links.boardgamemechanic[26].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[0].id` | 59218 |
| 幽港迷城 | `links.boardgamefamily[0].name` | Category: Dungeon Crawler |
| 幽港迷城 | `links.boardgamefamily[0].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[1].id` | 75241 |
| 幽港迷城 | `links.boardgamefamily[1].name` | Components: Forteller Audio Narration |
| 幽港迷城 | `links.boardgamefamily[1].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[2].id` | 67953 |
| 幽港迷城 | `links.boardgamefamily[2].name` | Components: Map (City Scale) |
| 幽港迷城 | `links.boardgamefamily[2].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[3].id` | 25158 |
| 幽港迷城 | `links.boardgamefamily[3].name` | Components: Miniatures |
| 幽港迷城 | `links.boardgamefamily[3].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[4].id` | 65191 |
| 幽港迷城 | `links.boardgamefamily[4].name` | Components: Multi-Use Cards |
| 幽港迷城 | `links.boardgamefamily[4].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[5].id` | 66335 |
| 幽港迷城 | `links.boardgamefamily[5].name` | Components: Standees |
| 幽港迷城 | `links.boardgamefamily[5].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[6].id` | 68438 |
| 幽港迷城 | `links.boardgamefamily[6].name` | Creatures: Demons |
| 幽港迷城 | `links.boardgamefamily[6].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[7].id` | 7005 |
| 幽港迷城 | `links.boardgamefamily[7].name` | Creatures: Dragons |
| 幽港迷城 | `links.boardgamefamily[7].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[8].id` | 5615 |
| 幽港迷城 | `links.boardgamefamily[8].name` | Creatures: Monsters |
| 幽港迷城 | `links.boardgamefamily[8].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[9].id` | 8374 |
| 幽港迷城 | `links.boardgamefamily[9].name` | Crowdfunding: Kickstarter |
| 幽港迷城 | `links.boardgamefamily[9].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[10].id` | 77349 |
| 幽港迷城 | `links.boardgamefamily[10].name` | Digital Implementations: Steam |
| 幽港迷城 | `links.boardgamefamily[10].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[11].id` | 73596 |
| 幽港迷城 | `links.boardgamefamily[11].name` | Digital Implementations: TableTop Simulator Mod (TTS) |
| 幽港迷城 | `links.boardgamefamily[11].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[12].id` | 45610 |
| 幽港迷城 | `links.boardgamefamily[12].name` | Game: Gloomhaven |
| 幽港迷城 | `links.boardgamefamily[12].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[13].id` | 24281 |
| 幽港迷城 | `links.boardgamefamily[13].name` | Mechanism: Campaign Games |
| 幽港迷城 | `links.boardgamefamily[13].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[14].id` | 25404 |
| 幽港迷城 | `links.boardgamefamily[14].name` | Mechanism: Legacy |
| 幽港迷城 | `links.boardgamefamily[14].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[15].id` | 78680 |
| 幽港迷城 | `links.boardgamefamily[15].name` | Misc: Made by Panda |
| 幽港迷城 | `links.boardgamefamily[15].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[16].id` | 113768 |
| 幽港迷城 | `links.boardgamefamily[16].name` | Players: Games with expansions that change player count |
| 幽港迷城 | `links.boardgamefamily[16].inbound` | null |
| 幽港迷城 | `links.boardgamefamily[17].id` | 5666 |
| 幽港迷城 | `links.boardgamefamily[17].name` | Players: Games with Solitaire Rules |
| 幽港迷城 | `links.boardgamefamily[17].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[0].id` | 365186 |
| 幽港迷城 | `links.boardgameexpansion[0].name` | The Crimson Scales |
| 幽港迷城 | `links.boardgameexpansion[0].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[1].id` | 367749 |
| 幽港迷城 | `links.boardgameexpansion[1].name` | The Crimson Scales: Class Pack Add-on |
| 幽港迷城 | `links.boardgameexpansion[1].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[2].id` | 367751 |
| 幽港迷城 | `links.boardgameexpansion[2].name` | The Crimson Scales: Trail of Ashes |
| 幽港迷城 | `links.boardgameexpansion[2].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[3].id` | 451931 |
| 幽港迷城 | `links.boardgameexpansion[3].name` | Gloomhaven: 2025 ConQuests |
| 幽港迷城 | `links.boardgameexpansion[3].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[4].id` | 312632 |
| 幽港迷城 | `links.boardgameexpansion[4].name` | Gloomhaven: Assault on the Morning Star (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[4].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[5].id` | 310777 |
| 幽港迷城 | `links.boardgameexpansion[5].name` | Gloomhaven: Beyond the End of the World (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[5].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[6].id` | 380753 |
| 幽港迷城 | `links.boardgameexpansion[6].name` | Gloomhaven: Envelope X Reward |
| 幽港迷城 | `links.boardgameexpansion[6].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[7].id` | 250337 |
| 幽港迷城 | `links.boardgameexpansion[7].name` | Gloomhaven: Forgotten Circles |
| 幽港迷城 | `links.boardgameexpansion[7].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[8].id` | 312635 |
| 幽港迷城 | `links.boardgameexpansion[8].name` | Gloomhaven: Memories of Gloomhaven (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[8].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[9].id` | 236232 |
| 幽港迷城 | `links.boardgameexpansion[9].name` | Gloomhaven: Removable Sticker Set |
| 幽港迷城 | `links.boardgameexpansion[9].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[10].id` | 298195 |
| 幽港迷城 | `links.boardgameexpansion[10].name` | Gloomhaven: Return of the Lost Cabal (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[10].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[11].id` | 297586 |
| 幽港迷城 | `links.boardgameexpansion[11].name` | Gloomhaven: Secrets of the Lost Cabal (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[11].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[12].id` | 226868 |
| 幽港迷城 | `links.boardgameexpansion[12].name` | Gloomhaven: Solo Scenarios |
| 幽港迷城 | `links.boardgameexpansion[12].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[13].id` | 310773 |
| 幽港迷城 | `links.boardgameexpansion[13].name` | Gloomhaven: The Catacombs of Chaos (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[13].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[14].id` | 231934 |
| 幽港迷城 | `links.boardgameexpansion[14].name` | Gloomhaven: The End of the World (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[14].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[15].id` | 300402 |
| 幽港迷城 | `links.boardgameexpansion[15].name` | Gloomhaven: The Lucky Meeple (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[15].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[16].id` | 310754 |
| 幽港迷城 | `links.boardgameexpansion[16].name` | Gloomhaven: The Tower of Misfortune (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[16].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[17].id` | 312638 |
| 幽港迷城 | `links.boardgameexpansion[17].name` | Gloomhaven: Twilight of the Lost Cabal (Promo Scenario) |
| 幽港迷城 | `links.boardgameexpansion[17].inbound` | null |
| 幽港迷城 | `links.boardgameexpansion[18].id` | 455986 |
| 幽港迷城 | `links.boardgameexpansion[18].name` | Gloomhaven: Warriors from Lands Beyond |
| 幽港迷城 | `links.boardgameexpansion[18].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[0].id` | 334735 |
| 幽港迷城 | `links.boardgameaccessory[0].name` | Gloomhaven: reDrewno Insert |
| 幽港迷城 | `links.boardgameaccessory[0].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[1].id` | 418048 |
| 幽港迷城 | `links.boardgameaccessory[1].name` | Frosthaven/Gloomhaven: Laserox Vitality Dial Set |
| 幽港迷城 | `links.boardgameaccessory[1].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[2].id` | 452936 |
| 幽港迷城 | `links.boardgameaccessory[2].name` | Gloomhaven (Second Edition): Class Upgrade Pack |
| 幽港迷城 | `links.boardgameaccessory[2].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[3].id` | 289347 |
| 幽港迷城 | `links.boardgameaccessory[3].name` | Gloomhaven: Adventure Tokens – Altar |
| 幽港迷城 | `links.boardgameaccessory[3].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[4].id` | 306515 |
| 幽港迷城 | `links.boardgameaccessory[4].name` | Gloomhaven: Adventure Tokens – Barrel |
| 幽港迷城 | `links.boardgameaccessory[4].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[5].id` | 289346 |
| 幽港迷城 | `links.boardgameaccessory[5].name` | Gloomhaven: Adventure Tokens – Bear Trap |
| 幽港迷城 | `links.boardgameaccessory[5].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[6].id` | 289348 |
| 幽港迷城 | `links.boardgameaccessory[6].name` | Gloomhaven: Adventure Tokens – Bookcase |
| 幽港迷城 | `links.boardgameaccessory[6].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[7].id` | 289343 |
| 幽港迷城 | `links.boardgameaccessory[7].name` | Gloomhaven: Adventure Tokens – Boulder |
| 幽港迷城 | `links.boardgameaccessory[7].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[8].id` | 306373 |
| 幽港迷城 | `links.boardgameaccessory[8].name` | Gloomhaven: Adventure Tokens – Bush |
| 幽港迷城 | `links.boardgameaccessory[8].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[9].id` | 288415 |
| 幽港迷城 | `links.boardgameaccessory[9].name` | Gloomhaven: Adventure Tokens – Cabinet |
| 幽港迷城 | `links.boardgameaccessory[9].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[10].id` | 289344 |
| 幽港迷城 | `links.boardgameaccessory[10].name` | Gloomhaven: Adventure Tokens – Chest |
| 幽港迷城 | `links.boardgameaccessory[10].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[11].id` | 306378 |
| 幽港迷城 | `links.boardgameaccessory[11].name` | Gloomhaven: Adventure Tokens – Crate |
| 幽港迷城 | `links.boardgameaccessory[11].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[12].id` | 306513 |
| 幽港迷城 | `links.boardgameaccessory[12].name` | Gloomhaven: Adventure Tokens – Crystal |
| 幽港迷城 | `links.boardgameaccessory[12].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[13].id` | 289345 |
| 幽港迷城 | `links.boardgameaccessory[13].name` | Gloomhaven: Adventure Tokens – Door |
| 幽港迷城 | `links.boardgameaccessory[13].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[14].id` | 289349 |
| 幽港迷城 | `links.boardgameaccessory[14].name` | Gloomhaven: Adventure Tokens – Fountain |
| 幽港迷城 | `links.boardgameaccessory[14].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[15].id` | 288414 |
| 幽港迷城 | `links.boardgameaccessory[15].name` | Gloomhaven: Adventure Tokens – Log |
| 幽港迷城 | `links.boardgameaccessory[15].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[16].id` | 289350 |
| 幽港迷城 | `links.boardgameaccessory[16].name` | Gloomhaven: Adventure Tokens – Nest |
| 幽港迷城 | `links.boardgameaccessory[16].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[17].id` | 288418 |
| 幽港迷城 | `links.boardgameaccessory[17].name` | Gloomhaven: Adventure Tokens – Poison Gas |
| 幽港迷城 | `links.boardgameaccessory[17].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[18].id` | 288420 |
| 幽港迷城 | `links.boardgameaccessory[18].name` | Gloomhaven: Adventure Tokens – Pressure Plate |
| 幽港迷城 | `links.boardgameaccessory[18].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[19].id` | 306376 |
| 幽港迷城 | `links.boardgameaccessory[19].name` | Gloomhaven: Adventure Tokens – Rock Column |
| 幽港迷城 | `links.boardgameaccessory[19].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[20].id` | 289342 |
| 幽港迷城 | `links.boardgameaccessory[20].name` | Gloomhaven: Adventure Tokens – Rubble |
| 幽港迷城 | `links.boardgameaccessory[20].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[21].id` | 306517 |
| 幽港迷城 | `links.boardgameaccessory[21].name` | Gloomhaven: Adventure Tokens – Sarcophagus |
| 幽港迷城 | `links.boardgameaccessory[21].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[22].id` | 306374 |
| 幽港迷城 | `links.boardgameaccessory[22].name` | Gloomhaven: Adventure Tokens – Shelf |
| 幽港迷城 | `links.boardgameaccessory[22].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[23].id` | 287230 |
| 幽港迷城 | `links.boardgameaccessory[23].name` | Gloomhaven: Adventure Tokens – Spike Pit |
| 幽港迷城 | `links.boardgameaccessory[23].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[24].id` | 288416 |
| 幽港迷城 | `links.boardgameaccessory[24].name` | Gloomhaven: Adventure Tokens – Stairs |
| 幽港迷城 | `links.boardgameaccessory[24].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[25].id` | 306516 |
| 幽港迷城 | `links.boardgameaccessory[25].name` | Gloomhaven: Adventure Tokens – Stone Pillar |
| 幽港迷城 | `links.boardgameaccessory[25].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[26].id` | 287231 |
| 幽港迷城 | `links.boardgameaccessory[26].name` | Gloomhaven: Adventure Tokens – Stump |
| 幽港迷城 | `links.boardgameaccessory[26].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[27].id` | 287229 |
| 幽港迷城 | `links.boardgameaccessory[27].name` | Gloomhaven: Adventure Tokens – Table |
| 幽港迷城 | `links.boardgameaccessory[27].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[28].id` | 306514 |
| 幽港迷城 | `links.boardgameaccessory[28].name` | Gloomhaven: Adventure Tokens – Totem |
| 幽港迷城 | `links.boardgameaccessory[28].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[29].id` | 288417 |
| 幽港迷城 | `links.boardgameaccessory[29].name` | Gloomhaven: Adventure Tokens – Wall Section |
| 幽港迷城 | `links.boardgameaccessory[29].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[30].id` | 272787 |
| 幽港迷城 | `links.boardgameaccessory[30].name` | Gloomhaven: Broken Token Character Trays |
| 幽港迷城 | `links.boardgameaccessory[30].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[31].id` | 272783 |
| 幽港迷城 | `links.boardgameaccessory[31].name` | Gloomhaven: Broken Token Organizer |
| 幽港迷城 | `links.boardgameaccessory[31].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[32].id` | 275029 |
| 幽港迷城 | `links.boardgameaccessory[32].name` | Gloomhaven: Broken Token Organizer – Extra Dividers |
| 幽港迷城 | `links.boardgameaccessory[32].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[33].id` | 280078 |
| 幽港迷城 | `links.boardgameaccessory[33].name` | Gloomhaven: Broken Token Organizer – Forgotten Circles Upgrade |
| 幽港迷城 | `links.boardgameaccessory[33].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[34].id` | 272784 |
| 幽港迷城 | `links.boardgameaccessory[34].name` | Gloomhaven: Broken Token Tuck Boxes |
| 幽港迷城 | `links.boardgameaccessory[34].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[35].id` | 393273 |
| 幽港迷城 | `links.boardgameaccessory[35].name` | Gloomhaven: Challenge Coin |
| 幽港迷城 | `links.boardgameaccessory[35].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[36].id` | 282059 |
| 幽港迷城 | `links.boardgameaccessory[36].name` | Gloomhaven: Crafting Kingdoms Playmats |
| 幽港迷城 | `links.boardgameaccessory[36].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[37].id` | 455714 |
| 幽港迷城 | `links.boardgameaccessory[37].name` | Gloomhaven: CZYY Acrylic Status Effects Markers |
| 幽港迷城 | `links.boardgameaccessory[37].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[38].id` | 455715 |
| 幽港迷城 | `links.boardgameaccessory[38].name` | Gloomhaven: CZYY Standee Bases Pack with Health Tracker and Status Token Slots |
| 幽港迷城 | `links.boardgameaccessory[38].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[39].id` | 308555 |
| 幽港迷城 | `links.boardgameaccessory[39].name` | Gloomhaven: E-Raptor Insert |
| 幽港迷城 | `links.boardgameaccessory[39].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[40].id` | 261980 |
| 幽港迷城 | `links.boardgameaccessory[40].name` | Gloomhaven: Folded Space Insert |
| 幽港迷城 | `links.boardgameaccessory[40].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[41].id` | 451595 |
| 幽港迷城 | `links.boardgameaccessory[41].name` | Gloomhaven: Folded Space Map Archive |
| 幽港迷城 | `links.boardgameaccessory[41].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[42].id` | 367191 |
| 幽港迷城 | `links.boardgameaccessory[42].name` | Gloomhaven: Forgotten Circles – Tower Rex Organizer |
| 幽港迷城 | `links.boardgameaccessory[42].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[43].id` | 365880 |
| 幽港迷城 | `links.boardgameaccessory[43].name` | Gloomhaven: Forgotten Circles – Tower Rex Organizer Upgrade |
| 幽港迷城 | `links.boardgameaccessory[43].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[44].id` | 336186 |
| 幽港迷城 | `links.boardgameaccessory[44].name` | Gloomhaven: Gaming Trunk Character's Tray |
| 幽港迷城 | `links.boardgameaccessory[44].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[45].id` | 272804 |
| 幽港迷城 | `links.boardgameaccessory[45].name` | Gloomhaven: Gloom Tavern Organizer |
| 幽港迷城 | `links.boardgameaccessory[45].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[46].id` | 367868 |
| 幽港迷城 | `links.boardgameaccessory[46].name` | Gloomhaven: Go7 Gaming Top Tray |
| 幽港迷城 | `links.boardgameaccessory[46].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[47].id` | 250857 |
| 幽港迷城 | `links.boardgameaccessory[47].name` | Gloomhaven: HP/XP Trackers |
| 幽港迷城 | `links.boardgameaccessory[47].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[48].id` | 261252 |
| 幽港迷城 | `links.boardgameaccessory[48].name` | Gloomhaven: Laserox GloomBox Organizer |
| 幽港迷城 | `links.boardgameaccessory[48].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[49].id` | 306362 |
| 幽港迷城 | `links.boardgameaccessory[49].name` | Gloomhaven: Laserox Monster Bases |
| 幽港迷城 | `links.boardgameaccessory[49].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[50].id` | 418046 |
| 幽港迷城 | `links.boardgameaccessory[50].name` | Gloomhaven: Laserox Sigil Set |
| 幽港迷城 | `links.boardgameaccessory[50].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[51].id` | 293088 |
| 幽港迷城 | `links.boardgameaccessory[51].name` | Gloomhaven: Metal Coin Upgrade |
| 幽港迷城 | `links.boardgameaccessory[51].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[52].id` | 250858 |
| 幽港迷城 | `links.boardgameaccessory[52].name` | Gloomhaven: Miniatures |
| 幽港迷城 | `links.boardgameaccessory[52].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[53].id` | 454746 |
| 幽港迷城 | `links.boardgameaccessory[53].name` | Gloomhaven: Molten Mesh Gaming Attack Deck Organizer |
| 幽港迷城 | `links.boardgameaccessory[53].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[54].id` | 454744 |
| 幽港迷城 | `links.boardgameaccessory[54].name` | Gloomhaven: Molten Mesh Gaming Element &amp; Round Tracker |
| 幽港迷城 | `links.boardgameaccessory[54].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[55].id` | 454743 |
| 幽港迷城 | `links.boardgameaccessory[55].name` | Gloomhaven: Molten Mesh Gaming Initiative Tracker |
| 幽港迷城 | `links.boardgameaccessory[55].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[56].id` | 454747 |
| 幽港迷城 | `links.boardgameaccessory[56].name` | Gloomhaven: Molten Mesh Gaming Monster Organizer |
| 幽港迷城 | `links.boardgameaccessory[56].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[57].id` | 454741 |
| 幽港迷城 | `links.boardgameaccessory[57].name` | Gloomhaven: Molten Mesh Gaming Player Character Dashboard |
| 幽港迷城 | `links.boardgameaccessory[57].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[58].id` | 454742 |
| 幽港迷城 | `links.boardgameaccessory[58].name` | Gloomhaven: Molten Mesh Gaming Player Character Dashboard &amp; Storage Vault |
| 幽港迷城 | `links.boardgameaccessory[58].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[59].id` | 454745 |
| 幽港迷城 | `links.boardgameaccessory[59].name` | Gloomhaven: Molten Mesh Gaming Token Organizer |
| 幽港迷城 | `links.boardgameaccessory[59].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[60].id` | 366336 |
| 幽港迷城 | `links.boardgameaccessory[60].name` | Gloomhaven: Momo Monster Playmat |
| 幽港迷城 | `links.boardgameaccessory[60].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[61].id` | 273547 |
| 幽港迷城 | `links.boardgameaccessory[61].name` | Gloomhaven: Player Mat |
| 幽港迷城 | `links.boardgameaccessory[61].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[62].id` | 338418 |
| 幽港迷城 | `links.boardgameaccessory[62].name` | Gloomhaven: Saim Lab Insert |
| 幽港迷城 | `links.boardgameaccessory[62].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[63].id` | 448146 |
| 幽港迷城 | `links.boardgameaccessory[63].name` | Gloomhaven: Smonex Organizer |
| 幽港迷城 | `links.boardgameaccessory[63].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[64].id` | 348625 |
| 幽港迷城 | `links.boardgameaccessory[64].name` | Gloomhaven: The GiftForge Insert |
| 幽港迷城 | `links.boardgameaccessory[64].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[65].id` | 365831 |
| 幽港迷城 | `links.boardgameaccessory[65].name` | Gloomhaven: Tower Rex Character Dashboard |
| 幽港迷城 | `links.boardgameaccessory[65].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[66].id` | 365799 |
| 幽港迷城 | `links.boardgameaccessory[66].name` | Gloomhaven: Tower Rex Dashboard |
| 幽港迷城 | `links.boardgameaccessory[66].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[67].id` | 267166 |
| 幽港迷城 | `links.boardgameaccessory[67].name` | Gloomhaven: Tower Rex Organizer |
| 幽港迷城 | `links.boardgameaccessory[67].inbound` | null |
| 幽港迷城 | `links.boardgameaccessory[68].id` | 265296 |
| 幽港迷城 | `links.boardgameaccessory[68].name` | Gloomhaven: WarBox Insert |
| 幽港迷城 | `links.boardgameaccessory[68].inbound` | null |
| 幽港迷城 | `links.boardgameintegration[0].id` | 295770 |
| 幽港迷城 | `links.boardgameintegration[0].name` | Frosthaven |
| 幽港迷城 | `links.boardgameintegration[0].inbound` | null |
| 幽港迷城 | `links.boardgameintegration[1].id` | 291457 |
| 幽港迷城 | `links.boardgameintegration[1].name` | Gloomhaven: Jaws of the Lion |
| 幽港迷城 | `links.boardgameintegration[1].inbound` | null |
| 幽港迷城 | `links.boardgameimplementation[0].id` | 390478 |
| 幽港迷城 | `links.boardgameimplementation[0].name` | Gloomhaven (Second Edition) |
| 幽港迷城 | `links.boardgameimplementation[0].inbound` | null |
| 幽港迷城 | `links.boardgameimplementation[1].id` | 340909 |
| 幽港迷城 | `links.boardgameimplementation[1].name` | Gloomholdin' |
| 幽港迷城 | `links.boardgameimplementation[1].inbound` | null |
| 幽港迷城 | `links.boardgamedesigner[0].id` | 69802 |
| 幽港迷城 | `links.boardgamedesigner[0].name` | Isaac Childres |
| 幽港迷城 | `links.boardgamedesigner[0].inbound` | null |
| 幽港迷城 | `links.boardgameartist[0].id` | 77084 |
| 幽港迷城 | `links.boardgameartist[0].name` | Alexandr Elichev |
| 幽港迷城 | `links.boardgameartist[0].inbound` | null |
| 幽港迷城 | `links.boardgameartist[1].id` | 173812 |
| 幽港迷城 | `links.boardgameartist[1].name` | Lucile Mathieu |
| 幽港迷城 | `links.boardgameartist[1].inbound` | null |
| 幽港迷城 | `links.boardgameartist[2].id` | 78961 |
| 幽港迷城 | `links.boardgameartist[2].name` | Josh T. McDowell |
| 幽港迷城 | `links.boardgameartist[2].inbound` | null |
| 幽港迷城 | `links.boardgameartist[3].id` | 84269 |
| 幽港迷城 | `links.boardgameartist[3].name` | Alvaro Nebot |
| 幽港迷城 | `links.boardgameartist[3].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[0].id` | 27425 |
| 幽港迷城 | `links.boardgamepublisher[0].name` | Cephalofair Games |
| 幽港迷城 | `links.boardgamepublisher[0].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[1].id` | 4304 |
| 幽港迷城 | `links.boardgamepublisher[1].name` | Albi |
| 幽港迷城 | `links.boardgamepublisher[1].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[2].id` | 46179 |
| 幽港迷城 | `links.boardgamepublisher[2].name` | Albi Polska |
| 幽港迷城 | `links.boardgamepublisher[2].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[3].id` | 3475 |
| 幽港迷城 | `links.boardgamepublisher[3].name` | Arclight Games |
| 幽港迷城 | `links.boardgamepublisher[3].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[4].id` | 22380 |
| 幽港迷城 | `links.boardgamepublisher[4].name` | Feuerland Spiele |
| 幽港迷城 | `links.boardgamepublisher[4].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[5].id` | 15605 |
| 幽港迷城 | `links.boardgamepublisher[5].name` | Galápagos Jogos |
| 幽港迷城 | `links.boardgamepublisher[5].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[6].id` | 40478 |
| 幽港迷城 | `links.boardgamepublisher[6].name` | Games Warehouse |
| 幽港迷城 | `links.boardgamepublisher[6].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[7].id` | 8820 |
| 幽港迷城 | `links.boardgamepublisher[7].name` | Gémklub |
| 幽港迷城 | `links.boardgamepublisher[7].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[8].id` | 18852 |
| 幽港迷城 | `links.boardgamepublisher[8].name` | Hobby World |
| 幽港迷城 | `links.boardgamepublisher[8].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[9].id` | 8291 |
| 幽港迷城 | `links.boardgamepublisher[9].name` | Korea Boardgames |
| 幽港迷城 | `links.boardgamepublisher[9].inbound` | null |
| 幽港迷城 | `links.boardgamepublisher[10].id` | 23756 |
| 幽港迷城 | `links.boardgamepublisher[10].name` | MYBG Co., Ltd. |
| 幽港迷城 | `links.boardgamepublisher[10].inbound` | null |
| 幽港迷城 | `statistics.users_rated` | 67627 |
| 幽港迷城 | `statistics.average_rating` | 8.53334 |
| 幽港迷城 | `statistics.bayes_average` | 8.29097 |
| 幽港迷城 | `statistics.stddev` | 1.73947 |
| 幽港迷城 | `statistics.median` | 0 |
| 幽港迷城 | `statistics.owned` | 105258 |
| 幽港迷城 | `statistics.trading` | 1304 |
| 幽港迷城 | `statistics.wanting` | 1163 |
| 幽港迷城 | `statistics.wishing` | 22476 |
| 幽港迷城 | `statistics.num_comments` | 11802 |
| 幽港迷城 | `statistics.num_weights` | 2770 |
| 幽港迷城 | `statistics.average_weight` | 3.9195 |
| 幽港迷城 | `statistics.ranks[0].type` | subtype |
| 幽港迷城 | `statistics.ranks[0].id` | 1 |
| 幽港迷城 | `statistics.ranks[0].name` | boardgame |
| 幽港迷城 | `statistics.ranks[0].friendlyname` | Board Game Rank |
| 幽港迷城 | `statistics.ranks[0].value` | 4 |
| 幽港迷城 | `statistics.ranks[0].bayesaverage` | 8.29097 |
| 幽港迷城 | `statistics.ranks[1].type` | family |
| 幽港迷城 | `statistics.ranks[1].id` | 5496 |
| 幽港迷城 | `statistics.ranks[1].name` | thematic |
| 幽港迷城 | `statistics.ranks[1].friendlyname` | Thematic Rank |
| 幽港迷城 | `statistics.ranks[1].value` | 2 |
| 幽港迷城 | `statistics.ranks[1].bayesaverage` | 8.26604 |
| 幽港迷城 | `statistics.ranks[2].type` | family |
| 幽港迷城 | `statistics.ranks[2].id` | 5497 |
| 幽港迷城 | `statistics.ranks[2].name` | strategygames |
| 幽港迷城 | `statistics.ranks[2].friendlyname` | Strategy Game Rank |
| 幽港迷城 | `statistics.ranks[2].value` | 5 |
| 幽港迷城 | `statistics.ranks[2].bayesaverage` | 8.25431 |
| 幽港迷城 | `versions_count` | 28 |
| 幽港迷城 | `versions[0].tag` | item |
| 幽港迷城 | `versions[0].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[0].attributes.id` | 460243 |
| 幽港迷城 | `versions[0].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[0].children[0].text` | https://cf.geekdo-images.com/-FscE2pbauFHXxXCAPQHug__small/img/q21ULrNeQxFMTk_5jCtifq02HoI=/fit-in/200x150/filters:strip_icc()/pic4780773.png |
| 幽港迷城 | `versions[0].children[1].tag` | image |
| 幽港迷城 | `versions[0].children[1].text` | https://cf.geekdo-images.com/-FscE2pbauFHXxXCAPQHug__original/img/19NU9tzaXqLqqqGGH_6Ax-rC-iE=/0x0/filters:format(png)/pic4780773.png |
| 幽港迷城 | `versions[0].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[0].children[2].attributes.value` | 幽港迷城 |
| 幽港迷城 | `versions[0].children[3].tag` | link |
| 幽港迷城 | `versions[0].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[0].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[0].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[0].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[0].children[4].tag` | name |
| 幽港迷城 | `versions[0].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[0].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[0].children[4].attributes.value` | Chinese edition |
| 幽港迷城 | `versions[0].children[5].tag` | link |
| 幽港迷城 | `versions[0].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[0].children[5].attributes.id` | 40478 |
| 幽港迷城 | `versions[0].children[5].attributes.value` | Games Warehouse |
| 幽港迷城 | `versions[0].children[6].tag` | link |
| 幽港迷城 | `versions[0].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[0].children[6].attributes.id` | 23756 |
| 幽港迷城 | `versions[0].children[6].attributes.value` | MYBG Co., Ltd. |
| 幽港迷城 | `versions[0].children[7].tag` | yearpublished |
| 幽港迷城 | `versions[0].children[7].attributes.value` | 2019 |
| 幽港迷城 | `versions[0].children[8].tag` | productcode |
| 幽港迷城 | `versions[0].children[8].attributes.value` |  |
| 幽港迷城 | `versions[0].children[9].tag` | width |
| 幽港迷城 | `versions[0].children[9].attributes.value` | 11.5 |
| 幽港迷城 | `versions[0].children[10].tag` | length |
| 幽港迷城 | `versions[0].children[10].attributes.value` | 16 |
| 幽港迷城 | `versions[0].children[11].tag` | depth |
| 幽港迷城 | `versions[0].children[11].attributes.value` | 7.5 |
| 幽港迷城 | `versions[0].children[12].tag` | weight |
| 幽港迷城 | `versions[0].children[12].attributes.value` | 18.9598 |
| 幽港迷城 | `versions[0].children[13].tag` | link |
| 幽港迷城 | `versions[0].children[13].attributes.type` | language |
| 幽港迷城 | `versions[0].children[13].attributes.id` | 2181 |
| 幽港迷城 | `versions[0].children[13].attributes.value` | Chinese |
| 幽港迷城 | `versions[1].tag` | item |
| 幽港迷城 | `versions[1].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[1].attributes.id` | 482203 |
| 幽港迷城 | `versions[1].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[1].children[0].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__small/img/RO6AmgRF5vaajfEql9xgRvGepfg=/fit-in/200x150/filters:strip_icc()/pic6366365.jpg |
| 幽港迷城 | `versions[1].children[1].tag` | image |
| 幽港迷城 | `versions[1].children[1].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__original/img/FdW4yu8KNtTpEdXHZSo9BbzWmTI=/0x0/filters:format(jpeg)/pic6366365.jpg |
| 幽港迷城 | `versions[1].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[1].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[1].children[3].tag` | link |
| 幽港迷城 | `versions[1].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[1].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[1].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[1].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[1].children[4].tag` | name |
| 幽港迷城 | `versions[1].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[1].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[1].children[4].attributes.value` | Czech edition, first printing |
| 幽港迷城 | `versions[1].children[5].tag` | link |
| 幽港迷城 | `versions[1].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[1].children[5].attributes.id` | 4304 |
| 幽港迷城 | `versions[1].children[5].attributes.value` | Albi |
| 幽港迷城 | `versions[1].children[6].tag` | link |
| 幽港迷城 | `versions[1].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[1].children[6].attributes.id` | 27425 |
| 幽港迷城 | `versions[1].children[6].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[1].children[7].tag` | link |
| 幽港迷城 | `versions[1].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[1].children[7].attributes.id` | 77084 |
| 幽港迷城 | `versions[1].children[7].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[1].children[8].tag` | link |
| 幽港迷城 | `versions[1].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[1].children[8].attributes.id` | 78961 |
| 幽港迷城 | `versions[1].children[8].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[1].children[9].tag` | link |
| 幽港迷城 | `versions[1].children[9].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[1].children[9].attributes.id` | 84269 |
| 幽港迷城 | `versions[1].children[9].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[1].children[10].tag` | yearpublished |
| 幽港迷城 | `versions[1].children[10].attributes.value` | 2019 |
| 幽港迷城 | `versions[1].children[11].tag` | productcode |
| 幽港迷城 | `versions[1].children[11].attributes.value` | 48641 |
| 幽港迷城 | `versions[1].children[12].tag` | width |
| 幽港迷城 | `versions[1].children[12].attributes.value` | 11.4961 |
| 幽港迷城 | `versions[1].children[13].tag` | length |
| 幽港迷城 | `versions[1].children[13].attributes.value` | 15.9843 |
| 幽港迷城 | `versions[1].children[14].tag` | depth |
| 幽港迷城 | `versions[1].children[14].attributes.value` | 7.51969 |
| 幽港迷城 | `versions[1].children[15].tag` | weight |
| 幽港迷城 | `versions[1].children[15].attributes.value` | 18.9597 |
| 幽港迷城 | `versions[1].children[16].tag` | link |
| 幽港迷城 | `versions[1].children[16].attributes.type` | language |
| 幽港迷城 | `versions[1].children[16].attributes.id` | 2180 |
| 幽港迷城 | `versions[1].children[16].attributes.value` | Czech |
| 幽港迷城 | `versions[2].tag` | item |
| 幽港迷城 | `versions[2].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[2].attributes.id` | 721684 |
| 幽港迷城 | `versions[2].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[2].children[0].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__small/img/RO6AmgRF5vaajfEql9xgRvGepfg=/fit-in/200x150/filters:strip_icc()/pic6366365.jpg |
| 幽港迷城 | `versions[2].children[1].tag` | image |
| 幽港迷城 | `versions[2].children[1].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__original/img/FdW4yu8KNtTpEdXHZSo9BbzWmTI=/0x0/filters:format(jpeg)/pic6366365.jpg |
| 幽港迷城 | `versions[2].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[2].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[2].children[3].tag` | link |
| 幽港迷城 | `versions[2].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[2].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[2].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[2].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[2].children[4].tag` | name |
| 幽港迷城 | `versions[2].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[2].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[2].children[4].attributes.value` | Czech edition, fourth printing |
| 幽港迷城 | `versions[2].children[5].tag` | link |
| 幽港迷城 | `versions[2].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[2].children[5].attributes.id` | 4304 |
| 幽港迷城 | `versions[2].children[5].attributes.value` | Albi |
| 幽港迷城 | `versions[2].children[6].tag` | link |
| 幽港迷城 | `versions[2].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[2].children[6].attributes.id` | 27425 |
| 幽港迷城 | `versions[2].children[6].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[2].children[7].tag` | link |
| 幽港迷城 | `versions[2].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[2].children[7].attributes.id` | 77084 |
| 幽港迷城 | `versions[2].children[7].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[2].children[8].tag` | link |
| 幽港迷城 | `versions[2].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[2].children[8].attributes.id` | 78961 |
| 幽港迷城 | `versions[2].children[8].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[2].children[9].tag` | link |
| 幽港迷城 | `versions[2].children[9].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[2].children[9].attributes.id` | 84269 |
| 幽港迷城 | `versions[2].children[9].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[2].children[10].tag` | yearpublished |
| 幽港迷城 | `versions[2].children[10].attributes.value` | 2022 |
| 幽港迷城 | `versions[2].children[11].tag` | productcode |
| 幽港迷城 | `versions[2].children[11].attributes.value` | 48641 |
| 幽港迷城 | `versions[2].children[12].tag` | width |
| 幽港迷城 | `versions[2].children[12].attributes.value` | 11.7323 |
| 幽港迷城 | `versions[2].children[13].tag` | length |
| 幽港迷城 | `versions[2].children[13].attributes.value` | 16.2598 |
| 幽港迷城 | `versions[2].children[14].tag` | depth |
| 幽港迷城 | `versions[2].children[14].attributes.value` | 7.95276 |
| 幽港迷城 | `versions[2].children[15].tag` | weight |
| 幽港迷城 | `versions[2].children[15].attributes.value` | 19.8416 |
| 幽港迷城 | `versions[2].children[16].tag` | link |
| 幽港迷城 | `versions[2].children[16].attributes.type` | language |
| 幽港迷城 | `versions[2].children[16].attributes.id` | 2180 |
| 幽港迷城 | `versions[2].children[16].attributes.value` | Czech |
| 幽港迷城 | `versions[3].tag` | item |
| 幽港迷城 | `versions[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[3].attributes.id` | 721682 |
| 幽港迷城 | `versions[3].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[3].children[0].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__small/img/RO6AmgRF5vaajfEql9xgRvGepfg=/fit-in/200x150/filters:strip_icc()/pic6366365.jpg |
| 幽港迷城 | `versions[3].children[1].tag` | image |
| 幽港迷城 | `versions[3].children[1].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__original/img/FdW4yu8KNtTpEdXHZSo9BbzWmTI=/0x0/filters:format(jpeg)/pic6366365.jpg |
| 幽港迷城 | `versions[3].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[3].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[3].children[3].tag` | link |
| 幽港迷城 | `versions[3].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[3].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[3].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[3].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[3].children[4].tag` | name |
| 幽港迷城 | `versions[3].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[3].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[3].children[4].attributes.value` | Czech edition, second printing |
| 幽港迷城 | `versions[3].children[5].tag` | link |
| 幽港迷城 | `versions[3].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[3].children[5].attributes.id` | 4304 |
| 幽港迷城 | `versions[3].children[5].attributes.value` | Albi |
| 幽港迷城 | `versions[3].children[6].tag` | link |
| 幽港迷城 | `versions[3].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[3].children[6].attributes.id` | 27425 |
| 幽港迷城 | `versions[3].children[6].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[3].children[7].tag` | link |
| 幽港迷城 | `versions[3].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[3].children[7].attributes.id` | 77084 |
| 幽港迷城 | `versions[3].children[7].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[3].children[8].tag` | link |
| 幽港迷城 | `versions[3].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[3].children[8].attributes.id` | 78961 |
| 幽港迷城 | `versions[3].children[8].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[3].children[9].tag` | link |
| 幽港迷城 | `versions[3].children[9].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[3].children[9].attributes.id` | 84269 |
| 幽港迷城 | `versions[3].children[9].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[3].children[10].tag` | yearpublished |
| 幽港迷城 | `versions[3].children[10].attributes.value` | 2020 |
| 幽港迷城 | `versions[3].children[11].tag` | productcode |
| 幽港迷城 | `versions[3].children[11].attributes.value` | 48641 |
| 幽港迷城 | `versions[3].children[12].tag` | width |
| 幽港迷城 | `versions[3].children[12].attributes.value` | 11.4961 |
| 幽港迷城 | `versions[3].children[13].tag` | length |
| 幽港迷城 | `versions[3].children[13].attributes.value` | 15.9843 |
| 幽港迷城 | `versions[3].children[14].tag` | depth |
| 幽港迷城 | `versions[3].children[14].attributes.value` | 7.51969 |
| 幽港迷城 | `versions[3].children[15].tag` | weight |
| 幽港迷城 | `versions[3].children[15].attributes.value` | 18.9598 |
| 幽港迷城 | `versions[3].children[16].tag` | link |
| 幽港迷城 | `versions[3].children[16].attributes.type` | language |
| 幽港迷城 | `versions[3].children[16].attributes.id` | 2180 |
| 幽港迷城 | `versions[3].children[16].attributes.value` | Czech |
| 幽港迷城 | `versions[4].tag` | item |
| 幽港迷城 | `versions[4].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[4].attributes.id` | 721683 |
| 幽港迷城 | `versions[4].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[4].children[0].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__small/img/RO6AmgRF5vaajfEql9xgRvGepfg=/fit-in/200x150/filters:strip_icc()/pic6366365.jpg |
| 幽港迷城 | `versions[4].children[1].tag` | image |
| 幽港迷城 | `versions[4].children[1].text` | https://cf.geekdo-images.com/F1zRcQjx4KutleETnpsbSQ__original/img/FdW4yu8KNtTpEdXHZSo9BbzWmTI=/0x0/filters:format(jpeg)/pic6366365.jpg |
| 幽港迷城 | `versions[4].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[4].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[4].children[3].tag` | link |
| 幽港迷城 | `versions[4].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[4].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[4].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[4].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[4].children[4].tag` | name |
| 幽港迷城 | `versions[4].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[4].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[4].children[4].attributes.value` | Czech edition, third printing |
| 幽港迷城 | `versions[4].children[5].tag` | link |
| 幽港迷城 | `versions[4].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[4].children[5].attributes.id` | 4304 |
| 幽港迷城 | `versions[4].children[5].attributes.value` | Albi |
| 幽港迷城 | `versions[4].children[6].tag` | link |
| 幽港迷城 | `versions[4].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[4].children[6].attributes.id` | 27425 |
| 幽港迷城 | `versions[4].children[6].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[4].children[7].tag` | link |
| 幽港迷城 | `versions[4].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[4].children[7].attributes.id` | 77084 |
| 幽港迷城 | `versions[4].children[7].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[4].children[8].tag` | link |
| 幽港迷城 | `versions[4].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[4].children[8].attributes.id` | 78961 |
| 幽港迷城 | `versions[4].children[8].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[4].children[9].tag` | link |
| 幽港迷城 | `versions[4].children[9].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[4].children[9].attributes.id` | 84269 |
| 幽港迷城 | `versions[4].children[9].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[4].children[10].tag` | yearpublished |
| 幽港迷城 | `versions[4].children[10].attributes.value` | 2021 |
| 幽港迷城 | `versions[4].children[11].tag` | productcode |
| 幽港迷城 | `versions[4].children[11].attributes.value` | 48641 |
| 幽港迷城 | `versions[4].children[12].tag` | width |
| 幽港迷城 | `versions[4].children[12].attributes.value` | 11.4961 |
| 幽港迷城 | `versions[4].children[13].tag` | length |
| 幽港迷城 | `versions[4].children[13].attributes.value` | 15.9843 |
| 幽港迷城 | `versions[4].children[14].tag` | depth |
| 幽港迷城 | `versions[4].children[14].attributes.value` | 7.51969 |
| 幽港迷城 | `versions[4].children[15].tag` | weight |
| 幽港迷城 | `versions[4].children[15].attributes.value` | 18.9598 |
| 幽港迷城 | `versions[4].children[16].tag` | link |
| 幽港迷城 | `versions[4].children[16].attributes.type` | language |
| 幽港迷城 | `versions[4].children[16].attributes.id` | 2180 |
| 幽港迷城 | `versions[4].children[16].attributes.value` | Czech |
| 幽港迷城 | `versions[5].tag` | item |
| 幽港迷城 | `versions[5].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[5].attributes.id` | 479734 |
| 幽港迷城 | `versions[5].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[5].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[5].children[1].tag` | image |
| 幽港迷城 | `versions[5].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[5].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[5].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[5].children[3].tag` | link |
| 幽港迷城 | `versions[5].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[5].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[5].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[5].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[5].children[4].tag` | name |
| 幽港迷城 | `versions[5].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[5].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[5].children[4].attributes.value` | English edition, fifth printing |
| 幽港迷城 | `versions[5].children[5].tag` | link |
| 幽港迷城 | `versions[5].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[5].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[5].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[5].children[6].tag` | link |
| 幽港迷城 | `versions[5].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[5].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[5].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[5].children[7].tag` | link |
| 幽港迷城 | `versions[5].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[5].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[5].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[5].children[8].tag` | link |
| 幽港迷城 | `versions[5].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[5].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[5].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[5].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[5].children[9].attributes.value` | 2019 |
| 幽港迷城 | `versions[5].children[10].tag` | productcode |
| 幽港迷城 | `versions[5].children[10].attributes.value` | CPH0201 |
| 幽港迷城 | `versions[5].children[11].tag` | width |
| 幽港迷城 | `versions[5].children[11].attributes.value` | 11.5 |
| 幽港迷城 | `versions[5].children[12].tag` | length |
| 幽港迷城 | `versions[5].children[12].attributes.value` | 16 |
| 幽港迷城 | `versions[5].children[13].tag` | depth |
| 幽港迷城 | `versions[5].children[13].attributes.value` | 7.5 |
| 幽港迷城 | `versions[5].children[14].tag` | weight |
| 幽港迷城 | `versions[5].children[14].attributes.value` | 21.6053 |
| 幽港迷城 | `versions[5].children[15].tag` | link |
| 幽港迷城 | `versions[5].children[15].attributes.type` | language |
| 幽港迷城 | `versions[5].children[15].attributes.id` | 2184 |
| 幽港迷城 | `versions[5].children[15].attributes.value` | English |
| 幽港迷城 | `versions[6].tag` | item |
| 幽港迷城 | `versions[6].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[6].attributes.id` | 331120 |
| 幽港迷城 | `versions[6].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[6].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[6].children[1].tag` | image |
| 幽港迷城 | `versions[6].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[6].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[6].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[6].children[3].tag` | link |
| 幽港迷城 | `versions[6].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[6].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[6].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[6].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[6].children[4].tag` | name |
| 幽港迷城 | `versions[6].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[6].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[6].children[4].attributes.value` | English edition, first printing |
| 幽港迷城 | `versions[6].children[5].tag` | link |
| 幽港迷城 | `versions[6].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[6].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[6].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[6].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[6].children[6].attributes.value` | 2017 |
| 幽港迷城 | `versions[6].children[7].tag` | productcode |
| 幽港迷城 | `versions[6].children[7].attributes.value` | CPH0201 |
| 幽港迷城 | `versions[6].children[8].tag` | width |
| 幽港迷城 | `versions[6].children[8].attributes.value` | 16 |
| 幽港迷城 | `versions[6].children[9].tag` | length |
| 幽港迷城 | `versions[6].children[9].attributes.value` | 11.5 |
| 幽港迷城 | `versions[6].children[10].tag` | depth |
| 幽港迷城 | `versions[6].children[10].attributes.value` | 7.5 |
| 幽港迷城 | `versions[6].children[11].tag` | weight |
| 幽港迷城 | `versions[6].children[11].attributes.value` | 19 |
| 幽港迷城 | `versions[6].children[12].tag` | link |
| 幽港迷城 | `versions[6].children[12].attributes.type` | language |
| 幽港迷城 | `versions[6].children[12].attributes.id` | 2184 |
| 幽港迷城 | `versions[6].children[12].attributes.value` | English |
| 幽港迷城 | `versions[7].tag` | item |
| 幽港迷城 | `versions[7].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[7].attributes.id` | 451774 |
| 幽港迷城 | `versions[7].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[7].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[7].children[1].tag` | image |
| 幽港迷城 | `versions[7].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[7].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[7].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[7].children[3].tag` | link |
| 幽港迷城 | `versions[7].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[7].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[7].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[7].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[7].children[4].tag` | name |
| 幽港迷城 | `versions[7].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[7].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[7].children[4].attributes.value` | English edition, fourth printing |
| 幽港迷城 | `versions[7].children[5].tag` | link |
| 幽港迷城 | `versions[7].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[7].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[7].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[7].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[7].children[6].attributes.value` | 2018 |
| 幽港迷城 | `versions[7].children[7].tag` | productcode |
| 幽港迷城 | `versions[7].children[7].attributes.value` | CPH0201 |
| 幽港迷城 | `versions[7].children[8].tag` | width |
| 幽港迷城 | `versions[7].children[8].attributes.value` | 16.1417 |
| 幽港迷城 | `versions[7].children[9].tag` | length |
| 幽港迷城 | `versions[7].children[9].attributes.value` | 11.5748 |
| 幽港迷城 | `versions[7].children[10].tag` | depth |
| 幽港迷城 | `versions[7].children[10].attributes.value` | 7.55906 |
| 幽港迷城 | `versions[7].children[11].tag` | weight |
| 幽港迷城 | `versions[7].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[7].children[12].tag` | link |
| 幽港迷城 | `versions[7].children[12].attributes.type` | language |
| 幽港迷城 | `versions[7].children[12].attributes.id` | 2184 |
| 幽港迷城 | `versions[7].children[12].attributes.value` | English |
| 幽港迷城 | `versions[8].tag` | item |
| 幽港迷城 | `versions[8].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[8].attributes.id` | 591864 |
| 幽港迷城 | `versions[8].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[8].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[8].children[1].tag` | image |
| 幽港迷城 | `versions[8].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[8].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[8].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[8].children[3].tag` | link |
| 幽港迷城 | `versions[8].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[8].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[8].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[8].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[8].children[4].tag` | name |
| 幽港迷城 | `versions[8].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[8].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[8].children[4].attributes.value` | English edition, ninth printing |
| 幽港迷城 | `versions[8].children[5].tag` | link |
| 幽港迷城 | `versions[8].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[8].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[8].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[8].children[6].tag` | link |
| 幽港迷城 | `versions[8].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[8].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[8].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[8].children[7].tag` | link |
| 幽港迷城 | `versions[8].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[8].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[8].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[8].children[8].tag` | link |
| 幽港迷城 | `versions[8].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[8].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[8].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[8].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[8].children[9].attributes.value` | 2020 |
| 幽港迷城 | `versions[8].children[10].tag` | productcode |
| 幽港迷城 | `versions[8].children[10].attributes.value` | CPH0201 |
| 幽港迷城 | `versions[8].children[11].tag` | width |
| 幽港迷城 | `versions[8].children[11].attributes.value` | 11.5 |
| 幽港迷城 | `versions[8].children[12].tag` | length |
| 幽港迷城 | `versions[8].children[12].attributes.value` | 16 |
| 幽港迷城 | `versions[8].children[13].tag` | depth |
| 幽港迷城 | `versions[8].children[13].attributes.value` | 7.5 |
| 幽港迷城 | `versions[8].children[14].tag` | weight |
| 幽港迷城 | `versions[8].children[14].attributes.value` | 0 |
| 幽港迷城 | `versions[8].children[15].tag` | link |
| 幽港迷城 | `versions[8].children[15].attributes.type` | language |
| 幽港迷城 | `versions[8].children[15].attributes.id` | 2184 |
| 幽港迷城 | `versions[8].children[15].attributes.value` | English |
| 幽港迷城 | `versions[9].tag` | item |
| 幽港迷城 | `versions[9].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[9].attributes.id` | 351462 |
| 幽港迷城 | `versions[9].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[9].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[9].children[1].tag` | image |
| 幽港迷城 | `versions[9].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[9].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[9].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[9].children[3].tag` | link |
| 幽港迷城 | `versions[9].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[9].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[9].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[9].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[9].children[4].tag` | name |
| 幽港迷城 | `versions[9].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[9].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[9].children[4].attributes.value` | English edition, second printing |
| 幽港迷城 | `versions[9].children[5].tag` | link |
| 幽港迷城 | `versions[9].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[9].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[9].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[9].children[6].tag` | link |
| 幽港迷城 | `versions[9].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[9].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[9].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[9].children[7].tag` | link |
| 幽港迷城 | `versions[9].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[9].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[9].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[9].children[8].tag` | link |
| 幽港迷城 | `versions[9].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[9].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[9].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[9].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[9].children[9].attributes.value` | 2017 |
| 幽港迷城 | `versions[9].children[10].tag` | productcode |
| 幽港迷城 | `versions[9].children[10].attributes.value` |  |
| 幽港迷城 | `versions[9].children[11].tag` | width |
| 幽港迷城 | `versions[9].children[11].attributes.value` | 11.5 |
| 幽港迷城 | `versions[9].children[12].tag` | length |
| 幽港迷城 | `versions[9].children[12].attributes.value` | 16 |
| 幽港迷城 | `versions[9].children[13].tag` | depth |
| 幽港迷城 | `versions[9].children[13].attributes.value` | 7.5 |
| 幽港迷城 | `versions[9].children[14].tag` | weight |
| 幽港迷城 | `versions[9].children[14].attributes.value` | 19 |
| 幽港迷城 | `versions[9].children[15].tag` | link |
| 幽港迷城 | `versions[9].children[15].attributes.type` | language |
| 幽港迷城 | `versions[9].children[15].attributes.id` | 2184 |
| 幽港迷城 | `versions[9].children[15].attributes.value` | English |
| 幽港迷城 | `versions[10].tag` | item |
| 幽港迷城 | `versions[10].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[10].attributes.id` | 384592 |
| 幽港迷城 | `versions[10].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[10].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[10].children[1].tag` | image |
| 幽港迷城 | `versions[10].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[10].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[10].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[10].children[3].tag` | link |
| 幽港迷城 | `versions[10].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[10].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[10].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[10].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[10].children[4].tag` | name |
| 幽港迷城 | `versions[10].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[10].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[10].children[4].attributes.value` | English edition, second printing (with Solo Scenarios) |
| 幽港迷城 | `versions[10].children[5].tag` | link |
| 幽港迷城 | `versions[10].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[10].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[10].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[10].children[6].tag` | link |
| 幽港迷城 | `versions[10].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[10].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[10].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[10].children[7].tag` | link |
| 幽港迷城 | `versions[10].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[10].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[10].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[10].children[8].tag` | link |
| 幽港迷城 | `versions[10].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[10].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[10].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[10].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[10].children[9].attributes.value` | 2017 |
| 幽港迷城 | `versions[10].children[10].tag` | productcode |
| 幽港迷城 | `versions[10].children[10].attributes.value` | CPH0210 |
| 幽港迷城 | `versions[10].children[11].tag` | width |
| 幽港迷城 | `versions[10].children[11].attributes.value` | 11.5 |
| 幽港迷城 | `versions[10].children[12].tag` | length |
| 幽港迷城 | `versions[10].children[12].attributes.value` | 16 |
| 幽港迷城 | `versions[10].children[13].tag` | depth |
| 幽港迷城 | `versions[10].children[13].attributes.value` | 7.5 |
| 幽港迷城 | `versions[10].children[14].tag` | weight |
| 幽港迷城 | `versions[10].children[14].attributes.value` | 19 |
| 幽港迷城 | `versions[10].children[15].tag` | link |
| 幽港迷城 | `versions[10].children[15].attributes.type` | language |
| 幽港迷城 | `versions[10].children[15].attributes.id` | 2184 |
| 幽港迷城 | `versions[10].children[15].attributes.value` | English |
| 幽港迷城 | `versions[11].tag` | item |
| 幽港迷城 | `versions[11].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[11].attributes.id` | 520054 |
| 幽港迷城 | `versions[11].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[11].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[11].children[1].tag` | image |
| 幽港迷城 | `versions[11].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[11].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[11].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[11].children[3].tag` | link |
| 幽港迷城 | `versions[11].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[11].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[11].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[11].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[11].children[4].tag` | name |
| 幽港迷城 | `versions[11].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[11].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[11].children[4].attributes.value` | English edition, sixth printing |
| 幽港迷城 | `versions[11].children[5].tag` | link |
| 幽港迷城 | `versions[11].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[11].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[11].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[11].children[6].tag` | link |
| 幽港迷城 | `versions[11].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[11].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[11].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[11].children[7].tag` | link |
| 幽港迷城 | `versions[11].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[11].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[11].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[11].children[8].tag` | link |
| 幽港迷城 | `versions[11].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[11].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[11].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[11].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[11].children[9].attributes.value` | 2020 |
| 幽港迷城 | `versions[11].children[10].tag` | productcode |
| 幽港迷城 | `versions[11].children[10].attributes.value` |  |
| 幽港迷城 | `versions[11].children[11].tag` | width |
| 幽港迷城 | `versions[11].children[11].attributes.value` | 11.5 |
| 幽港迷城 | `versions[11].children[12].tag` | length |
| 幽港迷城 | `versions[11].children[12].attributes.value` | 16 |
| 幽港迷城 | `versions[11].children[13].tag` | depth |
| 幽港迷城 | `versions[11].children[13].attributes.value` | 7.5 |
| 幽港迷城 | `versions[11].children[14].tag` | weight |
| 幽港迷城 | `versions[11].children[14].attributes.value` | 0 |
| 幽港迷城 | `versions[11].children[15].tag` | link |
| 幽港迷城 | `versions[11].children[15].attributes.type` | language |
| 幽港迷城 | `versions[11].children[15].attributes.id` | 2184 |
| 幽港迷城 | `versions[11].children[15].attributes.value` | English |
| 幽港迷城 | `versions[12].tag` | item |
| 幽港迷城 | `versions[12].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[12].attributes.id` | 481236 |
| 幽港迷城 | `versions[12].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[12].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[12].children[1].tag` | image |
| 幽港迷城 | `versions[12].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[12].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[12].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[12].children[3].tag` | link |
| 幽港迷城 | `versions[12].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[12].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[12].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[12].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[12].children[4].tag` | name |
| 幽港迷城 | `versions[12].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[12].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[12].children[4].attributes.value` | English edition, third printing |
| 幽港迷城 | `versions[12].children[5].tag` | link |
| 幽港迷城 | `versions[12].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[12].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[12].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[12].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[12].children[6].attributes.value` | 2018 |
| 幽港迷城 | `versions[12].children[7].tag` | productcode |
| 幽港迷城 | `versions[12].children[7].attributes.value` |  |
| 幽港迷城 | `versions[12].children[8].tag` | width |
| 幽港迷城 | `versions[12].children[8].attributes.value` | 16 |
| 幽港迷城 | `versions[12].children[9].tag` | length |
| 幽港迷城 | `versions[12].children[9].attributes.value` | 11.5 |
| 幽港迷城 | `versions[12].children[10].tag` | depth |
| 幽港迷城 | `versions[12].children[10].attributes.value` | 7.5 |
| 幽港迷城 | `versions[12].children[11].tag` | weight |
| 幽港迷城 | `versions[12].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[12].children[12].tag` | link |
| 幽港迷城 | `versions[12].children[12].attributes.type` | language |
| 幽港迷城 | `versions[12].children[12].attributes.id` | 2184 |
| 幽港迷城 | `versions[12].children[12].attributes.value` | English |
| 幽港迷城 | `versions[13].tag` | item |
| 幽港迷城 | `versions[13].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[13].attributes.id` | 268248 |
| 幽港迷城 | `versions[13].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[13].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[13].children[1].tag` | image |
| 幽港迷城 | `versions[13].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[13].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[13].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[13].children[3].tag` | link |
| 幽港迷城 | `versions[13].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[13].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[13].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[13].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[13].children[4].tag` | name |
| 幽港迷城 | `versions[13].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[13].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[13].children[4].attributes.value` | English miniatures edition |
| 幽港迷城 | `versions[13].children[5].tag` | link |
| 幽港迷城 | `versions[13].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[13].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[13].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[13].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[13].children[6].attributes.value` | 2017 |
| 幽港迷城 | `versions[13].children[7].tag` | productcode |
| 幽港迷城 | `versions[13].children[7].attributes.value` | CPH0204 |
| 幽港迷城 | `versions[13].children[8].tag` | width |
| 幽港迷城 | `versions[13].children[8].attributes.value` | 11.5 |
| 幽港迷城 | `versions[13].children[9].tag` | length |
| 幽港迷城 | `versions[13].children[9].attributes.value` | 16 |
| 幽港迷城 | `versions[13].children[10].tag` | depth |
| 幽港迷城 | `versions[13].children[10].attributes.value` | 7.5 |
| 幽港迷城 | `versions[13].children[11].tag` | weight |
| 幽港迷城 | `versions[13].children[11].attributes.value` | 19 |
| 幽港迷城 | `versions[13].children[12].tag` | link |
| 幽港迷城 | `versions[13].children[12].attributes.type` | language |
| 幽港迷城 | `versions[13].children[12].attributes.id` | 2184 |
| 幽港迷城 | `versions[13].children[12].attributes.value` | English |
| 幽港迷城 | `versions[14].tag` | item |
| 幽港迷城 | `versions[14].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[14].attributes.id` | 331119 |
| 幽港迷城 | `versions[14].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[14].children[0].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__small/img/veqFeP4d_3zNhFc3GNBkV95rBEQ=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg |
| 幽港迷城 | `versions[14].children[1].tag` | image |
| 幽港迷城 | `versions[14].children[1].text` | https://cf.geekdo-images.com/sZYp_3BTDGjh2unaZfZmuA__original/img/7d-lj5Gd1e8PFnD97LYFah2c45M=/0x0/filters:format(jpeg)/pic2437871.jpg |
| 幽港迷城 | `versions[14].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[14].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[14].children[3].tag` | link |
| 幽港迷城 | `versions[14].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[14].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[14].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[14].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[14].children[4].tag` | name |
| 幽港迷城 | `versions[14].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[14].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[14].children[4].attributes.value` | English standees edition |
| 幽港迷城 | `versions[14].children[5].tag` | link |
| 幽港迷城 | `versions[14].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[14].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[14].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[14].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[14].children[6].attributes.value` | 2017 |
| 幽港迷城 | `versions[14].children[7].tag` | productcode |
| 幽港迷城 | `versions[14].children[7].attributes.value` | CPH0201 |
| 幽港迷城 | `versions[14].children[8].tag` | width |
| 幽港迷城 | `versions[14].children[8].attributes.value` | 16 |
| 幽港迷城 | `versions[14].children[9].tag` | length |
| 幽港迷城 | `versions[14].children[9].attributes.value` | 11.5 |
| 幽港迷城 | `versions[14].children[10].tag` | depth |
| 幽港迷城 | `versions[14].children[10].attributes.value` | 7.5 |
| 幽港迷城 | `versions[14].children[11].tag` | weight |
| 幽港迷城 | `versions[14].children[11].attributes.value` | 19 |
| 幽港迷城 | `versions[14].children[12].tag` | link |
| 幽港迷城 | `versions[14].children[12].attributes.type` | language |
| 幽港迷城 | `versions[14].children[12].attributes.id` | 2184 |
| 幽港迷城 | `versions[14].children[12].attributes.value` | English |
| 幽港迷城 | `versions[15].tag` | item |
| 幽港迷城 | `versions[15].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[15].attributes.id` | 475996 |
| 幽港迷城 | `versions[15].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[15].children[0].text` | https://cf.geekdo-images.com/41SoSCaCuoeqqhgykO5DgA__small/img/i2RVzlC-OoMrlxdFUK4o5fyLgaE=/fit-in/200x150/filters:strip_icc()/pic7236698.jpg |
| 幽港迷城 | `versions[15].children[1].tag` | image |
| 幽港迷城 | `versions[15].children[1].text` | https://cf.geekdo-images.com/41SoSCaCuoeqqhgykO5DgA__original/img/BrCgCuA--pRnG4aKP2fpof597kE=/0x0/filters:format(jpeg)/pic7236698.jpg |
| 幽港迷城 | `versions[15].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[15].children[2].attributes.value` | Gloomhaven: Aventures à Havrenuit |
| 幽港迷城 | `versions[15].children[3].tag` | link |
| 幽港迷城 | `versions[15].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[15].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[15].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[15].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[15].children[4].tag` | name |
| 幽港迷城 | `versions[15].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[15].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[15].children[4].attributes.value` | French edition |
| 幽港迷城 | `versions[15].children[5].tag` | link |
| 幽港迷城 | `versions[15].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[15].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[15].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[15].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[15].children[6].attributes.value` | 2019 |
| 幽港迷城 | `versions[15].children[7].tag` | productcode |
| 幽港迷城 | `versions[15].children[7].attributes.value` |  |
| 幽港迷城 | `versions[15].children[8].tag` | width |
| 幽港迷城 | `versions[15].children[8].attributes.value` | 0 |
| 幽港迷城 | `versions[15].children[9].tag` | length |
| 幽港迷城 | `versions[15].children[9].attributes.value` | 0 |
| 幽港迷城 | `versions[15].children[10].tag` | depth |
| 幽港迷城 | `versions[15].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[15].children[11].tag` | weight |
| 幽港迷城 | `versions[15].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[15].children[12].tag` | link |
| 幽港迷城 | `versions[15].children[12].attributes.type` | language |
| 幽港迷城 | `versions[15].children[12].attributes.id` | 2187 |
| 幽港迷城 | `versions[15].children[12].attributes.value` | French |
| 幽港迷城 | `versions[16].tag` | item |
| 幽港迷城 | `versions[16].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[16].attributes.id` | 399953 |
| 幽港迷城 | `versions[16].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[16].children[0].text` | https://cf.geekdo-images.com/F5Pp4c30mMwEOo_qTdQqkA__small/img/wY7ypqdghzONwNzpbSomzy8eX28=/fit-in/200x150/filters:strip_icc()/pic4162536.jpg |
| 幽港迷城 | `versions[16].children[1].tag` | image |
| 幽港迷城 | `versions[16].children[1].text` | https://cf.geekdo-images.com/F5Pp4c30mMwEOo_qTdQqkA__original/img/oc_N78LgtO9KV-iBd70omgtHejY=/0x0/filters:format(jpeg)/pic4162536.jpg |
| 幽港迷城 | `versions[16].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[16].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[16].children[3].tag` | link |
| 幽港迷城 | `versions[16].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[16].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[16].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[16].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[16].children[4].tag` | name |
| 幽港迷城 | `versions[16].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[16].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[16].children[4].attributes.value` | German edition, first printing |
| 幽港迷城 | `versions[16].children[5].tag` | link |
| 幽港迷城 | `versions[16].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[16].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[16].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[16].children[6].tag` | link |
| 幽港迷城 | `versions[16].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[16].children[6].attributes.id` | 22380 |
| 幽港迷城 | `versions[16].children[6].attributes.value` | Feuerland Spiele |
| 幽港迷城 | `versions[16].children[7].tag` | link |
| 幽港迷城 | `versions[16].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[16].children[7].attributes.id` | 77084 |
| 幽港迷城 | `versions[16].children[7].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[16].children[8].tag` | link |
| 幽港迷城 | `versions[16].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[16].children[8].attributes.id` | 78961 |
| 幽港迷城 | `versions[16].children[8].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[16].children[9].tag` | link |
| 幽港迷城 | `versions[16].children[9].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[16].children[9].attributes.id` | 84269 |
| 幽港迷城 | `versions[16].children[9].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[16].children[10].tag` | yearpublished |
| 幽港迷城 | `versions[16].children[10].attributes.value` | 2018 |
| 幽港迷城 | `versions[16].children[11].tag` | productcode |
| 幽港迷城 | `versions[16].children[11].attributes.value` |  |
| 幽港迷城 | `versions[16].children[12].tag` | width |
| 幽港迷城 | `versions[16].children[12].attributes.value` | 11.5 |
| 幽港迷城 | `versions[16].children[13].tag` | length |
| 幽港迷城 | `versions[16].children[13].attributes.value` | 16 |
| 幽港迷城 | `versions[16].children[14].tag` | depth |
| 幽港迷城 | `versions[16].children[14].attributes.value` | 7.5 |
| 幽港迷城 | `versions[16].children[15].tag` | weight |
| 幽港迷城 | `versions[16].children[15].attributes.value` | 0 |
| 幽港迷城 | `versions[16].children[16].tag` | link |
| 幽港迷城 | `versions[16].children[16].attributes.type` | language |
| 幽港迷城 | `versions[16].children[16].attributes.id` | 2188 |
| 幽港迷城 | `versions[16].children[16].attributes.value` | German |
| 幽港迷城 | `versions[17].tag` | item |
| 幽港迷城 | `versions[17].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[17].attributes.id` | 466963 |
| 幽港迷城 | `versions[17].children[0].tag` | canonicalname |
| 幽港迷城 | `versions[17].children[0].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[17].children[1].tag` | link |
| 幽港迷城 | `versions[17].children[1].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[17].children[1].attributes.id` | 174430 |
| 幽港迷城 | `versions[17].children[1].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[17].children[1].attributes.inbound` | true |
| 幽港迷城 | `versions[17].children[2].tag` | name |
| 幽港迷城 | `versions[17].children[2].attributes.type` | primary |
| 幽港迷城 | `versions[17].children[2].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[17].children[2].attributes.value` | German edition, second printing |
| 幽港迷城 | `versions[17].children[3].tag` | link |
| 幽港迷城 | `versions[17].children[3].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[17].children[3].attributes.id` | 27425 |
| 幽港迷城 | `versions[17].children[3].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[17].children[4].tag` | link |
| 幽港迷城 | `versions[17].children[4].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[17].children[4].attributes.id` | 22380 |
| 幽港迷城 | `versions[17].children[4].attributes.value` | Feuerland Spiele |
| 幽港迷城 | `versions[17].children[5].tag` | link |
| 幽港迷城 | `versions[17].children[5].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[17].children[5].attributes.id` | 77084 |
| 幽港迷城 | `versions[17].children[5].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[17].children[6].tag` | link |
| 幽港迷城 | `versions[17].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[17].children[6].attributes.id` | 78961 |
| 幽港迷城 | `versions[17].children[6].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[17].children[7].tag` | link |
| 幽港迷城 | `versions[17].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[17].children[7].attributes.id` | 84269 |
| 幽港迷城 | `versions[17].children[7].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[17].children[8].tag` | yearpublished |
| 幽港迷城 | `versions[17].children[8].attributes.value` | 2019 |
| 幽港迷城 | `versions[17].children[9].tag` | productcode |
| 幽港迷城 | `versions[17].children[9].attributes.value` |  |
| 幽港迷城 | `versions[17].children[10].tag` | width |
| 幽港迷城 | `versions[17].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[17].children[11].tag` | length |
| 幽港迷城 | `versions[17].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[17].children[12].tag` | depth |
| 幽港迷城 | `versions[17].children[12].attributes.value` | 0 |
| 幽港迷城 | `versions[17].children[13].tag` | weight |
| 幽港迷城 | `versions[17].children[13].attributes.value` | 0 |
| 幽港迷城 | `versions[17].children[14].tag` | link |
| 幽港迷城 | `versions[17].children[14].attributes.type` | language |
| 幽港迷城 | `versions[17].children[14].attributes.id` | 2188 |
| 幽港迷城 | `versions[17].children[14].attributes.value` | German |
| 幽港迷城 | `versions[18].tag` | item |
| 幽港迷城 | `versions[18].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[18].attributes.id` | 596972 |
| 幽港迷城 | `versions[18].children[0].tag` | canonicalname |
| 幽港迷城 | `versions[18].children[0].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[18].children[1].tag` | link |
| 幽港迷城 | `versions[18].children[1].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[18].children[1].attributes.id` | 174430 |
| 幽港迷城 | `versions[18].children[1].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[18].children[1].attributes.inbound` | true |
| 幽港迷城 | `versions[18].children[2].tag` | name |
| 幽港迷城 | `versions[18].children[2].attributes.type` | primary |
| 幽港迷城 | `versions[18].children[2].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[18].children[2].attributes.value` | German edition, third printing |
| 幽港迷城 | `versions[18].children[3].tag` | link |
| 幽港迷城 | `versions[18].children[3].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[18].children[3].attributes.id` | 27425 |
| 幽港迷城 | `versions[18].children[3].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[18].children[4].tag` | link |
| 幽港迷城 | `versions[18].children[4].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[18].children[4].attributes.id` | 22380 |
| 幽港迷城 | `versions[18].children[4].attributes.value` | Feuerland Spiele |
| 幽港迷城 | `versions[18].children[5].tag` | yearpublished |
| 幽港迷城 | `versions[18].children[5].attributes.value` | 2020 |
| 幽港迷城 | `versions[18].children[6].tag` | productcode |
| 幽港迷城 | `versions[18].children[6].attributes.value` |  |
| 幽港迷城 | `versions[18].children[7].tag` | width |
| 幽港迷城 | `versions[18].children[7].attributes.value` | 11.5 |
| 幽港迷城 | `versions[18].children[8].tag` | length |
| 幽港迷城 | `versions[18].children[8].attributes.value` | 16 |
| 幽港迷城 | `versions[18].children[9].tag` | depth |
| 幽港迷城 | `versions[18].children[9].attributes.value` | 7.5 |
| 幽港迷城 | `versions[18].children[10].tag` | weight |
| 幽港迷城 | `versions[18].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[18].children[11].tag` | link |
| 幽港迷城 | `versions[18].children[11].attributes.type` | language |
| 幽港迷城 | `versions[18].children[11].attributes.id` | 2188 |
| 幽港迷城 | `versions[18].children[11].attributes.value` | German |
| 幽港迷城 | `versions[19].tag` | item |
| 幽港迷城 | `versions[19].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[19].attributes.id` | 441836 |
| 幽港迷城 | `versions[19].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[19].children[0].text` | https://cf.geekdo-images.com/-kwTbAYnheusSGa3pKZ6jg__small/img/Ki1kfkuDTHAXyY6H57nlHgMMmu8=/fit-in/200x150/filters:strip_icc()/pic5228234.jpg |
| 幽港迷城 | `versions[19].children[1].tag` | image |
| 幽港迷城 | `versions[19].children[1].text` | https://cf.geekdo-images.com/-kwTbAYnheusSGa3pKZ6jg__original/img/nsAqJxgAKJA1AY-UVJyLRhUaNYY=/0x0/filters:format(jpeg)/pic5228234.jpg |
| 幽港迷城 | `versions[19].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[19].children[2].attributes.value` | Homályrév |
| 幽港迷城 | `versions[19].children[3].tag` | link |
| 幽港迷城 | `versions[19].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[19].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[19].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[19].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[19].children[4].tag` | name |
| 幽港迷城 | `versions[19].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[19].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[19].children[4].attributes.value` | Hungarian edition |
| 幽港迷城 | `versions[19].children[5].tag` | link |
| 幽港迷城 | `versions[19].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[19].children[5].attributes.id` | 8820 |
| 幽港迷城 | `versions[19].children[5].attributes.value` | Gémklub |
| 幽港迷城 | `versions[19].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[19].children[6].attributes.value` | 2019 |
| 幽港迷城 | `versions[19].children[7].tag` | productcode |
| 幽港迷城 | `versions[19].children[7].attributes.value` |  |
| 幽港迷城 | `versions[19].children[8].tag` | width |
| 幽港迷城 | `versions[19].children[8].attributes.value` | 16 |
| 幽港迷城 | `versions[19].children[9].tag` | length |
| 幽港迷城 | `versions[19].children[9].attributes.value` | 11.5 |
| 幽港迷城 | `versions[19].children[10].tag` | depth |
| 幽港迷城 | `versions[19].children[10].attributes.value` | 7.5 |
| 幽港迷城 | `versions[19].children[11].tag` | weight |
| 幽港迷城 | `versions[19].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[19].children[12].tag` | link |
| 幽港迷城 | `versions[19].children[12].attributes.type` | language |
| 幽港迷城 | `versions[19].children[12].attributes.id` | 2191 |
| 幽港迷城 | `versions[19].children[12].attributes.value` | Hungarian |
| 幽港迷城 | `versions[20].tag` | item |
| 幽港迷城 | `versions[20].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[20].attributes.id` | 448521 |
| 幽港迷城 | `versions[20].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[20].children[0].text` | https://cf.geekdo-images.com/muHI8OKuXqj_nFgwfwE1Cg__small/img/ypXwEcL_kwQ76Hvqo6M0GVAy2JY=/fit-in/200x150/filters:strip_icc()/pic6164676.jpg |
| 幽港迷城 | `versions[20].children[1].tag` | image |
| 幽港迷城 | `versions[20].children[1].text` | https://cf.geekdo-images.com/muHI8OKuXqj_nFgwfwE1Cg__original/img/YifnItDahAn1X9FgRH7Bc_TYkOI=/0x0/filters:format(jpeg)/pic6164676.jpg |
| 幽港迷城 | `versions[20].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[20].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[20].children[3].tag` | link |
| 幽港迷城 | `versions[20].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[20].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[20].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[20].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[20].children[4].tag` | name |
| 幽港迷城 | `versions[20].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[20].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[20].children[4].attributes.value` | Italian edition |
| 幽港迷城 | `versions[20].children[5].tag` | link |
| 幽港迷城 | `versions[20].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[20].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[20].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[20].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[20].children[6].attributes.value` | 2020 |
| 幽港迷城 | `versions[20].children[7].tag` | productcode |
| 幽港迷城 | `versions[20].children[7].attributes.value` |  |
| 幽港迷城 | `versions[20].children[8].tag` | width |
| 幽港迷城 | `versions[20].children[8].attributes.value` | 0 |
| 幽港迷城 | `versions[20].children[9].tag` | length |
| 幽港迷城 | `versions[20].children[9].attributes.value` | 0 |
| 幽港迷城 | `versions[20].children[10].tag` | depth |
| 幽港迷城 | `versions[20].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[20].children[11].tag` | weight |
| 幽港迷城 | `versions[20].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[20].children[12].tag` | link |
| 幽港迷城 | `versions[20].children[12].attributes.type` | language |
| 幽港迷城 | `versions[20].children[12].attributes.id` | 2193 |
| 幽港迷城 | `versions[20].children[12].attributes.value` | Italian |
| 幽港迷城 | `versions[21].tag` | item |
| 幽港迷城 | `versions[21].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[21].attributes.id` | 554544 |
| 幽港迷城 | `versions[21].children[0].tag` | canonicalname |
| 幽港迷城 | `versions[21].children[0].attributes.value` | グルームヘイヴン |
| 幽港迷城 | `versions[21].children[1].tag` | link |
| 幽港迷城 | `versions[21].children[1].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[21].children[1].attributes.id` | 174430 |
| 幽港迷城 | `versions[21].children[1].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[21].children[1].attributes.inbound` | true |
| 幽港迷城 | `versions[21].children[2].tag` | name |
| 幽港迷城 | `versions[21].children[2].attributes.type` | primary |
| 幽港迷城 | `versions[21].children[2].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[21].children[2].attributes.value` | Japanese edition |
| 幽港迷城 | `versions[21].children[3].tag` | link |
| 幽港迷城 | `versions[21].children[3].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[21].children[3].attributes.id` | 3475 |
| 幽港迷城 | `versions[21].children[3].attributes.value` | Arclight Games |
| 幽港迷城 | `versions[21].children[4].tag` | link |
| 幽港迷城 | `versions[21].children[4].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[21].children[4].attributes.id` | 27425 |
| 幽港迷城 | `versions[21].children[4].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[21].children[5].tag` | yearpublished |
| 幽港迷城 | `versions[21].children[5].attributes.value` | 2019 |
| 幽港迷城 | `versions[21].children[6].tag` | productcode |
| 幽港迷城 | `versions[21].children[6].attributes.value` |  |
| 幽港迷城 | `versions[21].children[7].tag` | width |
| 幽港迷城 | `versions[21].children[7].attributes.value` | 11.811 |
| 幽港迷城 | `versions[21].children[8].tag` | length |
| 幽港迷城 | `versions[21].children[8].attributes.value` | 16.1417 |
| 幽港迷城 | `versions[21].children[9].tag` | depth |
| 幽港迷城 | `versions[21].children[9].attributes.value` | 7.48031 |
| 幽港迷城 | `versions[21].children[10].tag` | weight |
| 幽港迷城 | `versions[21].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[21].children[11].tag` | link |
| 幽港迷城 | `versions[21].children[11].attributes.type` | language |
| 幽港迷城 | `versions[21].children[11].attributes.id` | 2194 |
| 幽港迷城 | `versions[21].children[11].attributes.value` | Japanese |
| 幽港迷城 | `versions[22].tag` | item |
| 幽港迷城 | `versions[22].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[22].attributes.id` | 455813 |
| 幽港迷城 | `versions[22].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[22].children[0].text` | https://cf.geekdo-images.com/udOip6FFDVAWwWTLX2kq2Q__small/img/qGsYhW8CWyF-O1j2Fs3XP4e6qBU=/fit-in/200x150/filters:strip_icc()/pic4986163.png |
| 幽港迷城 | `versions[22].children[1].tag` | image |
| 幽港迷城 | `versions[22].children[1].text` | https://cf.geekdo-images.com/udOip6FFDVAWwWTLX2kq2Q__original/img/jSZMlTQ8bcvo5JpUGcVPOCqUkWU=/0x0/filters:format(png)/pic4986163.png |
| 幽港迷城 | `versions[22].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[22].children[2].attributes.value` | 글룸헤이븐 |
| 幽港迷城 | `versions[22].children[3].tag` | link |
| 幽港迷城 | `versions[22].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[22].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[22].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[22].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[22].children[4].tag` | name |
| 幽港迷城 | `versions[22].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[22].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[22].children[4].attributes.value` | Korean edition |
| 幽港迷城 | `versions[22].children[5].tag` | link |
| 幽港迷城 | `versions[22].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[22].children[5].attributes.id` | 8291 |
| 幽港迷城 | `versions[22].children[5].attributes.value` | Korea Boardgames |
| 幽港迷城 | `versions[22].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[22].children[6].attributes.value` | 2020 |
| 幽港迷城 | `versions[22].children[7].tag` | productcode |
| 幽港迷城 | `versions[22].children[7].attributes.value` |  |
| 幽港迷城 | `versions[22].children[8].tag` | width |
| 幽港迷城 | `versions[22].children[8].attributes.value` | 0 |
| 幽港迷城 | `versions[22].children[9].tag` | length |
| 幽港迷城 | `versions[22].children[9].attributes.value` | 0 |
| 幽港迷城 | `versions[22].children[10].tag` | depth |
| 幽港迷城 | `versions[22].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[22].children[11].tag` | weight |
| 幽港迷城 | `versions[22].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[22].children[12].tag` | link |
| 幽港迷城 | `versions[22].children[12].attributes.type` | language |
| 幽港迷城 | `versions[22].children[12].attributes.id` | 2195 |
| 幽港迷城 | `versions[22].children[12].attributes.value` | Korean |
| 幽港迷城 | `versions[23].tag` | item |
| 幽港迷城 | `versions[23].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[23].attributes.id` | 424523 |
| 幽港迷城 | `versions[23].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[23].children[0].text` | https://cf.geekdo-images.com/OpNha0U5Q-zoy5x1UQUi4g__small/img/izvyngFgS6loXrHiSllZe98vjiE=/fit-in/200x150/filters:strip_icc()/pic4994169.jpg |
| 幽港迷城 | `versions[23].children[1].tag` | image |
| 幽港迷城 | `versions[23].children[1].text` | https://cf.geekdo-images.com/OpNha0U5Q-zoy5x1UQUi4g__original/img/LwWWDwftx_a_KaZDX5dBpJW5S4c=/0x0/filters:format(jpeg)/pic4994169.jpg |
| 幽港迷城 | `versions[23].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[23].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[23].children[3].tag` | link |
| 幽港迷城 | `versions[23].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[23].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[23].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[23].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[23].children[4].tag` | name |
| 幽港迷城 | `versions[23].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[23].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[23].children[4].attributes.value` | Polish edition |
| 幽港迷城 | `versions[23].children[5].tag` | link |
| 幽港迷城 | `versions[23].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[23].children[5].attributes.id` | 46179 |
| 幽港迷城 | `versions[23].children[5].attributes.value` | Albi Polska |
| 幽港迷城 | `versions[23].children[6].tag` | link |
| 幽港迷城 | `versions[23].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[23].children[6].attributes.id` | 27425 |
| 幽港迷城 | `versions[23].children[6].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[23].children[7].tag` | yearpublished |
| 幽港迷城 | `versions[23].children[7].attributes.value` | 2019 |
| 幽港迷城 | `versions[23].children[8].tag` | productcode |
| 幽港迷城 | `versions[23].children[8].attributes.value` |  |
| 幽港迷城 | `versions[23].children[9].tag` | width |
| 幽港迷城 | `versions[23].children[9].attributes.value` | 16 |
| 幽港迷城 | `versions[23].children[10].tag` | length |
| 幽港迷城 | `versions[23].children[10].attributes.value` | 11.5 |
| 幽港迷城 | `versions[23].children[11].tag` | depth |
| 幽港迷城 | `versions[23].children[11].attributes.value` | 7.5 |
| 幽港迷城 | `versions[23].children[12].tag` | weight |
| 幽港迷城 | `versions[23].children[12].attributes.value` | 19 |
| 幽港迷城 | `versions[23].children[13].tag` | link |
| 幽港迷城 | `versions[23].children[13].attributes.type` | language |
| 幽港迷城 | `versions[23].children[13].attributes.id` | 2199 |
| 幽港迷城 | `versions[23].children[13].attributes.value` | Polish |
| 幽港迷城 | `versions[24].tag` | item |
| 幽港迷城 | `versions[24].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[24].attributes.id` | 507879 |
| 幽港迷城 | `versions[24].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[24].children[0].text` | https://cf.geekdo-images.com/4aL8zNftQTe8DYSyCDK8xA__small/img/A2PIsmCWumD9Gp54ia9Ya8nrFkw=/fit-in/200x150/filters:strip_icc()/pic8132497.jpg |
| 幽港迷城 | `versions[24].children[1].tag` | image |
| 幽港迷城 | `versions[24].children[1].text` | https://cf.geekdo-images.com/4aL8zNftQTe8DYSyCDK8xA__original/img/lnORvYhrN9UjRPUaeuyZAgmK3wo=/0x0/filters:format(jpeg)/pic8132497.jpg |
| 幽港迷城 | `versions[24].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[24].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[24].children[3].tag` | link |
| 幽港迷城 | `versions[24].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[24].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[24].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[24].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[24].children[4].tag` | name |
| 幽港迷城 | `versions[24].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[24].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[24].children[4].attributes.value` | Portuguese edition |
| 幽港迷城 | `versions[24].children[5].tag` | link |
| 幽港迷城 | `versions[24].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[24].children[5].attributes.id` | 15605 |
| 幽港迷城 | `versions[24].children[5].attributes.value` | Galápagos Jogos |
| 幽港迷城 | `versions[24].children[6].tag` | link |
| 幽港迷城 | `versions[24].children[6].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[24].children[6].attributes.id` | 77084 |
| 幽港迷城 | `versions[24].children[6].attributes.value` | Alexandr Elichev |
| 幽港迷城 | `versions[24].children[7].tag` | link |
| 幽港迷城 | `versions[24].children[7].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[24].children[7].attributes.id` | 78961 |
| 幽港迷城 | `versions[24].children[7].attributes.value` | Josh T. McDowell |
| 幽港迷城 | `versions[24].children[8].tag` | link |
| 幽港迷城 | `versions[24].children[8].attributes.type` | boardgameartist |
| 幽港迷城 | `versions[24].children[8].attributes.id` | 84269 |
| 幽港迷城 | `versions[24].children[8].attributes.value` | Alvaro Nebot |
| 幽港迷城 | `versions[24].children[9].tag` | yearpublished |
| 幽港迷城 | `versions[24].children[9].attributes.value` | 2020 |
| 幽港迷城 | `versions[24].children[10].tag` | productcode |
| 幽港迷城 | `versions[24].children[10].attributes.value` |  |
| 幽港迷城 | `versions[24].children[11].tag` | width |
| 幽港迷城 | `versions[24].children[11].attributes.value` | 16.1417 |
| 幽港迷城 | `versions[24].children[12].tag` | length |
| 幽港迷城 | `versions[24].children[12].attributes.value` | 11.811 |
| 幽港迷城 | `versions[24].children[13].tag` | depth |
| 幽港迷城 | `versions[24].children[13].attributes.value` | 7.48031 |
| 幽港迷城 | `versions[24].children[14].tag` | weight |
| 幽港迷城 | `versions[24].children[14].attributes.value` | 22.0462 |
| 幽港迷城 | `versions[24].children[15].tag` | link |
| 幽港迷城 | `versions[24].children[15].attributes.type` | language |
| 幽港迷城 | `versions[24].children[15].attributes.id` | 2200 |
| 幽港迷城 | `versions[24].children[15].attributes.value` | Portuguese |
| 幽港迷城 | `versions[25].tag` | item |
| 幽港迷城 | `versions[25].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[25].attributes.id` | 388684 |
| 幽港迷城 | `versions[25].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[25].children[0].text` | https://cf.geekdo-images.com/-H30MgGVk0hcdCDpGT4_gQ__small/img/_Nx6SciYWb6l3yFOF09FOpz8liw=/fit-in/200x150/filters:strip_icc()/pic4429564.jpg |
| 幽港迷城 | `versions[25].children[1].tag` | image |
| 幽港迷城 | `versions[25].children[1].text` | https://cf.geekdo-images.com/-H30MgGVk0hcdCDpGT4_gQ__original/img/dalVMioqeqRfJwTprET52pHU9PI=/0x0/filters:format(jpeg)/pic4429564.jpg |
| 幽港迷城 | `versions[25].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[25].children[2].attributes.value` | Gloomhaven: Мрачная Гавань |
| 幽港迷城 | `versions[25].children[3].tag` | link |
| 幽港迷城 | `versions[25].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[25].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[25].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[25].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[25].children[4].tag` | name |
| 幽港迷城 | `versions[25].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[25].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[25].children[4].attributes.value` | Russian edition |
| 幽港迷城 | `versions[25].children[5].tag` | link |
| 幽港迷城 | `versions[25].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[25].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[25].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[25].children[6].tag` | link |
| 幽港迷城 | `versions[25].children[6].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[25].children[6].attributes.id` | 18852 |
| 幽港迷城 | `versions[25].children[6].attributes.value` | Hobby World |
| 幽港迷城 | `versions[25].children[7].tag` | yearpublished |
| 幽港迷城 | `versions[25].children[7].attributes.value` | 2018 |
| 幽港迷城 | `versions[25].children[8].tag` | productcode |
| 幽港迷城 | `versions[25].children[8].attributes.value` |  |
| 幽港迷城 | `versions[25].children[9].tag` | width |
| 幽港迷城 | `versions[25].children[9].attributes.value` | 16 |
| 幽港迷城 | `versions[25].children[10].tag` | length |
| 幽港迷城 | `versions[25].children[10].attributes.value` | 11.5 |
| 幽港迷城 | `versions[25].children[11].tag` | depth |
| 幽港迷城 | `versions[25].children[11].attributes.value` | 7.5 |
| 幽港迷城 | `versions[25].children[12].tag` | weight |
| 幽港迷城 | `versions[25].children[12].attributes.value` | 19 |
| 幽港迷城 | `versions[25].children[13].tag` | link |
| 幽港迷城 | `versions[25].children[13].attributes.type` | language |
| 幽港迷城 | `versions[25].children[13].attributes.id` | 2202 |
| 幽港迷城 | `versions[25].children[13].attributes.value` | Russian |
| 幽港迷城 | `versions[26].tag` | item |
| 幽港迷城 | `versions[26].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[26].attributes.id` | 447572 |
| 幽港迷城 | `versions[26].children[0].tag` | canonicalname |
| 幽港迷城 | `versions[26].children[0].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[26].children[1].tag` | link |
| 幽港迷城 | `versions[26].children[1].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[26].children[1].attributes.id` | 174430 |
| 幽港迷城 | `versions[26].children[1].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[26].children[1].attributes.inbound` | true |
| 幽港迷城 | `versions[26].children[2].tag` | name |
| 幽港迷城 | `versions[26].children[2].attributes.type` | primary |
| 幽港迷城 | `versions[26].children[2].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[26].children[2].attributes.value` | Spanish edition, first printing |
| 幽港迷城 | `versions[26].children[3].tag` | link |
| 幽港迷城 | `versions[26].children[3].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[26].children[3].attributes.id` | 27425 |
| 幽港迷城 | `versions[26].children[3].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[26].children[4].tag` | yearpublished |
| 幽港迷城 | `versions[26].children[4].attributes.value` | 2019 |
| 幽港迷城 | `versions[26].children[5].tag` | productcode |
| 幽港迷城 | `versions[26].children[5].attributes.value` | CPHGH01ES |
| 幽港迷城 | `versions[26].children[6].tag` | width |
| 幽港迷城 | `versions[26].children[6].attributes.value` | 7.48031 |
| 幽港迷城 | `versions[26].children[7].tag` | length |
| 幽港迷城 | `versions[26].children[7].attributes.value` | 16.2008 |
| 幽港迷城 | `versions[26].children[8].tag` | depth |
| 幽港迷城 | `versions[26].children[8].attributes.value` | 11.811 |
| 幽港迷城 | `versions[26].children[9].tag` | weight |
| 幽港迷城 | `versions[26].children[9].attributes.value` | 20.2825 |
| 幽港迷城 | `versions[26].children[10].tag` | link |
| 幽港迷城 | `versions[26].children[10].attributes.type` | language |
| 幽港迷城 | `versions[26].children[10].attributes.id` | 2203 |
| 幽港迷城 | `versions[26].children[10].attributes.value` | Spanish |
| 幽港迷城 | `versions[27].tag` | item |
| 幽港迷城 | `versions[27].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[27].attributes.id` | 569024 |
| 幽港迷城 | `versions[27].children[0].tag` | thumbnail |
| 幽港迷城 | `versions[27].children[0].text` | https://cf.geekdo-images.com/muHI8OKuXqj_nFgwfwE1Cg__small/img/ypXwEcL_kwQ76Hvqo6M0GVAy2JY=/fit-in/200x150/filters:strip_icc()/pic6164676.jpg |
| 幽港迷城 | `versions[27].children[1].tag` | image |
| 幽港迷城 | `versions[27].children[1].text` | https://cf.geekdo-images.com/muHI8OKuXqj_nFgwfwE1Cg__original/img/YifnItDahAn1X9FgRH7Bc_TYkOI=/0x0/filters:format(jpeg)/pic6164676.jpg |
| 幽港迷城 | `versions[27].children[2].tag` | canonicalname |
| 幽港迷城 | `versions[27].children[2].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[27].children[3].tag` | link |
| 幽港迷城 | `versions[27].children[3].attributes.type` | boardgameversion |
| 幽港迷城 | `versions[27].children[3].attributes.id` | 174430 |
| 幽港迷城 | `versions[27].children[3].attributes.value` | Gloomhaven |
| 幽港迷城 | `versions[27].children[3].attributes.inbound` | true |
| 幽港迷城 | `versions[27].children[4].tag` | name |
| 幽港迷城 | `versions[27].children[4].attributes.type` | primary |
| 幽港迷城 | `versions[27].children[4].attributes.sortindex` | 1 |
| 幽港迷城 | `versions[27].children[4].attributes.value` | Spanish edition, second printing |
| 幽港迷城 | `versions[27].children[5].tag` | link |
| 幽港迷城 | `versions[27].children[5].attributes.type` | boardgamepublisher |
| 幽港迷城 | `versions[27].children[5].attributes.id` | 27425 |
| 幽港迷城 | `versions[27].children[5].attributes.value` | Cephalofair Games |
| 幽港迷城 | `versions[27].children[6].tag` | yearpublished |
| 幽港迷城 | `versions[27].children[6].attributes.value` | 2021 |
| 幽港迷城 | `versions[27].children[7].tag` | productcode |
| 幽港迷城 | `versions[27].children[7].attributes.value` | CPHGH01ES |
| 幽港迷城 | `versions[27].children[8].tag` | width |
| 幽港迷城 | `versions[27].children[8].attributes.value` | 0 |
| 幽港迷城 | `versions[27].children[9].tag` | length |
| 幽港迷城 | `versions[27].children[9].attributes.value` | 0 |
| 幽港迷城 | `versions[27].children[10].tag` | depth |
| 幽港迷城 | `versions[27].children[10].attributes.value` | 0 |
| 幽港迷城 | `versions[27].children[11].tag` | weight |
| 幽港迷城 | `versions[27].children[11].attributes.value` | 0 |
| 幽港迷城 | `versions[27].children[12].tag` | link |
| 幽港迷城 | `versions[27].children[12].attributes.type` | language |
| 幽港迷城 | `versions[27].children[12].attributes.id` | 2203 |
| 幽港迷城 | `versions[27].children[12].attributes.value` | Spanish |
| 幽港迷城 | `videos_count` | 15 |
| 幽港迷城 | `videos[0].id` | 616033 |
| 幽港迷城 | `videos[0].title` | This Gloomhaven Expansion Is Impossible to Find &#124; Trail of Ashes Campaign |
| 幽港迷城 | `videos[0].category` | review |
| 幽港迷城 | `videos[0].language` | English |
| 幽港迷城 | `videos[0].link` | http://www.youtube.com/watch?v=AccI3wbXEOE |
| 幽港迷城 | `videos[0].username` | Quackalope |
| 幽港迷城 | `videos[0].userid` | 1996209 |
| 幽港迷城 | `videos[0].postdate` | 2026-06-14T10:39:32-05:00 |
| 幽港迷城 | `videos[1].id` | 612447 |
| 幽港迷城 | `videos[1].title` | Top 3 Campaign Games Nobody Finishes |
| 幽港迷城 | `videos[1].category` | review |
| 幽港迷城 | `videos[1].language` | English |
| 幽港迷城 | `videos[1].link` | http://www.youtube.com/watch?v=oPRNGdEVZxQ |
| 幽港迷城 | `videos[1].username` | Damondietz |
| 幽港迷城 | `videos[1].userid` | 2295822 |
| 幽港迷城 | `videos[1].postdate` | 2026-05-19T13:26:25-05:00 |
| 幽港迷城 | `videos[2].id` | 604870 |
| 幽港迷城 | `videos[2].title` | Ultimativer Vergleich aller Gloomhaven/Frosthaven Spiele |
| 幽港迷城 | `videos[2].category` | other |
| 幽港迷城 | `videos[2].language` | German |
| 幽港迷城 | `videos[2].link` | http://www.youtube.com/watch?v=B3hjvKvmcP0 |
| 幽港迷城 | `videos[2].username` | Denagogen |
| 幽港迷城 | `videos[2].userid` | 1187454 |
| 幽港迷城 | `videos[2].postdate` | 2026-03-30T04:03:36-05:00 |
| 幽港迷城 | `videos[3].id` | 595181 |
| 幽港迷城 | `videos[3].title` | Unser finales Fazit zu Gloomhaven nach 250 Stunden Spielzeit |
| 幽港迷城 | `videos[3].category` | review |
| 幽港迷城 | `videos[3].language` | German |
| 幽港迷城 | `videos[3].link` | http://www.youtube.com/watch?v=w2LTbO6VMz0 |
| 幽港迷城 | `videos[3].username` | Denagogen |
| 幽港迷城 | `videos[3].userid` | 1187454 |
| 幽港迷城 | `videos[3].postdate` | 2026-01-30T07:03:00-06:00 |
| 幽港迷城 | `videos[4].id` | 591000 |
| 幽港迷城 | `videos[4].title` | Auszugstapel #1: GLOOMHAVEN zieht aus! Warum der Dungeoncrawler nicht mehr bleiben darf! |
| 幽港迷城 | `videos[4].category` | review |
| 幽港迷城 | `videos[4].language` | German |
| 幽港迷城 | `videos[4].link` | http://www.youtube.com/watch?v=aC8-YvIkU5o |
| 幽港迷城 | `videos[4].username` | Melhilion |
| 幽港迷城 | `videos[4].userid` | 1311348 |
| 幽港迷城 | `videos[4].postdate` | 2026-01-05T09:00:43-06:00 |
| 幽港迷城 | `videos[5].id` | 590567 |
| 幽港迷城 | `videos[5].title` | Some Choices We Can't Take Back &#124; Gloomhaven: Trail of Ashes Campaign |
| 幽港迷城 | `videos[5].category` | review |
| 幽港迷城 | `videos[5].language` | English |
| 幽港迷城 | `videos[5].link` | http://www.youtube.com/watch?v=-epC0ZHBv0s |
| 幽港迷城 | `videos[5].username` | Quackalope |
| 幽港迷城 | `videos[5].userid` | 1996209 |
| 幽港迷城 | `videos[5].postdate` | 2026-01-02T09:30:57-06:00 |
| 幽港迷城 | `videos[6].id` | 585697 |
| 幽港迷城 | `videos[6].title` | The SECRET Gloomhaven Expansion MOST Fans Don't Know About! |
| 幽港迷城 | `videos[6].category` | review |
| 幽港迷城 | `videos[6].language` | English |
| 幽港迷城 | `videos[6].link` | http://www.youtube.com/watch?v=76f091qfNVg |
| 幽港迷城 | `videos[6].username` | Quackalope |
| 幽港迷城 | `videos[6].userid` | 1996209 |
| 幽港迷城 | `videos[6].postdate` | 2025-12-01T14:31:15-06:00 |
| 幽港迷城 | `videos[7].id` | 577729 |
| 幽港迷城 | `videos[7].title` | Playing Gloomhaven's SECRET Campaign Alone - The Blacksmith and the Bear |
| 幽港迷城 | `videos[7].category` | review |
| 幽港迷城 | `videos[7].language` | English |
| 幽港迷城 | `videos[7].link` | http://www.youtube.com/watch?v=9BMkaip2Q38 |
| 幽港迷城 | `videos[7].username` | Quackalope |
| 幽港迷城 | `videos[7].userid` | 1996209 |
| 幽港迷城 | `videos[7].postdate` | 2025-10-19T07:40:03-05:00 |
| 幽港迷城 | `videos[8].id` | 575833 |
| 幽港迷城 | `videos[8].title` | The Room Of Pain! Gloominati! [4] |
| 幽港迷城 | `videos[8].category` | session |
| 幽港迷城 | `videos[8].language` | English |
| 幽港迷城 | `videos[8].link` | http://www.youtube.com/watch?v=63PJOHF_zxc |
| 幽港迷城 | `videos[8].username` | Gawyjo |
| 幽港迷城 | `videos[8].userid` | 2940068 |
| 幽港迷城 | `videos[8].postdate` | 2025-10-07T14:34:34-05:00 |
| 幽港迷城 | `videos[9].id` | 574691 |
| 幽港迷城 | `videos[9].title` | The Corridor Of Doom! Gloominati! [3] |
| 幽港迷城 | `videos[9].category` | session |
| 幽港迷城 | `videos[9].language` | English |
| 幽港迷城 | `videos[9].link` | http://www.youtube.com/watch?v=XrVAlGCUsnY |
| 幽港迷城 | `videos[9].username` | Gawyjo |
| 幽港迷城 | `videos[9].userid` | 2940068 |
| 幽港迷城 | `videos[9].postdate` | 2025-09-30T15:50:38-05:00 |
| 幽港迷城 | `videos[10].id` | 573453 |
| 幽港迷城 | `videos[10].title` | Unearthing Hidden Documents! Gloominati! [2] |
| 幽港迷城 | `videos[10].category` | session |
| 幽港迷城 | `videos[10].language` | English |
| 幽港迷城 | `videos[10].link` | http://www.youtube.com/watch?v=CFXwdNC6f4s |
| 幽港迷城 | `videos[10].username` | Gawyjo |
| 幽港迷城 | `videos[10].userid` | 2940068 |
| 幽港迷城 | `videos[10].postdate` | 2025-09-23T14:40:28-05:00 |
| 幽港迷城 | `videos[11].id` | 572331 |
| 幽港迷城 | `videos[11].title` | Gloomhaven's Biggest Conspiracy! Gloominati [1] |
| 幽港迷城 | `videos[11].category` | session |
| 幽港迷城 | `videos[11].language` | English |
| 幽港迷城 | `videos[11].link` | http://www.youtube.com/watch?v=fuUpD1hLsn8 |
| 幽港迷城 | `videos[11].username` | Gawyjo |
| 幽港迷城 | `videos[11].userid` | 2940068 |
| 幽港迷城 | `videos[11].postdate` | 2025-09-16T14:35:47-05:00 |
| 幽港迷城 | `videos[12].id` | 569351 |
| 幽港迷城 | `videos[12].title` | The FINAL SCENARIO! Gloomhaven Scenario 51 |
| 幽港迷城 | `videos[12].category` | session |
| 幽港迷城 | `videos[12].language` | English |
| 幽港迷城 | `videos[12].link` | http://www.youtube.com/watch?v=yMRlYnLjyIg |
| 幽港迷城 | `videos[12].username` | Gawyjo |
| 幽港迷城 | `videos[12].userid` | 2940068 |
| 幽港迷城 | `videos[12].postdate` | 2025-08-29T13:39:42-05:00 |
| 幽港迷城 | `videos[13].id` | 567468 |
| 幽港迷城 | `videos[13].title` | [SPOILERS] Group Play - Gloomhaven - Game 15 - Vibrant Grotto |
| 幽港迷城 | `videos[13].category` | session |
| 幽港迷城 | `videos[13].language` | English |
| 幽港迷城 | `videos[13].link` | http://www.youtube.com/watch?v=2iUj-VXg1GQ |
| 幽港迷城 | `videos[13].username` | Maziken |
| 幽港迷城 | `videos[13].userid` | 504222 |
| 幽港迷城 | `videos[13].postdate` | 2025-08-16T17:52:38-05:00 |
| 幽港迷城 | `videos[14].id` | 566151 |
| 幽港迷城 | `videos[14].title` | Facing The Winged Horror! Gloomhaven Scenario 46 |
| 幽港迷城 | `videos[14].category` | session |
| 幽港迷城 | `videos[14].language` | English |
| 幽港迷城 | `videos[14].link` | http://www.youtube.com/watch?v=1o68L4TOEhI |
| 幽港迷城 | `videos[14].username` | Gawyjo |
| 幽港迷城 | `videos[14].userid` | 2940068 |
| 幽港迷城 | `videos[14].postdate` | 2025-08-08T12:51:23-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `bgg_rank_at_capture` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `bgg_id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `type` | boardgame |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `bgg_url` | https://boardgamegeek.com/boardgame/161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.primary` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[0]` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[1]` | Pandemic Legacy: 1. Évad |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[2]` | Pandemic Legacy: 1a. Temporada |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[3]` | Pandemic Legacy: Rok 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[4]` | Pandemic Legacy: Seizoen 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[5]` | Pandemic Legacy: Sezon 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[6]` | Пандемия: Наследие |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[7]` | Пандемія Спадщина. Сезон 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[8]` | パンデミック：レガシー シーズン1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[9]` | 瘟疫危機︰承傳 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.alternate[10]` | 팬데믹 레거시: 시즌 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[0].type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[0].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[0].value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[1].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[1].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[1].value` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[2].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[2].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[2].value` | Pandemic Legacy: 1. Évad |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[3].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[3].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[3].value` | Pandemic Legacy: 1a. Temporada |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[4].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[4].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[4].value` | Pandemic Legacy: Rok 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[5].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[5].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[5].value` | Pandemic Legacy: Seizoen 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[6].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[6].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[6].value` | Pandemic Legacy: Sezon 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[7].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[7].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[7].value` | Пандемия: Наследие |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[8].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[8].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[8].value` | Пандемія Спадщина. Сезон 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[9].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[9].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[9].value` | パンデミック：レガシー シーズン1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[10].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[10].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[10].value` | 瘟疫危機︰承傳 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[11].type` | alternate |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[11].sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `names.all[11].value` | 팬데믹 레거시: 시즌 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `description` | Pandemic Legacy is a co-operative campaign game, with an overarching story arc played through 12-24 sessions, depending on how well your group does at the game. At the beginning, the game starts in a very similar fashion as basic Pandemic, in which your team of disease-fighting specialists races against the clock to travel around the world, treating disease hot spots while researching cures for each of four plagues before they get out of hand.<br><br>During a player's turn, they have four actions available, with which they may travel around in the world in various ways (sometimes needing to discard a card), build structures like research stations, treat diseases (removing one cube from the board; if all cubes of a color have been removed, the disease has been eradicated), trade cards with other players, or find a cure for a disease (requiring five cards of the same color to be discarded while at a research station). Each player has a unique role with special abilities to help them at these actions.<br><br>After a player has taken their actions, they draw two cards. These cards can include epidemic cards, which will place new disease cubes on the board, and can lead to an outbreak, spreading disease cubes even further. Outbreaks additionally increase the panic level of a city, making that city more expensive to travel to.<br><br>Each month in the game, you have two chances to achieve that month's objectives. If you succeed, you win and immediately move on to the next month. If you fail, you have a second chance, with more funding for beneficial event cards.<br><br>During the campaign, new rules and components will be introduced. These will sometimes require you to permanently alter the components of the game; this includes writing on cards, ripping up cards, and placing permanent stickers on components. Your characters can gain new skills, or detrimental effects. A character can even be lost entirely, at which point it's no longer available for play.<br><br>Part of the Pandemic series<br><br> |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `year_published` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `players.min` | 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `players.max` | 4 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `playing_time_minutes.nominal` | 60 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `playing_time_minutes.min` | 60 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `playing_time_minutes.max` | 60 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `minimum_age` | 13 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `images.image_url` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__original/img/PlzAH7swN1nsFxOXbfUvE3TkE5w=/0x0/filters:format(png)/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `images.thumbnail_url` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__small/img/NQQcjS31TO0DE246N9rpt0hd9eo=/fit-in/200x150/filters:strip_icc()/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `images.local_cover` | covers/03-161936.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].name` | suggested_numplayers |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].title` | User Suggested Number of Players |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].total_votes` | 922 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].attributes.numplayers` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[0].value` | Best |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[0].numvotes` | 21 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[1].value` | Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[1].numvotes` | 150 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[2].value` | Not Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[0].options[2].numvotes` | 465 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].attributes.numplayers` | 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[0].value` | Best |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[0].numvotes` | 171 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[1].value` | Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[1].numvotes` | 488 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[2].value` | Not Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[1].options[2].numvotes` | 109 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].attributes.numplayers` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[0].value` | Best |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[0].numvotes` | 196 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[1].value` | Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[1].numvotes` | 463 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[2].value` | Not Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[2].options[2].numvotes` | 42 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].attributes.numplayers` | 4 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[0].value` | Best |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[0].numvotes` | 520 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[1].value` | Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[1].numvotes` | 230 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[2].value` | Not Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[3].options[2].numvotes` | 25 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].attributes.numplayers` | 4+ |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[0].value` | Best |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[0].numvotes` | 10 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[1].value` | Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[1].numvotes` | 8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[2].value` | Not Recommended |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[0].results[4].options[2].numvotes` | 499 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].name` | suggested_playerage |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].title` | User Suggested Player Age |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].total_votes` | 209 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].attributes` | {} |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[0].value` | 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[0].numvotes` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[1].value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[1].numvotes` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[2].value` | 4 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[2].numvotes` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[3].value` | 5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[3].numvotes` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[4].value` | 6 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[4].numvotes` | 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[5].value` | 8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[5].numvotes` | 24 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[6].value` | 10 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[6].numvotes` | 58 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[7].value` | 12 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[7].numvotes` | 81 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[8].value` | 14 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[8].numvotes` | 33 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[9].value` | 16 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[9].numvotes` | 7 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[10].value` | 18 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[10].numvotes` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[11].value` | 21 and up |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[1].results[0].options[11].numvotes` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].name` | language_dependence |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].title` | Language Dependence |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].total_votes` | 96 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].attributes` | {} |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[0].level` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[0].value` | No necessary in-game text |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[0].numvotes` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[1].level` | 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[1].value` | Some necessary text - easily memorized or small crib sheet |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[1].numvotes` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[2].level` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[2].value` | Moderate in-game text - needs crib sheet or paste ups |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[2].numvotes` | 9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[3].level` | 4 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[3].value` | Extensive use of text - massive conversion needed to be playable |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[3].numvotes` | 65 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[4].level` | 5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[4].value` | Unplayable in another language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `polls[2].results[0].options[4].numvotes` | 21 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[0].id` | 1084 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[0].name` | Environmental |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[1].id` | 2145 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[1].name` | Medical |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamecategory[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[0].id` | 2001 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[0].name` | Action Points |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[1].id` | 2023 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[1].name` | Cooperative Game |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[2].id` | 2040 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[2].name` | Hand Management |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[2].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[3].id` | 2824 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[3].name` | Legacy Game |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[3].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[4].id` | 3099 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[4].name` | Multi-Use Cards |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[4].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[5].id` | 2078 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[5].name` | Point to Point Movement |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[5].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[6].id` | 2822 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[6].name` | Scenario / Mission / Campaign Game |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[6].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[7].id` | 2004 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[7].name` | Set Collection |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[7].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[8].id` | 3100 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[8].name` | Tags |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[8].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[9].id` | 2008 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[9].name` | Trading |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[9].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[10].id` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[10].name` | Variable Player Powers |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamemechanic[10].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[0].id` | 64952 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[0].name` | Components: Map (Global Scale) |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[1].id` | 65191 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[1].name` | Components: Multi-Use Cards |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[2].id` | 3430 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[2].name` | Game: Pandemic |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[2].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[3].id` | 24281 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[3].name` | Mechanism: Campaign Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[3].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[4].id` | 25404 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[4].name` | Mechanism: Legacy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[4].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[5].id` | 61854 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[5].name` | Medical: Diseases |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[5].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[6].id` | 72224 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[6].name` | Misc: Limited Replayability |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[6].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[7].id` | 78680 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[7].name` | Misc: Made by Panda |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[7].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[8].id` | 63526 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[8].name` | Occupation: Dispatcher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[8].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[9].id` | 63524 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[9].name` | Occupation: Medic / Doctor / Nurses |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[9].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[10].id` | 63525 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[10].name` | Occupation: Researcher / Scientist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[10].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[11].id` | 62881 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[11].name` | Region: The World |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[11].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[12].id` | 66167 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[12].name` | Theme: Science |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[12].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[13].id` | 62899 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[13].name` | Versions &amp; Editions: Legacy Versions of Non-Legacy Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamefamily[13].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[0].id` | 309464 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[0].name` | Pandemic Legacy: Season 1 &amp; 2 – e-Raptor Insert |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[1].id` | 475007 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[1].name` | Pandemic: LabGradeGaming Glowing Vials Set |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameaccessory[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[0].id` | 221107 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[0].name` | Pandemic Legacy: Season 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[1].id` | 30549 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[1].name` | Pandemic |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameimplementation[1].inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[0].id` | 442 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[0].name` | Rob Daviau |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[1].id` | 378 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[1].name` | Matt Leacock |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamedesigner[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameartist[0].id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameartist[0].name` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgameartist[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[0].id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[0].name` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[0].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[1].id` | 15889 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[1].name` | Asterion Press |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[1].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[2].id` | 2366 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[2].name` | Devir |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[2].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[3].id` | 5657 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[3].name` | Filosofia Éditions |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[3].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[4].id` | 8820 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[4].name` | Gémklub |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[4].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[5].id` | 1391 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[5].name` | Hobby Japan |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[5].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[6].id` | 15983 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[6].name` | Jolly Thinkers |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[6].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[7].id` | 8291 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[7].name` | Korea Boardgames |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[7].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[8].id` | 5812 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[8].name` | Lacerta |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[8].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[9].id` | 9325 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[9].name` | Lifestyle Boardgames Ltd |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[9].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[10].id` | 7992 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[10].name` | MINDOK |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[10].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[11].id` | 44209 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[11].name` | Ігромаг |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `links.boardgamepublisher[11].inbound` | null |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.users_rated` | 57743 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.average_rating` | 8.50133 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.bayes_average` | 8.34404 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.stddev` | 1.6089 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.median` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.owned` | 89947 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.trading` | 518 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.wanting` | 811 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.wishing` | 15183 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.num_comments` | 8658 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.num_weights` | 1561 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.average_weight` | 2.8283 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].type` | subtype |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].id` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].name` | boardgame |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].friendlyname` | Board Game Rank |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[0].bayesaverage` | 8.34404 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].type` | family |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].id` | 5496 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].name` | thematic |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].friendlyname` | Thematic Rank |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].value` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[1].bayesaverage` | 8.35318 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].type` | family |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].id` | 5497 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].name` | strategygames |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].friendlyname` | Strategy Game Rank |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `statistics.ranks[2].bayesaverage` | 8.33319 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions_count` | 37 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].attributes.id` | 305126 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[0].text` | https://cf.geekdo-images.com/UCurv84wkB3RzFysLGvGaw__small/img/KNoAmeV9w3ssnCGVmBgzp11uUxE=/fit-in/200x150/filters:strip_icc()/pic3025181.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[1].text` | https://cf.geekdo-images.com/UCurv84wkB3RzFysLGvGaw__original/img/oMfSX9mf0D4k8Tm7x4o_86TEjVA=/0x0/filters:format(jpeg)/pic3025181.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[2].attributes.value` | 瘟疫危機︰承傳 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[4].attributes.value` | Chinese blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[5].attributes.id` | 15983 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[5].attributes.value` | Jolly Thinkers |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[8].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[13].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[14].attributes.id` | 2181 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[0].children[14].attributes.value` | Chinese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].attributes.id` | 305125 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[0].text` | https://cf.geekdo-images.com/ByEK9tMMoCIyaSDnjO3_Aw__small/img/jHqlhfQ3dpEed4mb7dyys0PM12M=/fit-in/200x150/filters:strip_icc()/pic3025180.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[1].text` | https://cf.geekdo-images.com/ByEK9tMMoCIyaSDnjO3_Aw__original/img/wVkgOVCT9I72UIBmBAsaLC-16WA=/0x0/filters:format(jpeg)/pic3025180.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[2].attributes.value` | 瘟疫危機︰承傳 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[4].attributes.value` | Chinese red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[5].attributes.id` | 15983 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[5].attributes.value` | Jolly Thinkers |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[8].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[13].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[14].attributes.id` | 2181 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[1].children[14].attributes.value` | Chinese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].attributes.id` | 329714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[0].text` | https://cf.geekdo-images.com/_pPJpmkejJfZPd9QOtVIIQ__small/img/m07mP_n8SpAN2bdKgscssAJRY-I=/fit-in/200x150/filters:strip_icc()/pic3218281.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[1].text` | https://cf.geekdo-images.com/_pPJpmkejJfZPd9QOtVIIQ__original/img/ilL3Ac5zZO5jowt8FjjFz6aG8c0=/0x0/filters:format(jpeg)/pic3218281.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[2].attributes.value` | Pandemic Legacy: Rok 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[4].attributes.value` | Czech blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[5].attributes.id` | 7992 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[5].attributes.value` | MINDOK |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[7].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[8].attributes.value` | ZMG71170CZ |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[13].attributes.id` | 2180 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[2].children[13].attributes.value` | Czech |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].attributes.id` | 329713 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[0].text` | https://cf.geekdo-images.com/OffjgP_EJspSVM51ywrP8w__small/img/McOEze6t5A_cxFtq3J0oixRUIeM=/fit-in/200x150/filters:strip_icc()/pic3218276.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[1].text` | https://cf.geekdo-images.com/OffjgP_EJspSVM51ywrP8w__original/img/maw5b_ObK_TkI0ClxN_Oz6uLhag=/0x0/filters:format(jpeg)/pic3218276.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[2].attributes.value` | Pandemic Legacy: Rok 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[4].attributes.value` | Czech red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[5].attributes.id` | 7992 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[5].attributes.value` | MINDOK |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[7].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[8].attributes.value` | ZMG71171CZ |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[13].attributes.id` | 2180 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[3].children[13].attributes.value` | Czech |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].attributes.id` | 288883 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[0].text` | https://cf.geekdo-images.com/GGLclYaf38TqR5Evdl1P9w__small/img/GcsRulWAsKdAEWz9qji9fmywJN4=/fit-in/200x150/filters:strip_icc()/pic2717556.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[1].text` | https://cf.geekdo-images.com/GGLclYaf38TqR5Evdl1P9w__original/img/G2xC3SFLssWpko5YdzcGdeg6FOk=/0x0/filters:format(jpeg)/pic2717556.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[2].attributes.value` | Pandemic Legacy: Seizoen 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[4].attributes.value` | Dutch blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[8].attributes.value` | ZMG71170NL |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[12].attributes.value` | 4.89426 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[13].attributes.id` | 2183 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[4].children[13].attributes.value` | Dutch |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].attributes.id` | 291712 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[0].text` | https://cf.geekdo-images.com/R4_M5qr3muJQVGJAaV6zEw__small/img/lZZ6eMYzQtayHJ-ASa-aES4D9mQ=/fit-in/200x150/filters:strip_icc()/pic2845443.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[1].text` | https://cf.geekdo-images.com/R4_M5qr3muJQVGJAaV6zEw__original/img/a5Czlc-jK5K2x5asP7wT-b_BTH8=/0x0/filters:format(png)/pic2845443.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[2].attributes.value` | Pandemic Legacy: Seizoen 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[4].attributes.value` | Dutch red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[8].attributes.value` | ZMG71171NL |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[9].attributes.value` | 10.6299 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[10].attributes.value` | 14.6457 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[12].attributes.value` | 4.89 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[13].attributes.id` | 2183 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[5].children[13].attributes.value` | Dutch |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].attributes.id` | 245176 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[0].text` | https://cf.geekdo-images.com/Xj5dN5eFbxRPP756ogt4MA__small/img/AFISpBHRNb9th_4Xpv508PU1gi8=/fit-in/200x150/filters:strip_icc()/pic2452830.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[1].text` | https://cf.geekdo-images.com/Xj5dN5eFbxRPP756ogt4MA__original/img/spEm17AgOQQXJakKt_Y4jd0ssH0=/0x0/filters:format(png)/pic2452830.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[4].attributes.value` | English blue edition 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[8].attributes.value` | ZMG 71170 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[9].attributes.value` | 10.625 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[10].attributes.value` | 14.625 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[6].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].attributes.id` | 591333 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[0].text` | https://cf.geekdo-images.com/Xj5dN5eFbxRPP756ogt4MA__small/img/AFISpBHRNb9th_4Xpv508PU1gi8=/fit-in/200x150/filters:strip_icc()/pic2452830.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[1].text` | https://cf.geekdo-images.com/Xj5dN5eFbxRPP756ogt4MA__original/img/spEm17AgOQQXJakKt_Y4jd0ssH0=/0x0/filters:format(png)/pic2452830.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[4].attributes.value` | English blue edition 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[7].attributes.value` | 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[8].attributes.value` | ZM7170 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[9].attributes.value` | 10.625 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[10].attributes.value` | 14.625 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[7].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].attributes.id` | 271616 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[0].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__small/img/NQQcjS31TO0DE246N9rpt0hd9eo=/fit-in/200x150/filters:strip_icc()/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[1].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__original/img/PlzAH7swN1nsFxOXbfUvE3TkE5w=/0x0/filters:format(png)/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[4].attributes.value` | English red edition 2015, first printing |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[9].attributes.value` | 10.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[10].attributes.value` | 14.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[12].attributes.value` | 4.85017 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[8].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].attributes.id` | 390334 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[0].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__small/img/NQQcjS31TO0DE246N9rpt0hd9eo=/fit-in/200x150/filters:strip_icc()/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[1].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__original/img/PlzAH7swN1nsFxOXbfUvE3TkE5w=/0x0/filters:format(png)/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[4].attributes.value` | English red edition 2015, second printing |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[9].attributes.value` | 10.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[10].attributes.value` | 14.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[12].attributes.value` | 4.85017 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[9].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].attributes.id` | 807737 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[0].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__small/img/NQQcjS31TO0DE246N9rpt0hd9eo=/fit-in/200x150/filters:strip_icc()/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[1].text` | https://cf.geekdo-images.com/-Qer2BBPG7qGGDu6KcVDIw__original/img/PlzAH7swN1nsFxOXbfUvE3TkE5w=/0x0/filters:format(png)/pic2452831.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[4].attributes.value` | English red edition 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[7].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[9].attributes.value` | 10.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[10].attributes.value` | 14.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[12].attributes.value` | 4.85017 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[10].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].attributes.id` | 416330 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[0].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[0].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[1].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[1].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[1].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[1].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[1].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[2].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[2].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[2].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[2].attributes.value` | English red edition 2016 with KdJ |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[3].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[3].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[3].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[4].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[4].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[4].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[4].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[5].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[5].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[6].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[6].attributes.value` | ZMG 71171 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[7].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[7].attributes.value` | 10.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[8].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[8].attributes.value` | 14.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[9].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[9].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[10].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[10].attributes.value` | 4.85 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[11].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[11].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[11].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[11].children[11].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].attributes.id` | 789293 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[0].text` | https://cf.geekdo-images.com/NuMmsBddM-n0-KuCrvzq6g__small/img/joj1BhwHzQuhM68VeXZTwiG0Q1M=/fit-in/200x150/filters:strip_icc()/pic2738699.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[1].text` | https://cf.geekdo-images.com/NuMmsBddM-n0-KuCrvzq6g__original/img/T1uy8WsuZvEm9u9YSL7VpqDlnx0=/0x0/filters:format(png)/pic2738699.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[4].attributes.value` | English red edition 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[7].attributes.value` | 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[8].attributes.value` | ZM7171 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[9].attributes.value` | 10.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[10].attributes.value` | 14.63 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[11].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[13].attributes.id` | 2184 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[12].children[13].attributes.value` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].attributes.id` | 271618 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[0].text` | https://cf.geekdo-images.com/y5SwQzG3HEZ1RmQh42_TCQ__small/img/-z3d1xU2zKjUqupQkAk82-8K_24=/fit-in/200x150/filters:strip_icc()/pic2488706.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[1].text` | https://cf.geekdo-images.com/y5SwQzG3HEZ1RmQh42_TCQ__original/img/3sZoWPBoIYnhNhY5J8LVlusa7kQ=/0x0/filters:format(png)/pic2488706.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[2].attributes.value` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[4].attributes.value` | Filosofia French blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[5].attributes.id` | 5657 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[5].attributes.value` | Filosofia Éditions |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[13].attributes.id` | 2187 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[13].children[13].attributes.value` | French |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].attributes.id` | 271619 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[0].text` | https://cf.geekdo-images.com/yaY9rUgimOZjJXtZf77dAg__small/img/ZHpAYCHt1yxgQRUOBAPpLjbSpdI=/fit-in/200x150/filters:strip_icc()/pic2488668.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[1].text` | https://cf.geekdo-images.com/yaY9rUgimOZjJXtZf77dAg__original/img/l5oAeGrJIFDYDfxX1TQER9r_VE8=/0x0/filters:format(png)/pic2488668.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[2].attributes.value` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[4].attributes.value` | Filosofia French red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[5].attributes.id` | 5657 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[5].attributes.value` | Filosofia Éditions |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[13].attributes.id` | 2187 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[14].children[13].attributes.value` | French |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].attributes.id` | 281594 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[0].text` | https://cf.geekdo-images.com/WjKxD8qm2DwHPQlwelfs3w__small/img/xm6-Gu-_4yRy-m6fkD1y-T4psh0=/fit-in/200x150/filters:strip_icc()/pic2620676.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[1].text` | https://cf.geekdo-images.com/WjKxD8qm2DwHPQlwelfs3w__original/img/-dbOHkpgV-uN0nnc-ENEfdSkFdM=/0x0/filters:format(jpeg)/pic2620676.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[4].attributes.value` | German blue edition 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[8].attributes.value` | ZMG71170DE |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[12].attributes.value` | 4.65616 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[13].attributes.id` | 2188 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[15].children[13].attributes.value` | German |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].attributes.id` | 318896 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[0].text` | https://cf.geekdo-images.com/WjKxD8qm2DwHPQlwelfs3w__small/img/xm6-Gu-_4yRy-m6fkD1y-T4psh0=/fit-in/200x150/filters:strip_icc()/pic2620676.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[1].text` | https://cf.geekdo-images.com/WjKxD8qm2DwHPQlwelfs3w__original/img/-dbOHkpgV-uN0nnc-ENEfdSkFdM=/0x0/filters:format(jpeg)/pic2620676.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[4].attributes.value` | German blue edition 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[7].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[8].attributes.value` |  ZMG71170DE |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[12].attributes.value` | 4.66 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[13].attributes.id` | 2188 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[16].children[13].attributes.value` | German |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].attributes.id` | 288127 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[0].text` | https://cf.geekdo-images.com/E9n8jm5VC_Xd5Vw81qlh8w__small/img/Le_uF-IFuaSY3Grzqf5iM8BkHKo=/fit-in/200x150/filters:strip_icc()/pic2760952.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[1].text` | https://cf.geekdo-images.com/E9n8jm5VC_Xd5Vw81qlh8w__original/img/fVuwI_WZ2M-pa6MSliksXHuo1h0=/0x0/filters:format(jpeg)/pic2760952.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[4].attributes.value` | German red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[13].attributes.id` | 2188 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[17].children[13].attributes.value` | German |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].attributes.id` | 332291 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[0].text` | https://cf.geekdo-images.com/f-p9nLn3bO2BDpEH2Yv1AQ__small/img/xEkS-BTDdg8Ld9wpWVyy00Ntdv8=/fit-in/200x150/filters:strip_icc()/pic3248694.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[1].text` | https://cf.geekdo-images.com/f-p9nLn3bO2BDpEH2Yv1AQ__original/img/SI3nuNMWx_bdF1-RyskK5Tnwm6s=/0x0/filters:format(jpeg)/pic3248694.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[2].attributes.value` | Pandemic Legacy: 1. Évad |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[4].attributes.value` | Hungarian blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[5].attributes.id` | 8820 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[5].attributes.value` | Gémklub |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[8].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[10].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[11].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[12].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[13].attributes.value` | 4.89 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[14].attributes.id` | 2191 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[18].children[14].attributes.value` | Hungarian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].attributes.id` | 332292 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[0].text` | https://cf.geekdo-images.com/I1tBSLcTik-JhyYZ0hJW6A__small/img/w-jlOLc-Oq0lVaSU2WisylGTKB0=/fit-in/200x150/filters:strip_icc()/pic3248682.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[1].text` | https://cf.geekdo-images.com/I1tBSLcTik-JhyYZ0hJW6A__original/img/XkYSr_iGkMtKuIktZ5PImV03PtU=/0x0/filters:format(jpeg)/pic3248682.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[2].attributes.value` | Pandemic Legacy: 1. Évad |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[4].attributes.value` | Hungarian red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[5].attributes.id` | 8820 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[5].attributes.value` | Gémklub |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[8].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[10].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[11].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[12].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[13].attributes.value` | 4.89 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[14].attributes.id` | 2191 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[19].children[14].attributes.value` | Hungarian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].attributes.id` | 287566 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[0].text` | https://cf.geekdo-images.com/u2xqe9LuAIcbzhQa5VY1Lg__small/img/qyU6odhUxqxPqHYPbrJW6HYeuwU=/fit-in/200x150/filters:strip_icc()/pic2845439.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[1].text` | https://cf.geekdo-images.com/u2xqe9LuAIcbzhQa5VY1Lg__original/img/p32pDnLWX4zqPMQelWz3jPHBhpU=/0x0/filters:format(png)/pic2845439.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[4].attributes.value` | Italian blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[5].attributes.id` | 15889 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[5].attributes.value` | Asterion Press |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[13].attributes.id` | 2193 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[20].children[13].attributes.value` | Italian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].attributes.id` | 287564 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[0].text` | https://cf.geekdo-images.com/96aQ_Gntzp5qS6YmZ8VTwA__small/img/k7Us8CMXM2ejemIKOPjSKEs1t0M=/fit-in/200x150/filters:strip_icc()/pic2845441.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[1].text` | https://cf.geekdo-images.com/96aQ_Gntzp5qS6YmZ8VTwA__original/img/zoU99c8lFbMJu6CPYtaVNTd8zNc=/0x0/filters:format(png)/pic2845441.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[4].attributes.value` | Italian red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[5].attributes.id` | 15889 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[5].attributes.value` | Asterion Press |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[13].attributes.id` | 2193 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[21].children[13].attributes.value` | Italian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].attributes.id` | 394254 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[0].text` | https://cf.geekdo-images.com/Wd54INV9APqWD1qqTDMjWQ__small/img/Li4GoZFG6MrnBgIxCex-hKdOZZI=/fit-in/200x150/filters:strip_icc()/pic3961718.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[1].text` | https://cf.geekdo-images.com/Wd54INV9APqWD1qqTDMjWQ__original/img/btLx1k0007ADYHl-4WjDNZ24TV8=/0x0/filters:format(jpeg)/pic3961718.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[2].attributes.value` | パンデミック：レガシー シーズン1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[4].attributes.value` | Japanese blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[5].attributes.id` | 1391 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[5].attributes.value` | Hobby Japan |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[6].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[6].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[7].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[7].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[8].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[8].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[9].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[9].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[10].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[11].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[12].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[12].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[12].attributes.id` | 2194 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[22].children[12].attributes.value` | Japanese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].attributes.id` | 285190 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[0].text` | https://cf.geekdo-images.com/976a0hRH9APq23l33Ts7SQ__small/img/2YpUAOYBnmuZdk3Oe0FQexkFDhM=/fit-in/200x150/filters:strip_icc()/pic2669117.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[1].text` | https://cf.geekdo-images.com/976a0hRH9APq23l33Ts7SQ__original/img/glGGIZ3RET-sx9RLtKjGfCQuIWM=/0x0/filters:format(jpeg)/pic2669117.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[2].attributes.value` | パンデミック：レガシー シーズン1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[4].attributes.value` | Japanese red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[5].attributes.id` | 1391 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[5].attributes.value` | Hobby Japan |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[13].attributes.id` | 2194 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[23].children[13].attributes.value` | Japanese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].attributes.id` | 387090 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[0].text` | https://cf.geekdo-images.com/Umd6LnaI8euPx2B0sWy0dg__small/img/KOu-xK_lJXISfszOxshOSs1HtxA=/fit-in/200x150/filters:strip_icc()/pic5277244.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[1].text` | https://cf.geekdo-images.com/Umd6LnaI8euPx2B0sWy0dg__original/img/8U_0DVM6gBsHBplOI49efk1yqho=/0x0/filters:format(png)/pic5277244.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[2].attributes.value` | 팬데믹 레거시: 시즌 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[4].attributes.value` | Korean blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[5].attributes.id` | 8291 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[5].attributes.value` | Korea Boardgames |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[6].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[6].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[7].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[7].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[8].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[8].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[9].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[9].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[10].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[11].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[12].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[12].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[12].attributes.id` | 2195 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[24].children[12].attributes.value` | Korean |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].attributes.id` | 386795 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[0].text` | https://cf.geekdo-images.com/Uv1JRi4RNJtFVMTY_QYNZA__small/img/DKkdJYFODWokv5lCDbSseTwIMd8=/fit-in/200x150/filters:strip_icc()/pic5277243.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[1].text` | https://cf.geekdo-images.com/Uv1JRi4RNJtFVMTY_QYNZA__original/img/bK6sk_6zHWSx9rbYqCNu__AuqHU=/0x0/filters:format(png)/pic5277243.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[2].attributes.value` | 팬데믹 레거시: 시즌 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[4].attributes.value` | Korean red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[5].attributes.id` | 8291 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[5].attributes.value` | Korea Boardgames |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[6].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[6].attributes.value` | 2016 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[7].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[7].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[8].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[8].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[9].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[9].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[10].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[11].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[12].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[12].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[12].attributes.id` | 2195 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[25].children[12].attributes.value` | Korean |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].attributes.id` | 270734 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[0].text` | https://cf.geekdo-images.com/WlWRWo5lbs4Fbwr3ZSffVg__small/img/I4Ps9up4itOz1p7mt4Xil6isKYI=/fit-in/200x150/filters:strip_icc()/pic2474196.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[1].text` | https://cf.geekdo-images.com/WlWRWo5lbs4Fbwr3ZSffVg__original/img/EHmtwCWhvaUQ1yTCmC4Xli83Azg=/0x0/filters:format(jpeg)/pic2474196.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[2].attributes.value` | Pandemic Legacy: Sezon 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[4].attributes.value` | Polish blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[5].attributes.id` | 5812 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[5].attributes.value` | Lacerta |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[8].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[10].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[11].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[12].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[13].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[14].attributes.id` | 2199 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[26].children[14].attributes.value` | Polish |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].attributes.id` | 274875 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[0].text` | https://cf.geekdo-images.com/PoaxSkQIn5GgH-Wm1n7phg__small/img/vl1peioo1wixyQ6ieETGChoDYsA=/fit-in/200x150/filters:strip_icc()/pic2474195.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[1].text` | https://cf.geekdo-images.com/PoaxSkQIn5GgH-Wm1n7phg__original/img/2RioVkQzZXnGhmeLTvTyPqyF3sg=/0x0/filters:format(jpeg)/pic2474195.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[2].attributes.value` | Pandemic Legacy: Sezon 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[4].attributes.value` | Polish red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[5].attributes.id` | 5812 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[5].attributes.value` | Lacerta |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[6].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[6].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[7].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[7].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[7].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[7].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[8].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[8].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[9].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[9].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[10].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[10].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[11].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[11].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[12].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[12].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[13].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[13].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[14].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[14].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[14].attributes.id` | 2199 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[27].children[14].attributes.value` | Polish |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].attributes.id` | 296084 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[0].text` | https://cf.geekdo-images.com/2h-2enSTDzAz5F9YtDjbWw__small/img/kFpAcJ-1z8QGdKsfNs2UoVLM50M=/fit-in/200x150/filters:strip_icc()/pic2845437.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[1].text` | https://cf.geekdo-images.com/2h-2enSTDzAz5F9YtDjbWw__original/img/HToocYs5TMh-lAjBrWI8cNw300A=/0x0/filters:format(png)/pic2845437.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[4].attributes.value` | Portuguese blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[5].attributes.id` | 2366 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[5].attributes.value` | Devir |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[13].attributes.id` | 2200 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[28].children[13].attributes.value` | Portuguese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].attributes.id` | 303840 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[0].text` | https://cf.geekdo-images.com/MesbWj6K9LarmBNXxap7ow__small/img/W7VCHiXzlzIRHflizg-njUdwKiU=/fit-in/200x150/filters:strip_icc()/pic2933766.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[1].text` | https://cf.geekdo-images.com/MesbWj6K9LarmBNXxap7ow__original/img/js8yhqrAOzDO6ceoebRfKpSH5GM=/0x0/filters:format(jpeg)/pic2933766.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[2].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[4].attributes.value` | Portuguese red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[5].attributes.id` | 2366 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[5].attributes.value` | Devir |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[13].attributes.id` | 2200 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[29].children[13].attributes.value` | Portuguese |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].attributes.id` | 293194 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[0].text` | https://cf.geekdo-images.com/u44WpCKccry1ohhShd3_IQ__small/img/YkYswFk8eCzilG6Vq8P_o7RTuR0=/fit-in/200x150/filters:strip_icc()/pic2845444.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[1].text` | https://cf.geekdo-images.com/u44WpCKccry1ohhShd3_IQ__original/img/N8aibgOZ2qs9ogyQ49-Nr8q5Fq8=/0x0/filters:format(png)/pic2845444.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[2].attributes.value` | Пандемия: Наследие |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[4].attributes.value` | Russian blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[5].attributes.id` | 9325 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[5].attributes.value` | Lifestyle Boardgames Ltd |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[9].attributes.value` | 9.06 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[10].attributes.value` | 11.97 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[11].attributes.value` | 1.77 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[12].attributes.value` | 4.9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[13].attributes.id` | 2202 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[30].children[13].attributes.value` | Russian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].attributes.id` | 457857 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[0].text` | https://cf.geekdo-images.com/h7dpvG7shDSUUG-YA6qvXA__small/img/MY_Oa_bDrKNlrL_TVmFg4sx5rGU=/fit-in/200x150/filters:strip_icc()/pic2845446.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[1].text` | https://cf.geekdo-images.com/h7dpvG7shDSUUG-YA6qvXA__original/img/bnNl2hJug0QLQGyDSQSaZ9TDiPo=/0x0/filters:format(png)/pic2845446.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[2].attributes.value` | Пандемия: Наследие |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[4].attributes.value` | Russian red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[5].attributes.id` | 9325 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[5].attributes.value` | Lifestyle Boardgames Ltd |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[9].attributes.value` | 7.87402 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[13].attributes.id` | 2202 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[31].children[13].attributes.value` | Russian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].attributes.id` | 278089 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[0].text` | https://cf.geekdo-images.com/XaYHNYDDIFNwiSjLPTFPUA__small/img/nZgDdv36oqexOd5C5K8R9NSdgfc=/fit-in/200x150/filters:strip_icc()/pic4383484.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[1].text` | https://cf.geekdo-images.com/XaYHNYDDIFNwiSjLPTFPUA__original/img/Tvkg9SAfihfPrdAVcQtWjXxIc88=/0x0/filters:format(png)/pic4383484.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[2].attributes.value` | Pandemic Legacy: 1a. Temporada |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[4].attributes.value` | Spanish blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[9].attributes.value` | 9.05512 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[10].attributes.value` | 11.9685 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[11].attributes.value` | 1.77165 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[12].attributes.value` | 4.62971 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[13].attributes.id` | 2203 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[32].children[13].attributes.value` | Spanish |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].attributes.id` | 278091 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[0].text` | https://cf.geekdo-images.com/P3qmlBfOomtmsgDvYSTBDg__small/img/4LwXMBbohrFSveR4ZBzGlZDPPHw=/fit-in/200x150/filters:strip_icc()/pic4383485.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[1].text` | https://cf.geekdo-images.com/P3qmlBfOomtmsgDvYSTBDg__original/img/cpl9k4yicmyMxUrxDomoyMrLCk8=/0x0/filters:format(png)/pic4383485.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[2].attributes.value` | Pandemic Legacy: 1a. Temporada |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[4].attributes.value` | Spanish red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[5].attributes.id` | 2366 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[5].attributes.value` | Devir |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[6].attributes.type` | boardgameartist |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[6].attributes.id` | 14057 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[6].attributes.value` | Chris Quilliams |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[7].attributes.value` | 2015 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[8].attributes.value` |  |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[9].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[13].attributes.id` | 2203 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[33].children[13].attributes.value` | Spanish |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].attributes.id` | 661595 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[0].text` | https://cf.geekdo-images.com/_ApfrRHH-Q54nDoX9glJ4w__small/img/pSLxJLM9hbnRWxH4KqS4MzXx4sE=/fit-in/200x150/filters:strip_icc()/pic9047639.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[1].text` | https://cf.geekdo-images.com/_ApfrRHH-Q54nDoX9glJ4w__original/img/0rEPSV7CcKgyibkHEQInkIAJcm8=/0x0/filters:format(png)/pic9047639.png |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[2].attributes.value` | Пандемія Спадщина. Сезон 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[4].attributes.value` | Ukrainian red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[6].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[6].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[6].attributes.id` | 44209 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[6].attributes.value` | Ігромаг |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[7].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[7].attributes.value` | 2024 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[8].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[8].attributes.value` | 8063 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[9].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[9].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[10].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[10].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[11].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[12].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[12].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[13].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[13].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[13].attributes.id` | 2665 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[34].children[13].attributes.value` | Ukrainian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].attributes.id` | 434410 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[0].text` | https://cf.geekdo-images.com/yP14o_m7vkcA0Nf76ckjbw__small/img/S1GDAYLQCP9HpgvzBvwJ0lICHRM=/fit-in/200x150/filters:strip_icc()/pic4460966.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[1].text` | https://cf.geekdo-images.com/yP14o_m7vkcA0Nf76ckjbw__original/img/8c8s6527vFdsxjD569Y7BDER9W8=/0x0/filters:format(jpeg)/pic4460966.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[2].attributes.value` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[4].attributes.value` | Z-Man Games French blue edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[6].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[6].attributes.value` | 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[7].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[7].attributes.value` | PAN07BLU 0018JUL18FR |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[8].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[8].attributes.value` | 10.5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[9].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[9].attributes.value` | 14.5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[10].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[10].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[11].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[12].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[12].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[12].attributes.id` | 2187 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[35].children[12].attributes.value` | French |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].tag` | item |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].attributes.id` | 434411 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[0].tag` | thumbnail |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[0].text` | https://cf.geekdo-images.com/cMaObtNaLqdVxSQ0ZOntkQ__small/img/zcqnYCKlu4V0F-7oqFJi81LzSYs=/fit-in/200x150/filters:strip_icc()/pic4460967.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[1].tag` | image |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[1].text` | https://cf.geekdo-images.com/cMaObtNaLqdVxSQ0ZOntkQ__original/img/geCLi9BU3v90VVbBPW8ZdGZ2X74=/0x0/filters:format(jpeg)/pic4460967.jpg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[2].tag` | canonicalname |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[2].attributes.value` | Pandemic Legacy:  Saison 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[3].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[3].attributes.type` | boardgameversion |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[3].attributes.id` | 161936 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[3].attributes.value` | Pandemic Legacy: Season 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[3].attributes.inbound` | true |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[4].tag` | name |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[4].attributes.type` | primary |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[4].attributes.sortindex` | 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[4].attributes.value` | Z-Man Games French red edition |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[5].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[5].attributes.type` | boardgamepublisher |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[5].attributes.id` | 538 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[5].attributes.value` | Z-Man Games |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[6].tag` | yearpublished |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[6].attributes.value` | 2018 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[7].tag` | productcode |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[7].attributes.value` | PAN07RED 0019JUL18FR |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[8].tag` | width |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[8].attributes.value` | 10.5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[9].tag` | length |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[9].attributes.value` | 14.5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[10].tag` | depth |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[10].attributes.value` | 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[11].tag` | weight |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[11].attributes.value` | 0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[12].tag` | link |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[12].attributes.type` | language |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[12].attributes.id` | 2187 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `versions[36].children[12].attributes.value` | French |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos_count` | 15 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].id` | 597834 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].title` | Pandemic Legacy: Season 1 review and after-action report &#124; One Stop Co-Op Shop |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].category` | review |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].link` | http://www.youtube.com/watch?v=MnldRRneM4o |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].username` | GameMasterX0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].userid` | 12549 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[0].postdate` | 2026-02-14T07:49:57-06:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].id` | 591417 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].title` | Just Played! - Pandemic Season 1 (Quick Review) |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].category` | review |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].link` | http://www.youtube.com/watch?v=bfLQdovclO0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].username` | Arvias |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].userid` | 209684 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[1].postdate` | 2026-01-08T09:09:05-06:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].id` | 566624 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].title` | СТРАШНИЙ СОН НАСТІЛЬНИКА |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].category` | humor |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].language` | Ukrainian |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].link` | http://www.youtube.com/watch?v=2mqXKVqvs0c |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].username` | Alisa_Igromag |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].userid` | 3086059 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[2].postdate` | 2025-08-12T05:02:06-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].id` | 550181 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].title` | Pandemic Legacy Season 1 June Episode 12 Finale |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].link` | http://www.youtube.com/watch?v=Pbhy1OVzwwg |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[3].postdate` | 2025-04-22T10:26:31-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].id` | 549954 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].title` | Pandemic Legacy Season 1 June Episode 11 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].link` | http://www.youtube.com/watch?v=w3Pmftj33no |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[4].postdate` | 2025-04-21T05:48:30-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].id` | 549815 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].title` | Pandemic Legacy Season 1 June Episode 10 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].link` | http://www.youtube.com/watch?v=u8McyhsiUM8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[5].postdate` | 2025-04-20T05:11:07-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].id` | 549610 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].title` | Pandemic Legacy Season 1 June Episode 9 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].link` | http://www.youtube.com/watch?v=g11eKhJ8GUo |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[6].postdate` | 2025-04-19T05:26:07-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].id` | 549387 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].title` | Pandemic Legacy Season 1 June Episode 8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].link` | http://www.youtube.com/watch?v=pTXqT7lrn6o |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[7].postdate` | 2025-04-18T05:53:37-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].id` | 549120 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].title` | Pandemic Legacy Season 1 June Episode 7 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].link` | http://www.youtube.com/watch?v=pIAmH7tNRe8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[8].postdate` | 2025-04-17T06:24:15-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].id` | 548883 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].title` | Pandemic Legacy Season 1 June Episode 6 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].link` | http://www.youtube.com/watch?v=2k_B_rb0y6c |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[9].postdate` | 2025-04-16T05:15:03-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].id` | 548730 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].title` | Pandemic Legacy Season 1 June Episode 5 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].link` | http://www.youtube.com/watch?v=wmRuAI7ByOs |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[10].postdate` | 2025-04-15T05:38:32-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].id` | 548493 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].title` | Pandemic Legacy Season 1 June Episode 4 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].link` | http://www.youtube.com/watch?v=83mBFVLyIt0 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[11].postdate` | 2025-04-14T05:40:39-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].id` | 548308 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].title` | Pandemic Legacy Season 1 June Episode 3 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].link` | http://www.youtube.com/watch?v=L5R6sUiQKN8 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[12].postdate` | 2025-04-13T06:09:52-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].id` | 548221 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].title` | Pandemic Legacy Season 1 June Episode 2 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].link` | http://www.youtube.com/watch?v=axDfYYS0UGw |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[13].postdate` | 2025-04-12T05:25:22-05:00 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].id` | 548046 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].title` | Pandemic Legacy Season 1 June Episode 1 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].category` | session |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].language` | English |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].link` | http://www.youtube.com/watch?v=0bTO139PkTQ |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].username` | PaulDarcy |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].userid` | 65714 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | `videos[14].postdate` | 2025-04-11T05:44:17-05:00 |

## 完整性统计

| 桌游 | 展开后的具体数据行数 |
|---|---:|
| 工业革命：伯明翰 | 2294 |
| 方舟动物园 | 2336 |
| 幽港迷城 | 1990 |
| 瘟疫传说传承（Pandemic Legacy 第一季） | 1992 |
| 合计 | 8612 |
