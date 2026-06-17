const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require("@notionhq/client"); // 💡 Notion APIクライアントを追加

// Notionクライアントの初期化（環境変数のNOTION_TOKENを自動参照）
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 💡 「AI03開発ルール」のNotionページIDを指定（URLの末尾から抽出したID）
const RULE_PAGE_ID = "3814c3b4a17280e18f9dc4ee0ba5019b"; 

/**
 * 💡 Notionのページからテキストブロック（開発ルール）を抽出してテキスト化する関数
 */
async function fetchNotionRules(pageId) {
  try {
    console.log("📥 Notionから『AI03開発ルール』を取得中...");
    const response = await notion.blocks.children.list({ block_id: pageId });
    
    let rulesText = "";
    for (const block of response.results) {
      if (block.type === "paragraph") {
        rulesText += block.paragraph.rich_text.map(t => t.plain_text).join("") + "\n";
      } else if (block.type === "heading_1") {
        rulesText += `\n# ${block.heading_1.rich_text.map(t => t.plain_text).join("")}\n`;
      } else if (block.type === "heading_2") {
        rulesText += `\n## ${block.heading_2.rich_text.map(t => t.plain_text).join("")}\n`;
      } else if (block.type === "heading_3") {
        rulesText += `\n### ${block.heading_3.rich_text.map(t => t.plain_text).join("")}\n`;
      } else if (block.type === "bulleted_list_item") {
        rulesText += `* ${block.bulleted_list_item.rich_text.map(t => t.plain_text).join("")}\n`;
      } else if (block.type === "numbered_list_item") {
        rulesText += `1. ${block.numbered_list_item.rich_text.map(t => t.plain_text).join("")}\n`;
      }
    }
    return rulesText.trim();
  } catch (error) {
    console.warn("⚠️ 開発ルールの取得に失敗しました。デフォルト設定で進行します:", error.message);
    return "※開発ルールの取得に失敗しました。標準的なクリーンコードに準拠してください。";
  }
}

async function main() {
  const taskInfoPath = path.join(__dirname, '../task_info.json');

  // 直前ステップが作成した task_info.json の読み込み
  if (!fs.existsSync(taskInfoPath)) {
    console.error('❌ エラー: task_info.json が見つかりません。');
    process.exit(1);
  }

  const taskInfo = JSON.parse(fs.readFileSync(taskInfoPath, 'utf8'));
  const { TASK_ID, TITLE, DESCRIPTION } = taskInfo;

  // 💡 Notionから最新の開発ルールを取得
  const developmentRules = await fetchNotionRules(RULE_PAGE_ID);

  console.log(`🤖 Claude Code（OAuth定額枠）によるコード生成を開始します...`);
  console.log(`📝 タスクID: ${TASK_ID}`);
  console.log(`📌 タイトル: ${TITLE}`);

  // 3. Claude へのプロンプト（指示書）の作成
  // 💡 Notionから取得した開発ルールをプロンプト内に動的に埋め込みます
  const promptContent = `
あなたはシニアソフトウェアエンジニアとして、与えられたタスクの仕様（仕様書）に基づき、本番用コードとそれに対応するテストコードを生成する役割を担っています。

以下の「開発規約・ルール」を【最優先で厳守】してコーディングを行ってください。

=========================================
【最優先】AI03開発ルール
=========================================
${developmentRules}
=========================================

上記のルールをすべて遵守した上で、以下のタスク仕様に基づき必要なプログラムとテストコードを作成してください。

■ タスク情報
- タスクID: ${TASK_ID}
- タイトル: ${TITLE}
- 詳細仕様:
${DESCRIPTION}

【開発ルール】
1. 指定された仕様を満たすソースコードを作成してください。
2. 作成したソースコードに対応する、網羅的なテストコードを作成してください。
3. コードの作成が完了したら、現在のプロジェクトディレクトリに適切なファイルパスで直接書き出して保存してください（例: src/utils/math.ts, test/utils/math.test.ts）。
4. すべてのファイルの書き出しを終えたら、処理を終了してください。
`.trim();

  // プロンプトを一時ファイルとして保存
  const tempPromptPath = path.join(__dirname, `../temp_prompt_${TASK_ID}.txt`);
  fs.writeFileSync(tempPromptPath, promptContent, 'utf8');

  try {
    console.log("🤖 Claude Codeを実行中（非対話・オートメーションモード）...");

    // 4. Claude Code CLI の呼び出し
    const result = spawnSync(
      "claude",
      ["--print", fs.readFileSync(tempPromptPath, "utf8")],
      { 
        encoding: "utf8", 
        stdio: "pipe",
        env: { ...process.env } // GitHub Actionsから渡された環境変数を引き継ぐ
      }
    );

    // 一時プロンプトファイルを削除
    if (fs.existsSync(tempPromptPath)) {
      fs.unlinkSync(tempPromptPath);
    }

    // コマンド自体の実行に失敗した場合
    if (result.status !== 0) {
      console.error("❌ Claude Code CLI エラーが発生しました:");
      console.error(result.stderr);
      process.exit(1);
    }

    // Claude Code がコンソールに出力したログを表示
    console.log("\n--- Claude Code 実行ログ ---");
    console.log(result.stdout);
    console.log("-----------------------------\n");

    console.log('✅ Claude Code によるファイルの自動生成・書き出しが正常に完了しました！');

  } catch (error) {
    console.error('❌ Claudeのコード生成プロセスで例外エラーが発生しました:');
    console.error(error);
    if (fs.existsSync(tempPromptPath)) fs.unlinkSync(tempPromptPath);
    process.exit(1);
  }
}

main();
