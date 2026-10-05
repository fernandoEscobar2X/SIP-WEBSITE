/** Verifica el contenido del índice antes de publicar; no imprime valores de secretos. */
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = files.filter((file) =>
  /(^|\/)\.env(?:\.|$)|\.md$|\.(?:pem|key|p12|pfx)$|^(?:docs|audits|auditorias|investigacion|marca-sip|media-src|film|artifacts|out|node_modules|test-results|playwright-report)\/|^[^/]+\.(?:png|jpe?g|webp|pdf)$/i.test(
    file,
  ),
);
const secrets = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk_live_[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{24,})\b/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:]+:[^\s@]+@/i,
];
for (const file of files) {
  if (!/\.(?:[cm]?[jt]sx?|json|toml|ya?ml|html|css|txt)$/.test(file)) continue;
  const content = execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (secrets.some((pattern) => pattern.test(content))) forbidden.push(`${file} (posible secreto)`);
}
if (forbidden.length) {
  console.error(`Publicación bloqueada:\n${forbidden.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Índice revisado: ${files.length} archivos, sin rutas privadas ni patrones de secretos detectados.`,
  );
}
