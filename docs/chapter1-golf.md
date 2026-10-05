# 第1章 構成（v146 で採用）

- 道と町はふつうのRPG：タウン → ガーデンロード（ノブオ戦）→ グリーンの森 → ガーデンプレース（町：回復・ショップ）
- 町の北に **ガーデンカントリークラブ**
  - **コース＝サファリ**（捕獲・レベル上げ）：course1（1〜3番）→ course2（池）→ course3（林間）→ course4（18番・最奥に調査ポイント）。奥ほど強い。
    カート道 P は安全、T ラフ・K バンカー（map.bunker の別テーブル）で出る。落ちているアイテム（kind: item）
  - **クラブハウス＝ジム**：フロント（回復）→ 会員トレーナー3人（タクマ→ミナ→ゴロウ、順番制 needs）→ 扉（needs: trainerGoro）→ チャンピオンルームでカエデ（champ: true）
  - 正門前 cc：カエデ（観測機を渡す・調査依頼）、クラブハウス入口、コース入口
- 流れ：観測機 → コース最奥で地下の音（gardenSound）→ クラブハウスで3人 → カエデ公式戦 → クラブ認定
- 仕組み：kind: trainer（intro/win/lose/after/wait, needs）、kind: item（item/n/flag/text）、warp の needs/waitText、course3 の forestRun トリガー
- 未着手：コース・クラブハウス外観の絵（ChatGPT）、プロショップでのガッツボール販売
