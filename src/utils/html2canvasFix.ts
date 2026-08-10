// Utility to convert modern CSS color functions (oklch, oklab, etc.) into standard RGB/RGBA
// so html2canvas can render DOM elements without throwing "unsupported color function" errors.

export function oklabToRgb(oklabStr: string): string {
  try {
    const inner = oklabStr.replace(/^oklab\s*\(/i, '').replace(/\)$/, '').trim();
    const parts = inner.split('/');
    const colorPart = parts[0].trim();
    const alphaPart = parts[1] ? parts[1].trim() : null;

    const rawCoords = colorPart.split(/[\s,]+/).filter(Boolean);
    if (rawCoords.length < 3) return 'rgb(99, 102, 241)';

    let L = parseFloat(rawCoords[0]);
    if (rawCoords[0].endsWith('%')) L = L / 100;
    else if (L > 1) L = L / 100;
    L = Math.max(0, Math.min(1, L));

    let a = parseFloat(rawCoords[1]);
    if (rawCoords[1].endsWith('%')) a = (a / 100) * 0.4;

    let b = parseFloat(rawCoords[2]);
    if (rawCoords[2].endsWith('%')) b = (b / 100) * 0.4;

    let A = 1;
    if (alphaPart) {
      A = parseFloat(alphaPart);
      if (alphaPart.endsWith('%')) A = A / 100;
      A = Math.max(0, Math.min(1, A));
    }

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (c: number) => {
      const clamped = Math.max(0, Math.min(1, c));
      return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const r = Math.round(gamma(rLin) * 255);
    const g = Math.round(gamma(gLin) * 255);
    const bVal = Math.round(gamma(bLin) * 255);

    if (A < 1) {
      return `rgba(${r}, ${g}, ${bVal}, ${Number(A.toFixed(3))})`;
    }
    return `rgb(${r}, ${g}, ${bVal})`;
  } catch {
    return 'rgb(99, 102, 241)';
  }
}

export function oklchToRgb(oklchStr: string): string {
  try {
    const inner = oklchStr.replace(/^oklch\s*\(/i, '').replace(/\)$/, '').trim();
    const parts = inner.split('/');
    const colorPart = parts[0].trim();
    const alphaPart = parts[1] ? parts[1].trim() : null;

    const rawCoords = colorPart.split(/[\s,]+/).filter(Boolean);
    if (rawCoords.length < 3) return 'rgb(99, 102, 241)';

    let L = parseFloat(rawCoords[0]);
    if (rawCoords[0].endsWith('%')) L = L / 100;
    else if (L > 1) L = L / 100;
    L = Math.max(0, Math.min(1, L));

    let C = parseFloat(rawCoords[1]);
    if (rawCoords[1].endsWith('%')) C = (C / 100) * 0.4;

    const H = parseFloat(rawCoords[2]) || 0;

    let A = 1;
    if (alphaPart) {
      A = parseFloat(alphaPart);
      if (alphaPart.endsWith('%')) A = A / 100;
      A = Math.max(0, Math.min(1, A));
    }

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (c: number) => {
      const clamped = Math.max(0, Math.min(1, c));
      return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const r = Math.round(gamma(rLin) * 255);
    const g = Math.round(gamma(gLin) * 255);
    const bVal = Math.round(gamma(bLin) * 255);

    if (A < 1) {
      return `rgba(${r}, ${g}, ${bVal}, ${Number(A.toFixed(3))})`;
    }
    return `rgb(${r}, ${g}, ${bVal})`;
  } catch {
    return 'rgb(99, 102, 241)';
  }
}

export function replaceOklchInText(text: string): string {
  if (!text) return text;
  
  const lowerText = text.toLowerCase();
  if (!lowerText.includes('oklch') && !lowerText.includes('oklab') && !lowerText.includes('color-mix')) {
    return text;
  }

  const targets = ['oklch', 'oklab', 'color-mix'];
  let result = text;
  let iterations = 0;

  while (iterations < 5000) {
    iterations++;
    let earliestPos = -1;
    let foundTarget = '';

    const currentLower = result.toLowerCase();
    for (const target of targets) {
      const pos = currentLower.indexOf(target + '(');
      if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) {
        earliestPos = pos;
        foundTarget = target;
      }
    }

    if (earliestPos === -1) break;

    const openParenIdx = result.indexOf('(', earliestPos);
    if (openParenIdx === -1) break;

    let depth = 1;
    let closeParenIdx = -1;
    for (let i = openParenIdx + 1; i < result.length; i++) {
      if (result[i] === '(') depth++;
      else if (result[i] === ')') {
        depth--;
        if (depth === 0) {
          closeParenIdx = i;
          break;
        }
      }
    }

    if (closeParenIdx === -1) break;

    const fullStr = result.substring(earliestPos, closeParenIdx + 1);
    let converted = 'rgb(99, 102, 241)';

    if (foundTarget === 'oklch') {
      converted = oklchToRgb(fullStr);
    } else if (foundTarget === 'oklab') {
      converted = oklabToRgb(fullStr);
    } else {
      converted = 'transparent';
    }

    result = result.substring(0, earliestPos) + converted + result.substring(closeParenIdx + 1);
  }

  return result;
}

export function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  // 1. Sanitize all <style> tags in clonedDoc
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  styleTags.forEach((styleTag) => {
    let cssText = styleTag.innerHTML || styleTag.textContent || '';
    if (styleTag.sheet) {
      try {
        const rules = Array.from(styleTag.sheet.cssRules);
        if (rules.length > 0) {
          cssText = rules.map((r) => r.cssText).join('\n');
        }
      } catch {
        // ignore cross-origin sheet errors
      }
    }
    if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('color-mix'))) {
      const cleanCss = replaceOklchInText(cssText);
      styleTag.textContent = cleanCss;
      styleTag.innerHTML = cleanCss;
    }
  });

  // 2. Sanitize all <link rel="stylesheet"> elements
  const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  linkTags.forEach((link) => {
    try {
      const sheet = (link as HTMLLinkElement).sheet;
      if (sheet && sheet.cssRules) {
        const rules = Array.from(sheet.cssRules);
        const cssText = rules.map((r) => r.cssText).join('\n');
        if (cssText) {
          const newStyle = clonedDoc.createElement('style');
          newStyle.textContent = replaceOklchInText(cssText);
          link.parentNode?.replaceChild(newStyle, link);
        }
      }
    } catch {
      // ignore
    }
  });

  // 3. Sanitize inline style attributes on all elements
  const allElements = Array.from(clonedDoc.querySelectorAll('*'));
  const propsToInline = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke', 'boxShadow'];

  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.getAttribute) {
      const styleAttr = htmlEl.getAttribute('style');
      if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab') || styleAttr.includes('color-mix'))) {
        htmlEl.setAttribute('style', replaceOklchInText(styleAttr));
      }
    }

    try {
      const comp = clonedDoc.defaultView?.getComputedStyle(htmlEl);
      if (comp) {
        propsToInline.forEach((prop) => {
          const val = comp.getPropertyValue(prop);
          if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
            htmlEl.style.setProperty(prop, replaceOklchInText(val));
          }
        });
      }
    } catch {
      // ignore
    }
  });
}
