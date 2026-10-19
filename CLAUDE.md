# CLAUDE.md — GUTS MONSTERS

iPhone のブラウザで遊ぶ GBA 風モンスター RPG（ゴルフ場が舞台、戦闘はマッチ3パズル）。
依存ゼロ・ビルド不要の素の HTML/JS。公開先は GitHub Pages。

- 公開 URL：https://hm08050710670-jpg.github.io/777gutsmonster/
- 単一 HTML の配布：`dist/index.html`（アーティファクト https://claude.ai/artifact/49xp9vkgxReaaqFRCNergA）
- 細かいルール・手順・担当者は `.claude/`（`rules/project.md`、`skills/deliver/SKILL.md`）を読む

## やりとりの約束（最重要）

- 日本語で簡潔に。報告は **結論 → 理由 → 具体策 → 次の行動**。単純なことは短く。
- **指示された箇所だけ変える。** 承認済みのデザイン・画像・音・文章・UI・操作・仕様は指示がない限り維持。
- 過去の決定と矛盾する依頼は、変更前に矛盾点と影響を伝えて確認する。
- 渡す前に必ず動かして確認する。**iPhone 実機では確認できないので、必ず「実機未確認」と明記**し、やっていない確認を「確認済み」と書かない。
- 見た目に関わる変更は、スクリーンショットや候補を見せてから決める。
- 不明なことは推測で断定せず「不明」「確認が必要」と言う。

## 構成

```
index.html            エントリ（js/css の参照には tools/stamp.py が ?v=日時 を付ける）
css/style.css         全体・パッド・名前入力オーバーレイ
css/puzzle.css        戦闘中のパズル UI（#puzzle）
js/config.js          定数（画面サイズ、遭遇率、音量、遭遇演出の種類 ENCOUNTER_KIND など）
js/data.js            全データ：モンスター、マップ（rows/events/npc）、出現表、BGM/SFX、技、ノート
js/game.js            ループ・シーンスタック・画面スケーリング（fit / visibleHeight / セーフエリア / 拡大リセット）
js/input.js           キーボード＋仮想パッド、iOS のジェスチャー抑止
js/sound.js           Web Audio：BGM（ループ・フェード）、効果音 playSfx、診断 diag
js/save.js            セーブ（localStorage）＋セーブコード encode/decode
js/ui.js              ADVENTURE NOTE、名前入力、保存表示
js/scenes/title.js    タイトル → なまえ → せいべつ → プレビュー（裏技 ↑↓B↓↓ でテストメニュー）
js/scenes/field.js    フィールド：移動、ワープ、NPC 会話（gift）、遭遇判定（草むら T／バンカー K）
js/scenes/battle.js   Puzzle（DOM）、BattleScene、遭遇演出（Encounter / EncounterScene / ENC_PRESET）、startWildBattle
js/scenes/menu.js     メニュー、せってい（BGM・なまえ・おとテスト・セーブコード）、なかま、もちもの
js/scenes/dialog.js   会話ウィンドウ
assets/               tiles.png/json（タイル地図帳）、monsters*.png、hero.png、npc.png、maps/（部屋の一枚絵）、bgm/、sfx/、ui/
tools/                素材生成（Python/PIL）・テスト（Playwright）・build-single.py・stamp.py
docs/                 仕様メモ（第1章、ガッツボール、NPC ドット）
.github/workflows/pages.yml   main に push すると Pages へ自動デプロイ
```

## 技術の要点

- 画面は **192×H** の canvas（H は端末に合わせ 208〜272）。横幅いっぱいに拡大。`Game.fit()` がセーフエリア・アプリ内ブラウザ（LINE＝WKWebView）・キーボード・ピンチ拡大を考慮する。触るときは必ず iPhone 相当のビューポートで確認。
- 戦闘中は canvas を `Puzzle.arena` の高さに縮め、下にパズル（DOM）を出す。パッドは隠れる。
- 遭遇：`field.js onArrive` → `startWildBattle` → `EncounterScene`（フィールド上で予兆・フラッシュ・横じま）→ 覆った下で `BattleScene`（`encounter` 付き）→ ジングル終了で `Sound.play('wild')`。時計は音声の実再生位置と壁時計の大きいほう（ミュートでも止まらない）。区切りは `ENC_PRESET`、通常遭遇で使う種類は `CONFIG.ENCOUNTER_KIND`（現在 `'danger'`＝49番）。
- 音：`DATA.BGM`（mp3、ループ）と `DATA.SFX`（wav、1回）。最初のタップでアンロックし全部先読み。音量は `Sound` の master 0.7 と `CONFIG.SFX_VOLUME`。
- セーブ：`localStorage`（`CONFIG.SAVE_KEY`）。**形式を変えない**（変えるなら `Save.load` に移行処理）。せっていの「セーブコード」で持ち出し／復帰できる。
- 単一 HTML：`tools/build-single.py` が画像・フォント・BGM・SFX を data URI で埋め込む（`assets/sfx` 以下は自動で対象）。
- NPC ドット：`tools/npc-px.py`（EXACT 指定・足の長さ補正）。部屋の一枚絵は `assets/maps/`、起動時に先読み。

## 作業の流れ（納品）

1. 変更 → `node --check` → Playwright テスト（scratchpad の `ch1.js`・`enc.js` など、iPhone 相当のタッチ操作）→ 画面はスクショで目視
2. `python3 tools/stamp.py` → `python3 tools/build-single.py`
3. `dist/index.html` をアーティファクトに同じ URL で再公開
4. `git add -A` → コミット（末尾に Co-Authored-By / Claude-Session）→ `git push origin main`（Pages へ自動反映、1〜2分・最大10分）
5. 報告：変更したファイル／変更点／確認した内容／未確認（実機）

## 変えないもの（指示がない限り）

マップと草むら、遭遇率と出現表、モンスター画像、戦闘画面の配置、パズル・技・ダメージ計算、捕獲、BGM の音源、セーブ形式、戦闘終了後の復帰処理。

## 既知の iPhone 注意点

- Safari は `user-scalable=no` を無視することがある → `game.js` が拡大を検知して viewport を書き直す。
- Safari は 7 日開かないとサイトのデータを消すことがある → ホーム画面に追加すると対象外。セーブコードで保険。
- Pages は古いファイルを最大 10 分配り続ける → `stamp.py` の `?v=` で新旧の混在を防ぐ。
- 音が出ないときは せってい の一番下の診断行（`おと:… SFX:… さいご:…`）で切り分ける。
