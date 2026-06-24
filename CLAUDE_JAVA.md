# Java コーディングガイドライン ＆ プロジェクトルール

このドキュメントは、このJavaリポジトリにおけるコーディング標準、制約事項、およびプロジェクトコマンドを定義したものです。Claudeはコードの生成やリファクタリングを行う際、これらのルールを厳格に遵守しなければなりません。

---

## 1. 開発環境・アーキテクチャ
- **Java バージョン:** JDK 17 以上（record、テキストブロック、switch式などのモダンな構文を積極的に使用すること）
- **ビルドツール:** Gradle (Kotlin DSL を使用、`build.gradle.kts`)
- **フレームワーク:** Spring Boot 3.x
- **アーキテクチャ:** レイヤードアーキテクチャ（Controller -> Service -> Repository）

---

## 2. 命名規則
- **クラス / インターフェース:** `PascalCase`（例: `UserService`, `OrderController`）
  - インターフェースに接頭辞 `I` は付けないこと（`IUserService` ではなく `UserService` とする）。
- **メソッド / 変数:** `camelCase`（例: `getUserById`, `totalPrice`）
- **定数:** `UPPER_SNAKE_CASE`（例: `MAX_RETRY_COUNT`）
- **パッケージ名:** 小文字のみ、ドット区切り（例: `com.example.project.service`）

---

## 3. コーディングスタイル・推奨事項 (DO)
- **Null安全:** 値が空になる可能性があるメソッドは `java.util.Optional<T>` を返却すること。コレクションを返す場合は絶対に `null` を返さず、`Collections.emptyList()` などを返却すること。
- **不変性 (Immutability):** 可能な限りオブジェクトは不変に保つこと。DTOや値オブジェクトには `record` を優先して使用すること。
- **Lombokの利用:** コンストラクタインジェクションを行う際は、Lombokの `@RequiredArgsConstructor` を使用すること。`@Data` は副作用が多いため極力避け、必要に応じて `@Getter` や `@Setter` を個別に付与すること。
- **Stream API:** コレクションの処理には Stream API を使用し、宣言的で可読性の高いコードを書くこと。
- **例外処理:** `catch (Exception e)` などの汎用的なキャッチは避け、具体的な例外クラスをキャッチすること。ビジネスロジックのエラーはカスタム例外をスローし、Springの `@ResponseStatus` や `@ControllerAdvice` でハンドリングすること。

---

## 4. 禁止事項 (DO NOT)
- **フィールドインジェクションの禁止:** フィールドに対する `@Autowired` は使用禁止。必ずコンストラクタインジェクションを使用すること。
- **System.out の禁止:** `System.out.println()` は使用しないこと。ログ出力には必ずロガー（Lombokの `@Slf4j` など）を使用すること。
- **原型 (Raw Type) の禁止:** ジェネリクスで型を省略しないこと（単なる `List` ではなく、`List<String>` のように記述する）。
- **マジックナンバーの禁止:** ロジック内で生の数値や文字列をそのまま使わず、必ず定数（`private static final`）や Enum 定義を行うこと。

---

## 5. ビルドおよびテストコマンド
コードの変更を確認・検証する際は、以下のコマンドを使用してください。
- **プロジェクトのビルド:** `./gradlew build -x test`
- **テストの実行:** `./gradlew test`
- **静的解析（リンター）の実行:** `./gradlew checkstyleMain`
