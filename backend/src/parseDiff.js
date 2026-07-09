import parseDiff from 'parse-diff';

export function parseDiffText(rawDiff) {
  try {
    const files = parseDiff(rawDiff);
    if (!files || files.length === 0) {
      return [{ name: 'input', additions: [], deletions: [], raw: rawDiff }];
    }

    return files.map((file) => {
      const additions = [];
      const deletions = [];
      if (file.chunks) {
        for (const chunk of file.chunks) {
          for (const change of chunk.changes) {
            if (change.type === 'add') {
              additions.push({ line: change.ln, content: change.content });
            } else if (change.type === 'del') {
              deletions.push({ line: change.ln2, content: change.content });
            }
          }
        }
      }
      return {
        name: file.to || file.from || 'unknown',
        additions,
        deletions,
      };
    });
  } catch {
    return [{ name: 'input', additions: [], deletions: [], raw: rawDiff }];
  }
}
