const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION", "CODE", "PRE"]);

const SHORT_WORDS =
  "(?:а|и|в|во|к|ко|с|со|у|о|об|обо|от|до|на|за|из|по|не|ни|но|же|ли|бы|для|над|под|при|про|без|как|что|это|или)";

const NUMBER_UNITS =
  "(?:%|URL|AI|ИИ|шт\\.|строк|строки|строка|запрос|запроса|запросов|страниц|страницы|страница|файла|файлов|минуту|час|день)";

export function applyAutoNbsp(value: string) {
  if (!value.trim()) return value;

  return value
    .replace(
      new RegExp(`(^|[\\s([{«"'])(${SHORT_WORDS})[ \\t]+(?=\\S)`, "giu"),
      (_, prefix: string, word: string) => `${prefix}${word}\u00A0`,
    )
    .replace(new RegExp(`(\\d)[ \\t]+(${NUMBER_UNITS})(?=\\b|$)`, "giu"), "$1\u00A0$2")
    .replace(/\b(AI|ИИ|URL|CSV|FAQ|CTA|SEO)[ \t]+(?=\S)/g, "$1\u00A0")
    .replace(/\b(user-agent|robots\.txt|sitemap)[ \t]+(?=\S)/gi, "$1\u00A0");
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest("[data-no-auto-nbsp]")) return true;
  return false;
}

function formatTextNode(node: Node) {
  if (node.nodeType !== Node.TEXT_NODE || shouldSkip(node)) return;
  const current = node.nodeValue ?? "";
  const next = applyAutoNbsp(current);
  if (next !== current) node.nodeValue = next;
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    formatTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    formatTextNode(node);
    node = walker.nextNode();
  }
}

export function installAutoNbsp(root: HTMLElement = document.body) {
  walk(root);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        formatTextNode(mutation.target);
        return;
      }

      mutation.addedNodes.forEach((node) => walk(node));
    });
  });

  observer.observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
