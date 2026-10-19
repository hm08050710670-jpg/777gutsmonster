---
name: deliver
description: GUTS MONSTERS の変更を検証し、単一HTMLの公開・GitHub（Pages）への反映まで行う納品手順。コードを変えたら毎回使う。
---

# 納品手順（GUTS MONSTERS）

1. **検証**（scratchpad のテスト。Playwright・iPhone 相当のタッチ操作）
   - `ch1.js`：第1章の通しテスト → `ERRORS: none` を確認
   - `enc.js`：遭遇演出（ジングル1回・敵1体・戦闘開始1回・ミュート／音源なしでも進行）
   - 画面を変えたときはスクリーンショットを撮って目で確認する
2. **キャッシュ対策**：`python3 tools/stamp.py`（index.html の js/css 参照に `?v=日時` を付ける）
3. **単一HTML**：`python3 tools/build-single.py` → `dist/index.html`
4. **公開**：`dist/index.html` をアーティファクト（https://claude.ai/artifact/49xp9vkgxReaaqFRCNergA）に同じ URL で再公開
5. **GitHub**：`git add -A` → コミット（末尾に Co-Authored-By / Claude-Session の2行）→ `git push origin main`
   - push すると GitHub Actions が Pages（https://hm08050710670-jpg.github.io/777gutsmonster/）へ自動反映（1〜2分、CDN の都合で最大10分）
6. **報告**：変更したファイル／変更点／確認した内容／未確認の項目（iPhone 実機は常に「未確認」と明記）
