/**
 * claude-coder.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// 💡 画像の正規URLに基づき、共通参照ページのIDを正しい値へ修正しました
const SYSTEM_OVERVIEW_PAGE_ID = "3884c3b4a172807baeacecf6aebded62"; // AI03_システム概要
const TABLE_DEF_PAGE_ID = "3884c3b4a172803c90b9e21a0774175c";       // AI03_テーブル定義

/**
 * 指定されたディレクトリ配下のファイルを再帰的に探索し、ソースコードを取得する関数
 */
function getAllExistingSources(dirPath, extensions = ['.java', '.ts', '.js', '.py']) {
  let results = "";
  if (!fs.existsSync(dirPath)) return results;

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'build') {
        results += getAllExistingSources(fullPath, extensions);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
        const codeBody = fs.readFileSync(fullPath, 'utf8');
        results += `\n--- 既存ファイル: ${relativePath} ---\n${codeBody}\n`;
      }
    }
  }
  return results;
}

/**
 * Notionの開発ルールページからテキストブロックを抽出する関数
 */
async function fetchNotionRules(pageId) {
  try {
    console.log(`📥 Notionからページ (ID: ${pageId}) の情報を取得中...`);
    const response = await notion.blocks.children.list({ block_id: pageId });
    let rulesText = "";
    for (const block of response.results) {
      if (block.type === "paragraph") rulesText += block.paragraph.rich_text.map(t => t.plain_text).join("") + "\n";
      else if (block.type === "heading_1") rulesText += `\n# ${block.heading_1.rich_text.map(t => t.plain_text).join("")}\n`;
      else if (block.type === "heading_2") rulesText += `\n## ${block.heading_2.rich_text.map(t => t.plain_text).join("")}\n`;
      else if (block.type === "heading_3") rulesText += `\n### ${block.heading_3.rich_text.map(t => t.plain_text).join("")}\n`;
      else if (block.type === "bulleted_list_item") rulesText += `* ${block.bulleted_list_item.rich_text.map(t => t.plain_text).join("")}\n`;
      else if (block.type === "numbered_list_item") rulesText += `1. ${block.numbered_list_item.rich_text.map(t => t.plain_text).join("")}\n`;
      else if (block.type === "table") {
        rulesText += "\n[テーブルデータ]\n";
      }
    }
    return rulesText.trim();
  } catch (error) {
    console.warn("⚠️ ページの取得に失敗しました。デフォルト進行:", error.message);
    return "※標準的なクリーンコードに準拠してください。";
  }
}

/**
 * 指定された親ページの配下にあるすべてのサブページ（子ページ）を巡回し、
 * 各テーブル定義などの中身のテキストをすべて結合して取得する関数
 */
async function fetchAllSubPagesContent(parentPageId) {
  let allContent = "";
  try {
    const response = await notion.blocks.children.list({ block_id: parentPageId });
    
    for (const block of response.results) {
      if (block.type === 'child_page' && block.id) {
        const subPageTitle = block.child_page.title || "名称未設定テーブル";
        console.log(`  └ 🔍 サブページを発見: 「${subPageTitle}」の内容を読み込み中...`);
        
        const subPageText = await fetchNotionRules(block.id.replace(/-/g, ''));
        allContent += `\n\n--- 📄 テーブル定義詳細：${subPageTitle} ---\n${subPageText}`;
      }
    }
  } catch (err) {
    console.error(`  ⚠️ サブページの自動巡回中にエラーが発生しました:`, err.message);
  }
  return allContent;
}

