const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'yemeni-law-database');
const categories = ['laws', 'library', 'contracts', 'articles'];
const docs = [];
for (const category of categories) {
  const dir = path.join(root, category);
  for (const filename of fs.readdirSync(dir).filter(x => x.endsWith('.txt') && !x.includes('رئيسي'))) {
    const content = fs.readFileSync(path.join(dir, filename), 'utf8');
    docs.push({ id: `${category}_${filename}`, title: filename.replace(/\.txt$/, '').replace(/^\d+_/, ''), category, content, filename });
  }
}
fs.mkdirSync(path.join(__dirname, '..', 'public', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'law-index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), documents: docs }));
console.log(`Generated ${docs.length} documents`);
