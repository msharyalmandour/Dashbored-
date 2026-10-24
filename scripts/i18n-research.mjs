// يولّد src/i18n/research-en.json: ترجمات نصوص tre()/trxe() فقط (صفحات البحث اللي تطلع إنجليزي حتى بالعربي)
// من القاموس الكامل src/i18n/en/*.json. شغّلوه بعد ما تضيفون نص tre جديد: node scripts/i18n-research.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const norm = (s) => s.replace(/\s+/g, " ").trim();
const dict = {};
const dictDir = path.join(root, "src/i18n/en");
for (const f of fs.readdirSync(dictDir)) if (f.endsWith(".json")) Object.assign(dict, JSON.parse(fs.readFileSync(path.join(dictDir, f), "utf8")));

const out = {};
const missing = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      if (!/\btrx?e\(/.test(src)) continue;
      const ast = parse(src, { sourceType: "module", plugins: ["typescript", "jsx"] });
      (function visit(n) {
        if (!n || typeof n.type !== "string") return;
        if (n.type === "CallExpression" && (n.callee.name === "tre" || n.callee.name === "trxe") && n.arguments[0]?.type === "StringLiteral") {
          const k = norm(n.arguments[0].value);
          if (k in dict) out[k] = dict[k];
          else if (/[؀-ۿ]/.test(k)) missing.push(`${path.relative(root, p)}: ${k}`);
        }
        for (const key of Object.keys(n)) {
          if (key === "loc") continue;
          const v = n[key];
          if (Array.isArray(v)) v.forEach(visit);
          else if (v && typeof v.type === "string") visit(v);
        }
      })(ast.program);
    }
  }
})(path.join(root, "src"));

fs.writeFileSync(path.join(root, "src/i18n/research-en.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`research-en.json: ${Object.keys(out).length} entries`);
if (missing.length) console.log(`no translation yet (${missing.length}):\n` + missing.join("\n"));
