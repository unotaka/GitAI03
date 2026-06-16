const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

// 1. Anthropic API クライアントの初期化（環境変数 ANTHROPIC_API_KEY を自動参照します）
const anthropic = new Anthropic();

async function main() {
  const taskInfoPath = path.join(__dirname, '../task_info.json');

  // 2. 直前ステップが作成した task_info.json の読み込み
  if (!fs.existsSync(taskInfoPath)) {
    console.error('❌ エラー: task_info.json が見つかりません。');
    process.exit(1);
  }

  const taskInfo = JSON.parse(fs.readFileSync(taskInfoPath, 'utf8'));
  const { TASK_ID, TITLE, DESCRIPTION } = taskInfo;

  console.log(`🤖 Claudeによるコード生成を開始します...`);
  console.log(`📝 タスクID: ${TASK_ID}`);
  console.log(`📌 タイトル: ${TITLE}`);

  // 3. Claude へのプロンプト（指示書）の作成
  const systemPrompt = `
あなたはシニアソフトウェアエンジニアとして、与えられたタスクの仕様（仕様書）に基づき、本番用コードとそれに対応するテストコードを生成する役割を担っています。

【出力ルール（厳守）】
成果物は以下のJSONフォーマットのみで出力してください。マークダウンの解説文（「はい、分かりました」など）や、\`\`\`json などのバッククォートでの囲みは一切含めず、純粋なJSON文字列データのみを返してください。

{
  "files": [
    {
      "path": "生成するファイルの相対パス（例: src/utils/math.js）",
      "content": "ファイルの内容（ソースコード）"
    },
    {
      "path": "テストファイルの相対パス（例: test/utils/math.test.js）",
      "content": "ファイルの内容（テストコード）"
    }
  ]
}
`;

  const userPrompt = `
以下のタスク仕様に基づき、必要なプログラムとテストコードを作成してください。

■ タスク情報
- タスクID: ${TASK_ID}
- タイトル: ${TITLE}
- 詳細仕様:
${DESCRIPTION}

それでは、指示されたJSONフォーマットのみで出力してください。
`;

  try {
    // 4. Claude APIの呼び出し (グループプランでも標準的に推奨される claude-3-5-sonnet を使用)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // 2026年現在も主流の高性能モデル
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let rawOutput = response.content[0].text.trim();

    // AIが誤ってマークダウンのコードブロックで囲ってしまった場合の保険処理
    if (rawOutput.startsWith('```json')) {
      rawOutput = rawOutput.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawOutput.startsWith('```')) {
      rawOutput = rawOutput.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 5. 返ってきたJSONのパース
    const result = JSON.parse(rawOutput);

    if (!result.files || !Array.isArray(result.files)) {
      throw new Error('APIのレスポンス形式が不正です（"files" 配列がありません）。');
    }

    // 6. 生成されたコードを実際のファイルとして書き出し
    for (const file of result.files) {
      const fullPath = path.join(__dirname, '..', file.path);
      const dirPath = path.dirname(fullPath);

      // ディレクトリが存在しない場合は自動作成
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, file.content, 'utf8');
      console.log(`💾 ファイルを書き出しました: ${file.path}`);
    }

    console.log('✅ すべてのファイルの生成と書き出しが正常に完了しました！');

  } catch (error) {
    console.error('❌ Claudeのコード生成プロセスでエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

main();