async function main() {
  const taskInfoPath = path.join(__dirname, '../task_info.json');
  if (!fs.existsSync(taskInfoPath)) {
    console.error('❌ エラー: task_info.json が見つかりません。');
    process.exit(1);
  }

  const taskInfo = JSON.parse(fs.readFileSync(taskInfoPath, 'utf8'));
  const { TASK_ID, TITLE, DESCRIPTION, PAGE_ID, CLASS_NAME, PACKAGE_NAME, SCREEN_ITEMS } = taskInfo;
  
  // 💡 削除された開発ルールのフェッチ処理を除外しました
  const systemOverview = await fetchNotionRules(SYSTEM_OVERVIEW_PAGE_ID);
  
  const tableDefinitionsParent = await fetchNotionRules(TABLE_DEF_PAGE_ID);
  console.log("🗂️ 「AI03_テーブル定義」配下の全サブページを自動スキャンしています...");
  const subPagesContent = await fetchAllSubPagesContent(TABLE_DEF_PAGE_ID);
  const tableDefinitions = `${tableDefinitionsParent}\n${subPagesContent}`;

  const taskBodyContent = PAGE_ID ? await fetchNotionRules(PAGE_ID) : "なし";

  console.log("📂 Gitにコミット済みの既存ソースコードを自動スキャン中...");
  const projectRoot = path.join(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src'); 
  
  let injectedBaseSources = getAllExistingSources(srcDir, ['.java', '.ts', '.js']);
  
  if (!injectedBaseSources) {
    injectedBaseSources = "（現在リポジトリの対象ディレクトリ内に既存のソースファイルはありません。新規に構造を設計してください）\n";
  }

  console.log(`🤖 Claude Codeによる詳細な構造化コード生成を開始します...`);

  const promptContent = `
あなたはシニアソフトウェアエンジニアとして、Notionかんばんから連携された以下の詳細プロパティ情報に基づき、最適な本番コードおよびテストコードを生成してください。

=========================================
📌 【最重要：実装の前提・参考にする既存のソースコード】
=========================================
${injectedBaseSources}
=========================================

■ かんばんプロパティ情報
- タスクID: ${TASK_ID}
- 機能・画面名: ${TITLE}
- パッケージ名: ${PACKAGE_NAME || '未入力'}
- クラス名: ${CLASS_NAME || '未入力'}
- 画面項目: 
${SCREEN_ITEMS || 'なし'}
- 機能概要・仕様:
${DESCRIPTION}

=========================================
📌 【共通参照情報：システム概要】
=========================================
アプリケーション全体の基本仕様・アーキテクチャ概要です。実装時に全体の整合性を保ってください：

${systemOverview}

=========================================
📌 【共通参照情報：テーブル定義（関連定義含む）】
=========================================
データベース構造および関連するテーブルの定義情報です。データの永続化やクエリ、エンティティ設計の際に必ず参照し、正確にマッピングしてください：

${tableDefinitions}
=========================================

=========================================
【最重要：画面ごとの詳細アクション・仕様テーブル】
=========================================
Notionのタスク本文から抽出された、ボタン操作や具体的なアクション仕様です。
コードにロジックを実装する際は、以下の内容をすべて網羅して確実に反映してください：

${taskBodyContent}
=========================================

【厳格な開発・出力ルール】
1. 指定されたパッケージ名、クラス名がある場合は完全に準拠してソースコードを作成してください。もし未入力の場合は、仕様から最適な「クラス名」と「パッケージ名」をあなたが決定して作成してください。
2. 画面項目が定義されている場合、それらの入力項目やボタンアクション、バリデーションロジックを漏れなく実装してください。
3. コード生成時、もし複数のソースファイルに分割して作成した場合は、後述の「マルチファイル報告タグ」を使用して作成したファイルをシステムに明確に伝えてください。
4. ファイルは現在のプロジェクトディレクトリ内の適切なパスへ直接書き出して保存してください。

=========================================
🚨 【最優先・絶対遵守】クラス名・パッケージ名の報告ルール
=========================================
あなたはすべての処理（ファイル作成・修正）を完了したあと、回答の「一番最後」に、今回実際に作成・決定した「メインのクラス名」と「パッケージ名」を【必ず】【一言一句違わず】以下のタグ形式で出力しなければなりません。
このタグが出力に含まれていない場合、システムが正常に動作しません。解説や補足はタグの外側に書き、タグの中身は指定の形式のみとしてください。

[METADATA_REPORT_START]
- class: (作成したメインのクラス名)
- package: (作成したパッケージ名。もしデフォルトパッケージの場合は com.example などの適切な識別子を補うか、無ければ空欄にしてください。余計な日本語の解説文は絶対に混ぜないでください)
[METADATA_REPORT_END]

=========================================
💡 【重要：仕様追加・変更時の書き戻しルール】
=========================================
ソースコード作成・修正の過程で、元の仕様にない項目の追加やアクションの変更、新しい仕様の定義が発生した場合は、それらをNotionの本文テーブルに同期するため、必ず以下のフォーマットで報告してください。
項目、アクション、仕様の3つを「|」で区切って記述してください。複数ある場合は改行して複数行書いてください。追加がない場合はこのタグ自体を出力しないでください。

[NOTION_FEEDBACK_START]
項目名 | アクション内容 | 追加・変更された仕様の具体的な詳細
[NOTION_FEEDBACK_END]

=========================================
💡 【重要：複数ソース生成時のマルチファイル報告ルール】
=========================================
[MULTIFILE_REPORT_START]
- file: (ファイルパス1)
  summary: (このファイルの役割・クラス概要)
[MULTIFILE_REPORT_END]

重ねて警告します。回答の末尾には必ず \`METADATA_REPORT_START\` と \`METADATA_REPORT_END\` のタグを正確に出力してください。
`.trim();

  const tempPromptPath = path.join(__dirname, `../temp_prompt_${TASK_ID}.txt`);
  fs.writeFileSync(tempPromptPath, promptContent, 'utf8');

  try {
    console.log("🤖 Claude Codeを実行中（オートメーションモード）...");
    const result = spawnSync("claude", ["--print", "--dangerously-skip-permissions", fs.readFileSync(tempPromptPath, "utf8")], {
      encoding: "utf8", stdio: "pipe", env: { ...process.env }
    });

    if (fs.existsSync(tempPromptPath)) fs.unlinkSync(tempPromptPath);
    if (result.status !== 0) {
      console.error("❌ Claude Code CLI エラー:", result.stderr);
      process.exit(1);
    }

    const outputText = result.stdout;
    console.log("\n--- Claude Code 実行ログ ---\n", outputText, "\n-----------------------------\n");

    let finalClass = "";
    let finalPackage = "";

    // 🔍 【クラス名・パッケージ名の書き戻しロジック】
    const metadataRegex = /\[METADATA_REPORT_START\]([\s\S]*?)\[METADATA_REPORT_END\]/i;
    const metadataMatch = outputText.match(metadataRegex);

    if (metadataMatch && metadataMatch[1] && PAGE_ID) {
      console.log("📝 Claudeが作成したクラス名とパッケージ名を検出。Notionを更新します...");
      
      const metaContent = metadataMatch[1]; 
      const metaLines = metaContent.split('\n');

      for (const line of metaLines) {
        const cleanLine = line.replace(/^[-*\s[\]]+/, '').trim();
        
        if (cleanLine.toLowerCase().startsWith('class')) {
          finalClass = cleanLine.replace(/^class\s*:\s*/i, '').trim();
        }
        if (cleanLine.toLowerCase().startsWith('package')) {
          finalPackage = cleanLine.replace(/^package\s*:\s*/i, '').trim();
        }
      }

      finalClass = finalClass.replace(/[()\[\]]/g, '').trim();
      finalPackage = finalPackage.replace(/[()\[\]]/g, '').trim();

      if (/[ぁ-んァ-ヶ一-龠]/.test(finalClass)) {
        console.log(`  └ ⚠️ クラス名に日本語が含まれているため、純粋なクラス名の抽出を試みます: "${finalClass}"`);
        const classMatch = finalClass.match(/[a-zA-Z0-9_]+/);
        if (classMatch) {
          finalClass = classMatch[0];
          console.log(`    └ 🎯 クラス名抽出成功: "${finalClass}"`);
        }
      }

      if (/[ぁ-んァ-ヶ一-龠]/.test(finalPackage)) {
        console.log(`  └ ⚠️ パッケージ名に日本語が含まれているため、純粋な識別子の抽出を試みます: "${finalPackage}"`);
        const packageExtractRegex = /[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+/;
        const match = finalPackage.match(packageExtractRegex);
        
        if (match) {
          finalPackage = match[0];
          console.log(`    └ 🎯 パッケージ名抽出成功: "${finalPackage}"`);
        } else {
          console.log(`    └ ❌ 識別子が見つからないため、空欄として扱います。`);
          finalPackage = "";
        }
      }

      console.log(`  └ 💡 抽出結果 -> クラス名: "${finalClass}", パッケージ名: "${finalPackage}"`);

      if (finalClass || finalPackage) {
        try {
          const updateProps = {};
          if (finalClass) {
            updateProps["クラス名"] = { rich_text: [{ type: "text", text: { content: finalClass } }] };
          }
          updateProps["パッケージ名"] = { rich_text: [{ type: "text", text: { content: finalPackage } }] };

          await notion.pages.update({
            page_id: PAGE_ID,
            properties: updateProps
          });
          console.log(`✅ Notionのプロパティを更新しました (クラス名: ${finalClass}, パッケージ名: ${finalPackage})`);
        } catch (err) {
          console.error("⚠️ Notionプロパティ更新エラー:", err.message);
          process.exit(1);
        }
      } else {
        console.error("❌ エラー: メタデータタグは見つかりましたが、中身からclassやpackageの値を特定できませんでした。");
        process.exit(1);
      }
    } else {
      console.error("❌ エラー: ログ内に METADATA_REPORT_START または END タグが正しく検出されませんでした。処理を中止します。");
      process.exit(1);
    }

    // 🔍 1. 仕様追加・変更の「シンプルなテーブル（表）ブロック」への行追記ロジック
    const feedbackRegex = /\[NOTION_FEEDBACK_START\]([\s\S]*?)\[NOTION_FEEDBACK_END\]/;
    const feedbackMatch = outputText.match(feedbackRegex);
    
    if (feedbackMatch && feedbackMatch[1] && PAGE_ID) {
      console.log("📝 Claudeによる仕様変更・追加の検知。本文の仕様テーブルに行を直接追記します...");
      const feedbackLines = feedbackMatch[1].trim().split('\n');
      
      try {
        const pageBlocks = await notion.blocks.children.list({ block_id: PAGE_ID });
        const tableBlock = pageBlocks.results.find(b => b.type === 'table');
        
        if (tableBlock) {
          for (const line of feedbackLines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) {
              const itemName = parts[0];
              const actionName = parts[1] || "未入力";
              const specDetail = parts[2] || "自動追加";

              await notion.blocks.children.append({
                block_id: tableBlock.id,
                children: [
                  {
                    object: 'block',
                    type: 'table_row',
                    table_row: {
                      cells: [
                        [{ type: 'text', text: { content: itemName } }],
                        [{ type: 'text', text: { content: actionName } }],
                        [{ type: 'text', text: { content: specDetail } }]
                      ]
                    }
                  }
                ]
              });
              console.log(`  └ 📝 仕様テーブルに行を追加しました: ${itemName}`);
            }
          }
        } else {
          const childrenPayload = [
            { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: "🤖 自動追加された追加仕様項目" } }] } }
          ];
          for (const line of feedbackLines) {
            childrenPayload.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: line } }] } });
          }
          await notion.blocks.children.append({ block_id: PAGE_ID, children: childrenPayload });
          console.log("  └ 📝 ページ末尾にテキストとして仕様変更を追記しました。");
        }
      } catch (err) {
        console.error("  └ ⚠️ 本文テーブルへの書き戻しに失敗しました:", err.message);
      }
    }

    // 🔍 2. 複数ソースファイル生成時のタスク分解
    const multiFileRegex = /\[MULTIFILE_REPORT_START\]([\s\S]*?)\[MULTIFILE_REPORT_END\]/;
    const multiFileMatch = outputText.match(multiFileRegex);
    if (multiFileMatch && multiFileMatch[1] && DATABASE_ID) {
      console.log("🗂️ 複数ファイルの生成報告を検知。タスクを分解起票します...");
      const reportLines = multiFileMatch[1].split('\n');
      let currentFile = ""; let currentSummary = "";

      for (const line of reportLines) {
        if (line.includes('- file:')) {
          if (currentFile) await createSubTaskInNotion(DATABASE_ID, TASK_ID, TITLE, finalPackage, currentFile, currentSummary);
          currentFile = line.replace('- file:', '').trim(); currentSummary = "";
        } else if (line.includes('summary:')) {
          currentSummary = line.replace('summary:', '').trim();
        } else if (line.trim() && !line.includes('START') && !line.includes('END')) {
          currentSummary += " " + line.trim();
        }
      }
      if (currentFile) await createSubTaskInNotion(DATABASE_ID, TASK_ID, TITLE, finalPackage, currentFile, currentSummary);
    }
    console.log('✅ すべての複合自動化プロセスが正常に完了しました！');
  } catch (error) { console.error('❌ 例外エラー:', error); process.exit(1); }
}

