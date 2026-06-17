const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require("@notionhq/client");

// Notionクライアントの初期化
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID; // 💡 複数ソース生成時に新規ページを作るため追加

// 「AI03開発ルール」のNotionページIDを指定
const RULE_PAGE_ID = "3814c3b4a17280e18f9dc4ee0ba5019b"; 

/**
 * Notionのページから開発ルールを取得する関数
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

  if (!fs.existsSync(taskInfoPath)) {
    console.error('❌ エラー: task_info.json が見つかりません。');
    process.exit(1);
  }

  const taskInfo = JSON.parse(fs.readFileSync(taskInfoPath, 'utf8'));
  // 💡 cron-scheduler.js等から渡されるNotionプロパティ情報をフル活用
  const { TASK_ID, TITLE, DESCRIPTION, PAGE_ID, CLASS_NAME, PACKAGE_NAME, SCREEN_ITEMS, ENTIRE_PROPERTIES } = taskInfo;

  // Notionから最新の開発ルールを取得
  const developmentRules = await fetchNotionRules(RULE_PAGE_ID);

  console.log(`🤖 Claude Codeによる詳細な構造化コード生成を開始します...`);
  console.log(`📝 タスクID: ${TASK_ID} | クラス名: ${CLASS_NAME || '未入力'} | パッケージ: ${PACKAGE_NAME || '未入力'}`);

  // 3. かんばんプロパティに適合させた強固なプロンプトの設計
  const promptContent = `
あなたはシニアソフトウェアエンジニアとして、Notionかんばんから連携された以下の詳細プロパティ情報に基づき、最適な本番コードおよびテストコードを生成してください。

=========================================
【最優先】AI03開発ルール
=========================================
${developmentRules}
=========================================

■ かんばんプロパティ情報
- タスクID: ${TASK_ID}
- 機能・画面名: ${TITLE}
- パッケージ名: ${PACKAGE_NAME || '未入力（適切な位置を決定してください）'}
- クラス名: ${CLASS_NAME || '未入力（適切な名前を決定してください）'}
- 画面項目: 
${SCREEN_ITEMS || 'なし'}
- 機能概要・仕様:
${DESCRIPTION}

【厳格な開発・出力ルール】
1. 指定されたパッケージ名、クラス名に完全に準拠してソースコードを作成してください。
2. 画面項目が定義されている場合、それらの入力項目やボタンアクション、バリデーションロジックを漏れなく実装してください。
3. コード生成時、もし複数のソースファイル（例: コントローラー、DTO、エンティティ、サービスなど）に分割して作成した場合は、後述の「マルチファイル報告タグ」を使用して作成したファイルをシステムに明確に伝えてください。
4. ファイルは現在のプロジェクトディレクトリ内の適切なパス（例: src/main/java/... や src/...）へ直接書き出して保存してください。

=========================================
💡 【重要：仕様追加・変更時の書き戻しルール】
=========================================
開発中に仕様の不足、新しい画面項目の追加、実装上定義した特別ルールや考慮事項がある場合は、以下のタグで囲んで出力してください。
[NOTION_FEEDBACK_START]
- 追加された画面項目: (具体的に)
- 変更・追加された仕様: (理由と内容)
[NOTION_FEEDBACK_END]

=========================================
💡 【重要：複数ソース生成時のマルチファイル報告ルール】
=========================================
もし複数のファイルを生成した場合は、作成した全ファイルのパスと概要を以下のタグで囲んで出力してください。
[MULTIFILE_REPORT_START]
- file: (ファイルパス1)
  summary: (このファイルの役割・クラス概要)
- file: (ファイルパス2)
  summary: (このファイルの役割・クラス概要)
[MULTIFILE_REPORT_END]

すべてのファイル書き出しを終えたら、処理を終了してください。
`.trim();

  const tempPromptPath = path.join(__dirname, `../temp_prompt_${TASK_ID}.txt`);
  fs.writeFileSync(tempPromptPath, promptContent, 'utf8');

  try {
    console.log("🤖 Claude Codeを実行中（オートメーションモード）...");

    const result = spawnSync(
      "claude",
      ["--print", fs.readFileSync(tempPromptPath, "utf8")],
      { 
        encoding: "utf8", 
        stdio: "pipe",
        env: { ...process.env }
      }
    );

    if (fs.existsSync(tempPromptPath)) {
      fs.unlinkSync(tempPromptPath);
    }

    if (result.status !== 0) {
      console.error("❌ Claude Code CLI エラーが発生しました:");
      console.error(result.stderr);
      process.exit(1);
    }

    console.log("\n--- Claude Code 実行ログ ---");
    const outputText = result.stdout;
    console.log(outputText);
    console.log("-----------------------------\n");

    // ========================================================
    // 🔍 1. 仕様追加・変更を検知した場合のかんばん書き戻し処理
    // ========================================================
    const feedbackRegex = /\[NOTION_FEEDBACK_START\]([\s\S]*?)\[NOTION_FEEDBACK_END\]/;
    const feedbackMatch = outputText.match(feedbackRegex);

    if (feedbackMatch && feedbackMatch[1] && PAGE_ID) {
      const aiFeedback = feedbackMatch[1].trim();
      console.log("📝 仕様追加フィードバックを検知。Notionかんばんへ書き戻します...");

      try {
        await notion.blocks.children.append({
          block_id: PAGE_ID,
          children: [
            {
              object: "block",
              type: "heading_3",
              heading_3: { rich_text: [{ type: "text", text: { content: "🤖 Claude Code が自動追加した画面項目・仕様変更" } }] }
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content: aiFeedback } }],
                color: "blue_background"
              }
            }
          ]
        });
        console.log("✅ Notionかんばんのタスク詳細に追記しました。");
      } catch (err) {
        console.error("⚠️ Notion追記エラー:", err.message);
      }
    }

    // ========================================================
    // 🔍 2. 複数ソースファイルが生成された場合の個別かんばん新規起票処理
    // ========================================================
    const multiFileRegex = /\[MULTIFILE_REPORT_START\]([\s\S]*?)\[MULTIFILE_REPORT_END\]/;
    const multiFileMatch = outputText.match(multiFileRegex);

    if (multiFileMatch && multiFileMatch[1] && DATABASE_ID) {
      console.log("🗂️ 複数ファイルの生成報告を検知しました。ソースごとにかんばんタスクを分解起票します...");
      const reportLines = multiFileMatch[1].split('\n');
      
      let currentFile = "";
      let currentSummary = "";

      for (const line of reportLines) {
        if (line.includes('- file:')) {
          // 前のファイル情報が完成していればNotionに起票
          if (currentFile) {
            await createSubTaskInNotion(DATABASE_ID, TASK_ID, TITLE, currentFile, currentSummary);
          }
          currentFile = line.replace('- file:', '').trim();
          currentSummary = "";
        } else if (line.includes('summary:')) {
          currentSummary = line.replace('summary:', '').trim();
        } else if (line.trim() && !line.includes('START') && !line.includes('END')) {
          currentSummary += " " + line.trim();
        }
      }
      // 最後の1ファイル分を起票
      if (currentFile) {
        await createSubTaskInNotion(DATABASE_ID, TASK_ID, TITLE, currentFile, currentSummary);
      }
    }

    console.log('✅ すべての複合自動化プロセスが正常に完了しました！');

  } catch (error) {
    console.error('❌ 例外エラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * 💡 複数ファイルが生成された際に、ソース単位でNotionかんばんにタスクを新規起票するヘルパー関数
 */
async function createSubTaskInNotion(dbId, parentTaskId, parentTitle, filePath, summary) {
  try {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    const classNameCandidate = fileName.replace(ext, '');

    console.log(`➕ 新規起票中: [${classNameCandidate}] ${fileName}`);

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        "名前": {
          title: [{ type: "text", text: { content: `ソース個別配備: ${fileName} (${parentTitle})` } }]
        },
        "ステータス": {
          status: { name: "作成完了" } // 生成済みのため作成完了で起票
        },
        "タスクID": {
          rich_text: [{ type: "text", text: { content: `${parentTaskId}-${classNameCandidate.toUpperCase()}` } }]
        },
        "クラス名": {
          rich_text: [{ type: "text", text: { content: classNameCandidate } }]
        },
        "機能概要": {
          rich_text: [{ type: "text", text: { content: `親タスク ${parentTaskId} から分割生成されたソースファイル群の個別管理レコード。\n役割: ${summary}` } }]
        }
      }
    });
    console.log(`  └ ページ作成成功: ${fileName}`);
  } catch (err) {
    console.error(`  └ ⚠️ 新規起票に失敗しました (${filePath}):`, err.message);
  }
}

main();
