(function() {
  const TOPICS = [
    'cc-lab/3A/g1/news',
    'cc-lab/3A/g1/chat',
    'cc-lab/3A/g2/news',
    'cc-lab/3A/g2/chat',
    'cc-lab/3B/g1/news',
    'cc-lab/3B/g1/chat',
    'cc-lab/3B/g2/news',
    'cc-lab/config'
  ];

  function matchesMQTT(filter, topic) {
    const f = filter.split('/');
    const t = topic.split('/');
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return true;
      if (i >= t.length) return false;
      if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return f.length === t.length;
  }

  function buildTree(topics) {
    const root = {};
    topics.forEach(t => {
      const parts = t.split('/');
      let node = root;
      parts.forEach(p => {
        if (!node[p]) node[p] = {};
        node = node[p];
      });
      node.__full = t;
    });
    return root;
  }

  function renderTree(node, filter, depth, path) {
    let html = '';
    const keys = Object.keys(node).filter(k => k !== '__full');
    keys.forEach(key => {
      const currentPath = path ? path + '/' + key : key;
      const child = node[key];
      const isLeaf = Object.keys(child).filter(k => k !== '__full').length === 0;
      const fullTopic = child.__full || currentPath;
      const matched = filter ? matchesMQTT(filter, fullTopic) : false;
      const icon = isLeaf ? '<i class="fa-solid fa-file-lines icon"></i>' : '<i class="fa-solid fa-folder icon"></i>';
      html += `<div class="topic-node" style="padding-left:${depth * 24}px">`;
      html += `<span class="topic-label ${matched && isLeaf ? 'matched' : ''}">${icon} ${key}${isLeaf ? '' : '/'}</span>`;
      if (!isLeaf) {
        html += renderTree(child, filter, depth + 1, currentPath);
      }
      html += '</div>';
    });
    return html;
  }

  function doMatch() {
    const filter = document.getElementById('topicFilter').value.trim();
    const tree = buildTree(TOPICS);
    document.getElementById('topicTree').innerHTML = renderTree(tree, filter, 0, '');
  }

  document.getElementById('btnMatchTopic').addEventListener('click', doMatch);
  document.getElementById('topicFilter').addEventListener('input', doMatch);
  doMatch();
})();