async function createSubTaskInNotion(dbId, parentTaskId, parentTitle, parentPackage, filePath, summary) {
  try {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    const cleanFileName = fileName.split('\\').pop().split('/').pop();
    const classNameCandidate = cleanFileName.replace(ext, '').trim();

    if (!classNameCandidate) {
      console.log(`  └ ⚠️ クラス名が特定できないため、スキップします: ${cleanFileName}`);
      return;
    }

    const filterAnd = [
      { property: "クラス名", rich_text: { equals: classNameCandidate } }
    ];
    if (parentPackage) {
      filterAnd.push({ property: "パッケージ名", rich_text: { equals: parentPackage } });
    }

    const existingCheck = await notion.databases.query({
      database_id: dbId,
      filter: { and: filterAnd },
      page_size: 1
    });

    if (existingCheck.results && existingCheck.results.length > 0) {
      console.log(`  └ ⏭️ 重複防止: クラス名「${classNameCandidate}」（パッケージ: ${parentPackage || "なし"}）は既に存在するため、かんばんへの追加をスキップします。`);
      return;
    }

    const originalTaskIdRule = `${parentTaskId}-${classNameCandidate.toUpperCase()}`;

    const propertiesPayload = {
      "名称": { title: [{ type: "text", text: { content: `ソース個別配備: ${cleanFileName} (${parentTitle})` } }] },
      "ステータス": { status: { name: "Git格納済み" } },
      "タスクID": { rich_text: [{ type: "text", text: { content: originalTaskIdRule } }] },
      "クラス名": { rich_text: [{ type: "text", text: { content: classNameCandidate } }] }
    };

    if (parentPackage) {
      propertiesPayload["パッケージ名"] = { rich_text: [{ type: "text", text: { content: parentPackage } }] };
    }

    if (summary) {
      propertiesPayload["機能概要"] = { rich_text: [{ type: "text", text: { content: `親タスク ${parentTaskId} から分割生成されたファイル。\n役割: ${summary}` } }] };
    }

    await notion.pages.create({
      parent: { database_id: dbId },
      properties: payload === undefined ? propertiesPayload : payload
    });
    console.log(`  └ 🎉 新規起票成功: ${cleanFileName} (タスクID: ${originalTaskIdRule})`);
  } catch (err) { 
    console.error(`  └ ⚠️ 新規起票失敗 (${filePath}):`, err.message); 
  }
}

main();
