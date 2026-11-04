// Keep every word in SVG labels, including long terms and equations.
export function diagramLabelLines(label: string): string[] {
  const lines: string[] = [];
  for (const word of label.trim().split(/\s+/)) {
    let rest = word;
    while (rest.length > 15) { lines.push(rest.slice(0, 15)); rest = rest.slice(15); }
    if (!rest) continue;
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + 1 + rest.length <= 15) lines[last] += " " + rest;
    else lines.push(rest);
  }
  return lines;
}
