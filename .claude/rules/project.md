# GUTS MONSTERS 共通ルール

## 変更範囲
- 指示された箇所だけ変える。承認済みのデザイン・画像・音・文章・UI・操作・仕様は指示がない限り維持する。
- 過去の決定と矛盾する依頼は、変更前に矛盾点と影響を伝えて確認する。
- 指定外の箇所も変える必要があるときは、理由と範囲を示してから。

## 検証と報告
- ファイルを渡す前に必ず動かして確認する（`.claude/skills/deliver`）。
- iPhone 実機で確認していないことは「実機未確認」と明記する。確認していないことを「確認済み」と書かない。
- 報告は 結論 → 理由 → 具体策 → 次の行動 の順。単純なことは簡潔に。

## 技術メモ
- 画面は 192×H（208〜272）の canvas。iPhone のセーフエリアとアプリ内ブラウザ（LINE）を考慮する。
- 音は Web Audio（`js/sound.js`）。BGM は `DATA.BGM`、効果音は `DATA.SFX`。音量は `CONFIG.SFX_VOLUME`、遭遇演出の区切りは `js/scenes/battle.js` の `ENC_PRESET`。
- セーブは localStorage（`js/save.js`）。セーブコード（コピー／ふっき）で持ち出せる。セーブ形式は勝手に変えない。
- 新しい BGM/効果音は `assets/bgm` `assets/sfx` に置き、`tools/build-single.py` が単一HTMLへ埋め込む。
