/* =========================================================================
 * 天机 · 图形推理训练营
 * 前端单页应用（Vue 3 + 纯 SVG，无后端）
 * 模块：知识库 / 闯关检测 / AI 出题 / 段位统计
 * ========================================================================= */

/* ---------------- SVG 绘制辅助 ---------------- */
function S(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' + inner + '</svg>';
}
const INK = '#2b3245';
const ACCENT = '#e63946';

function poly(n, cx, cy, r, rotDeg, fill, stroke, sw) {
  fill = fill || 'none'; stroke = stroke || INK; sw = sw || 3;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((rotDeg || 0) + i * 360 / n) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return '<polygon points="' + pts.join(' ') + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round"/>';
}
function circ(cx, cy, r, fill, stroke, sw) {
  fill = fill === undefined ? INK : fill;
  stroke = stroke || 'none'; sw = sw || 0;
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
}
function line(x1, y1, x2, y2, stroke, sw) {
  stroke = stroke || INK; sw = sw || 3;
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
}
function rotatePts(pts, cx, cy, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(function (p) {
    const dx = p[0] - cx, dy = p[1] - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  });
}
function ptstr(pts) {
  return pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
}
// 箭头（朝上，带缺口的不对称形状，旋转后方向清晰）
function arrow(rotDeg, fill) {
  fill = fill || INK;
  const base = [[60, 26], [84, 88], [60, 72], [36, 88]];
  const pts = rotatePts(base, 60, 60, rotDeg);
  return '<polygon points="' + ptstr(pts) + '" fill="' + fill + '" stroke="' + fill + '" stroke-width="1" stroke-linejoin="round"/>';
}
function compass(deg) {
  const dirs = ['上', '右上', '右', '右下', '下', '左下', '左', '左上'];
  const d = ((deg % 360) + 360) % 360;
  return dirs[Math.round(d / 45) % 8];
}

/* ---------------- 随机工具 ---------------- */
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
// 可复现随机（用于每日挑战）
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* =========================================================================
 * 图形推理题生成引擎
 * 每个生成器返回：category / rule / stem[] / options[] / answer / explanation
 *                 / stemDesc[] / optionDesc[]（文本描述，供 AI 推理）
 * ========================================================================= */
function buildOptions(correctSvg, correctDesc, wrongPairs, diff) {
  // wrongPairs: [[svg, desc], ...]（3 个干扰项）
  const opts = [[correctSvg, correctDesc]].concat(wrongPairs);
  const idx = shuffle([0, 1, 2, 3]);
  const options = [], optionDesc = [];
  let answer = -1;
  idx.forEach(function (k, i) {
    if (k === 0) answer = i;
    options.push(opts[k][0]);
    optionDesc.push(opts[k][1]);
  });
  return { options: options, optionDesc: optionDesc, answer: answer };
}

const GENERATORS = [
  {
    id: 'rotation', name: '旋转', category: '位置类',
    make: function (diff) {
      const step = diff >= 3 ? pick([45, 45, 60]) : (diff === 2 ? pick([45, 90]) : 90);
      const start = pick([0, 15, 30, 45, 60, 90, 135, 180, 225, 270]);
      const stem = [0, 1, 2].map(function (i) { return S(arrow(start + i * step)); });
      const stemDesc = [0, 1, 2].map(function (i) { return '箭头朝' + compass(start + i * step); });
      const correct = start + 3 * step;
      const wrongAngles = [correct + step, correct - step, correct + 2 * step];
      const wrongPairs = wrongAngles.map(function (a) {
        return [S(arrow(a)), '箭头朝' + compass(a)];
      });
      const b = buildOptions(S(arrow(correct)), '箭头朝' + compass(correct), wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '三个箭头每次沿顺时针方向旋转 ' + step + '°，方向依次为 ' +
          compass(start) + ' → ' + compass(start + step) + ' → ' + compass(start + 2 * step) +
          '。第 4 个图形应为再顺时针旋转 ' + step + '°，即箭头朝' + compass(correct) + '。'
      };
    }
  },
  {
    id: 'translation', name: '平移', category: '位置类',
    make: function (diff) {
      const cells = [[30, 30], [60, 30], [90, 30], [90, 60], [90, 90], [60, 90], [30, 90], [30, 60]];
      const k = randInt(0, 7);
      const stem = [0, 1, 2].map(function (i) { return S(circ(cells[(k + i) % 8][0], cells[(k + i) % 8][1], 10)); });
      const stemDesc = [0, 1, 2].map(function (i) { return '小圆点位于九宫格外围第 ' + ((k + i) % 8 + 1) + ' 格'; });
      const correctIdx = (k + 3) % 8;
      const distractors = [[k + 4, '第 ' + ((k + 4) % 8 + 1) + ' 格'], [k + 5, '第 ' + ((k + 5) % 8 + 1) + ' 格'], ['center', '九宫格正中心']];
      const wrongPairs = distractors.map(function (d) {
        if (d[0] === 'center') return [S(circ(60, 60, 10)), d[1]];
        const c = cells[d[0] % 8];
        return [S(circ(c[0], c[1], 10)), d[1]];
      });
      const b = buildOptions(S(circ(cells[correctIdx][0], cells[correctIdx][1], 10)), '小圆点位于外围第 ' + (correctIdx + 1) + ' 格', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '小圆点沿九宫格外围顺时针移动，每步走一格。题干为连续三格，第 4 个图形应落在下一格（第 ' + (correctIdx + 1) + ' 格）。'
      };
    }
  },
  {
    id: 'dots_count', name: '点数递增', category: '数量类',
    make: function (diff) {
      const start = diff >= 3 ? pick([3, 4]) : (diff === 2 ? pick([2, 3]) : 2);
      function makeDots(n) {
        const y = 60, gap = n > 1 ? 66 / (n - 1) : 0, x0 = 60 - (n - 1) * gap / 2;
        let s = '';
        for (let i = 0; i < n; i++) s += circ((x0 + i * gap).toFixed(1), y, 9);
        return s;
      }
      const stem = [start, start + 1, start + 2].map(function (n) { return S(makeDots(n)); });
      const stemDesc = [start, start + 1, start + 2].map(function (n) { return n + ' 个圆点'; });
      const wrongPairs = [[start + 2, start + 2 + ' 个圆点'], [start + 4, start + 4 + ' 个圆点'], [start + 5, start + 5 + ' 个圆点']].map(function (p) {
        return [S(makeDots(p[0])), p[1]];
      });
      const b = buildOptions(S(makeDots(start + 3)), (start + 3) + ' 个圆点', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '圆点数量依次为 ' + start + '、' + (start + 1) + '、' + (start + 2) + '（每次 +1），第 4 个图形应为 ' + (start + 3) + ' 个圆点。'
      };
    }
  },
  {
    id: 'sides_count', name: '边数递增', category: '数量类',
    make: function (diff) {
      const stem = [3, 4, 5].map(function (n) { return S(poly(n, 60, 60, 42)); });
      const stemDesc = ['三角形（3 边）', '四边形（4 边）', '五边形（5 边）'];
      const wrongPairs = [[5, '五边形（5 边）'], [7, '七边形（7 边）'], [4, '四边形（4 边）']].map(function (p) {
        return [S(poly(p[0], 60, 60, 42)), p[1]];
      });
      const b = buildOptions(S(poly(6, 60, 60, 42)), '六边形（6 边）', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '图形边数依次为 3、4、5（每次 +1），第 4 个图形应为六边形（6 条边）。'
      };
    }
  },
  {
    id: 'size', name: '大小递增', category: '数量类',
    make: function (diff) {
      const r1 = diff >= 3 ? 12 : 14, step = diff >= 3 ? 7 : 8;
      const rs = [r1, r1 + step, r1 + 2 * step];
      const stem = rs.map(function (r) { return S(circ(60, 60, r)); });
      const stemDesc = rs.map(function (r) { return '半径 ' + r + ' 的圆'; });
      const correctR = r1 + 3 * step;
      const wrongPairs = [[r1 + 2 * step, '半径 ' + (r1 + 2 * step) + ' 的圆'], [r1 + 4 * step, '半径 ' + (r1 + 4 * step) + ' 的圆'], [r1 + step, '半径 ' + (r1 + step) + ' 的圆']].map(function (p) {
        return [S(circ(60, 60, p[0])), p[1]];
      });
      const b = buildOptions(S(circ(60, 60, correctR)), '半径 ' + correctR + ' 的圆', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '圆的半径依次为 ' + rs.join('、') + '（每次 +' + step + '），第 4 个图形应为半径 ' + correctR + ' 的圆。'
      };
    }
  },
  {
    id: 'fill_count', name: '黑白填充递增', category: '数量类',
    make: function (diff) {
      const xs = [20, 40, 60, 80, 100], y = 60;
      function makeRow(filled) {
        let s = '';
        for (let i = 0; i < 5; i++) {
          s += i < filled ? circ(xs[i], y, 8) : circ(xs[i], y, 8, 'none', INK, 2.5);
        }
        return s;
      }
      const stem = [1, 2, 3].map(function (n) { return S(makeRow(n)); });
      const stemDesc = ['1 个实心（4 个空心）', '2 个实心（3 个空心）', '3 个实心（2 个空心）'];
      const wrongPairs = [[3, '3 个实心'], [5, '5 个实心'], [2, '2 个实心']].map(function (p) {
        return [S(makeRow(p[0])), p[1]];
      });
      const b = buildOptions(S(makeRow(4)), '4 个实心（1 个空心）', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '5 个圆中实心圆的数量依次为 1、2、3（每次 +1），第 4 个图形应为 4 个实心、1 个空心。'
      };
    }
  },
  {
    id: 'regions', name: '封闭区域递增', category: '数量类',
    make: function (diff) {
      function makeCircle(k) {
        let s = '<circle cx="60" cy="60" r="40" fill="none" stroke="' + INK + '" stroke-width="3"/>';
        for (let i = 0; i < k; i++) {
          const x = 60 + (i - (k - 1) / 2) * (k === 1 ? 0 : 22);
          s += line(x, 20, x, 100, INK, 3);
        }
        return s;
      }
      const stem = [0, 1, 2].map(function (n) { return S(makeCircle(n)); });
      const stemDesc = ['1 个封闭区域', '2 个封闭区域', '3 个封闭区域'];
      const wrongPairs = [[1, '2 个封闭区域'], [2, '3 个封闭区域'], [4, '5 个封闭区域']].map(function (p) {
        // 用竖线条数控制区域：k 条平行竖线 -> k+1 个区域
        return [S(makeCircle(p[0])), p[1]];
      });
      const b = buildOptions(S(makeCircle(3)), '4 个封闭区域', wrongPairs, diff);
      return {
        category: this.category, rule: this.name, diff: diff,
        stem: stem, options: b.options, answer: b.answer,
        stemDesc: stemDesc, optionDesc: b.optionDesc,
        explanation: '圆被平行竖线分割出的封闭区域数依次为 1、2、3（每次 +1），第 4 个图形应为 4 个封闭区域（3 条竖线）。'
      };
    }
  }
];

function generateQuestion(diff, rng) {
  rng = rng || Math.random;
  // 用一个临时可复现的随机源：直接调用传入的 rng 来选择生成器
  const g = GENERATORS[Math.floor(rng() * GENERATORS.length)];
  return g.make(diff);
}

/* =========================================================================
 * 知识库数据
 * ========================================================================= */
const KNOWLEDGE = {
  basics: {
    title: '图形设置',
    intro: '图形推理 = 观察图形的“构成要素”和“属性”，找出其变化规律。先把图形拆解，再谈规律。',
    sections: [
      { k: '构成要素', items: ['点（端点、交点、圆心）', '线（直线、曲线、线段数）', '角（直角、锐角、角数量）', '面（封闭区域、面积）', '素（元素种类、元素个数）'] },
      { k: '图形属性', items: ['位置（上下左右、内外、相邻/相隔）', '方向（朝向、旋转角度）', '数量（多少、增减）', '大小（放大缩小）', '颜色（黑白、明暗）', '形状（曲直、凹凸、对称）'] },
      { k: '题干呈现形式', items: ['一组图（顺推序列：1→2→3→?）', '两组图（类比：A:B = C:?）', '九宫格（3×3 找缺失）', '分组分类（六个图分两类）', '空间重构（折纸盒/三视图/截面）'] }
    ]
  },
  techniques: {
    title: '分析技巧',
    intro: '核心口诀：先看“相似度”，再定规律方向；不要上来就全规律乱扫。',
    sections: [
      {
        k: '相似度判断法',
        items: [
          '图形很相似、元素基本不变 → 位置类（平移 / 旋转 / 翻转）',
          '图形相似、元素有同有异 → 叠加类（去同存异 / 去异存同 / 遍历）',
          '图形差异大但较规则 → 属性类（对称 / 曲直 / 开闭 / 凹凸）',
          '差异大、小元素多 → 数元素（种类数 / 个数 / 相对位置）',
          '差异大、图案单一不规则 → 数量类（面 / 角 / 线 / 点）'
        ]
      },
      {
        k: '五套解法',
        items: [
          '数量类：数“点、线、角、面、素、笔画、部分”七项，看增减',
          '位置类：找平移、旋转、翻转、间隔变化',
          '样式类：先遍历，后加减同异',
          '立体折叠类：特殊面法、相邻面法、相对面法',
          '图形重组类：子图前后对应、旋转而不翻转、求同去异'
        ]
      },
      {
        k: '提速技巧',
        items: ['先分类、后验证，按“位置→样式→数量→属性→空间”顺序排查', '相对面不能同时出现，相邻面看公共边', '40 秒无头绪先跳过，回头再做', '排除法：先排除明显不符的选项']
      }
    ]
  },
  reasoning: {
    title: '推理思路',
    intro: '8 大类规律，由简入深。判断顺序：位置 → 样式 → 数量/属性 → 空间。',
    sections: [
      { k: '位置类', items: ['平移', '旋转', '翻转', '局部轮换'] },
      { k: '样式类', items: ['直接叠加', '去同存异', '去异存同', '遍历', '相邻相加'] },
      { k: '数量类', items: ['点', '线', '角', '面', '封闭区', '交点', '笔画数', '部分数', '种类数'] },
      { k: '属性类', items: ['对称性', '曲直性', '开闭性', '黑白', '内外', '凹凸'] },
      { k: '空间重构', items: ['折纸盒', '图形拼接', '截面判断'] },
      { k: '功能类', items: ['部件功能', '装配关系（生活器物/机械结构）'] },
      { k: '立体图形', items: ['三视图', '截面', '立体数量', '透明盒内部关系'] },
      { k: '综合分析', items: ['主规律 + 辅助规律（先主后辅，二次校验）'] }
    ],
    mnemonic: '相似不变看位置，相似有异看叠加；相异规则看属性，小元素多查数量；单一不规则，数面角线点。'
  }
};

/* =========================================================================
 * Vue 应用
 * ========================================================================= */
const STATS_KEY = 'tianji_stats_v1';
const SETTINGS_KEY = 'tianji_settings_v1';

const RANKS = [
  { min: 0, name: '青铜', icon: '🥉', color: '#b08d57' },
  { min: 120, name: '白银', icon: '🥈', color: '#9aa7b5' },
  { min: 300, name: '黄金', icon: '🥇', color: '#e6b422' },
  { min: 600, name: '铂金', icon: '💎', color: '#4ecdc4' },
  { min: 1000, name: '钻石', icon: '🔷', color: '#4aa3df' },
  { min: 1600, name: '王者', icon: '👑', color: '#e63946' }
];

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    if (s) return s;
  } catch (e) {}
  return { score: 0, correct: 0, total: 0, combo: 0, bestCombo: 0, games: 0 };
}
function saveStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s) return s;
  } catch (e) {}
  return { apiKey: '', apiUrl: 'https://api.moonshot.cn', model: 'kimi-k2.6' };
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function rankOf(score) {
  let r = RANKS[0];
  for (const x of RANKS) if (score >= x.min) r = x;
  return r;
}
function nextRank(score) {
  for (const x of RANKS) if (score < x.min) return x;
  return null;
}

/* ---------------- LLM 流式调用 ---------------- */
async function callLLMStream(apiKey, apiUrl, model, messages, onDelta, onError) {
  const base = (apiUrl || 'https://api.moonshot.cn').replace(/\/+$/, '');
  try {
    const resp = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: model || 'kimi-k2.6', messages: messages, stream: true, max_tokens: 2048 })
    });
    if (!resp.ok) { onError('API 请求失败 (HTTP ' + resp.status + ')'); return; }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const raw of lines) {
        const l = raw.trim();
        if (!l.startsWith('data:')) continue;
        const d = l.slice(5).trim();
        if (d === '[DONE]') return;
        try {
          const j = JSON.parse(d);
          const delta = j.choices && j.choices[0] && j.choices[0].delta;
          if (delta && delta.content) onDelta(delta.content);
        } catch (e) {}
      }
    }
  } catch (e) {
    onError('网络错误：' + e.message);
  }
}

function describeQuestion(q) {
  const stem = q.stemDesc.map(function (d, i) { return (i + 1) + ') ' + d; }).join('；');
  const letters = ['A', 'B', 'C', 'D'];
  const opts = q.optionDesc.map(function (d, i) { return letters[i] + ') ' + d; }).join('；');
  return '这是一道' + q.category + '图形推理题（规律方向：' + q.rule + '）。\n' +
    '题干为 3 个连续图形，依次是：' + stem + '。\n' +
    '四个选项分别是：' + opts + '。\n' +
    '请判断：第 4 个图形最应该是哪个选项？并逐步说明你的推理过程（先看什么、找什么规律、为什么选它）。';
}

const AI_SYSTEM = '你是一位图形推理（图形判断推理）专家，擅长公务员行测、事业单位、IQ 测试中的图形规律题。' +
  '你给出的推理要分步骤、清晰、准确，先指出图形的构成要素和属性，再指出变化规律，最后得出答案并排除其他选项。回答用中文。';

Vue.createApp({
  data: function () {
    return {
      tabs: [
        { key: 'home', label: '首页' },
        { key: 'knowledge', label: '知识库' },
        { key: 'quiz', label: '闯关检测' },
        { key: 'ai', label: 'AI 出题' }
      ],
      activeTab: 'home',
      stats: loadStats(),
      settings: loadSettings(),
      showSettings: false,
      showKey: false,
      testResult: '', testOk: false, testing: false,
      // 知识库
      KNOWLEDGE: KNOWLEDGE,
      kTab: 'basics',
      // 闯关检测
      diff: 1,
      q: null,
      selected: null,
      answered: false,
      correct: false,
      feedback: '',
      // AI 出题
      aiDiff: 2,
      aiQ: null,
      aiReasoning: '',
      aiReasoningType: '',   // 'builtin' | 'ai'
      aiStreaming: false,
      aiError: ''
    };
  },
  computed: {
    rank: function () { return rankOf(this.stats.score); },
    next: function () { return nextRank(this.stats.score); },
    accuracy: function () { return this.stats.total ? Math.round(this.stats.correct / this.stats.total * 100) : 0; },
    rankProgress: function () {
      const cur = this.rank;
      const nxt = this.next;
      if (!nxt) return 100;
      const total = nxt.min - cur.min;
      return Math.min(100, Math.round((this.stats.score - cur.min) / total * 100));
    }
  },
  methods: {
    go: function (tab) { this.activeTab = tab; },
    rankOf: rankOf,
    nextRank: nextRank,
    newQuestion: function (diff, rng) {
      diff = diff || this.diff;
      return generateQuestion(diff, rng);
    },
    /* ---------- 闯关检测 ---------- */
    startQuiz: function () {
      this.q = this.newQuestion(this.diff);
      this.selected = null;
      this.answered = false;
      this.correct = false;
      this.feedback = '';
    },
    choose: function (i) {
      if (this.answered) return;
      this.selected = i;
      this.answered = true;
      this.correct = (i === this.q.answer);
      const pts = this.diff * 10;
      if (this.correct) {
        this.stats.combo += 1;
        this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
        this.stats.correct += 1;
        this.stats.score += pts + (this.stats.combo > 1 ? Math.min(this.stats.combo * 2, 10) : 0);
        this.feedback = '答对了！+' + pts + ' 分';
      } else {
        this.stats.combo = 0;
        this.feedback = '答错了。正确答案是选项 ' + String.fromCharCode(65 + this.q.answer) + '。';
      }
      this.stats.total += 1;
      this.stats.games += 1;
      saveStats(this.stats);
    },
    optionClass: function (i) {
      if (!this.answered) return { option: true };
      if (i === this.q.answer) return { option: true, 'is-correct': true };
      if (i === this.selected) return { option: true, 'is-wrong': true };
      return { option: true, dim: true };
    },
    /* ---------- AI 出题 ---------- */
    startAI: function () {
      this.aiQ = this.newQuestion(this.aiDiff);
      this.aiReasoning = '';
      this.aiReasoningType = '';
      this.aiStreaming = false;
      this.aiError = '';
    },
    aiExplain: function () {
      if (!this.aiQ) return;
      if (!this.settings.apiKey) {
        this.aiReasoningType = 'builtin';
        this.aiReasoning = this.builtinReasoning(this.aiQ);
        return;
      }
      this.aiStreaming = true;
      this.aiReasoningType = 'ai';
      this.aiReasoning = '';
      this.aiError = '';
      const messages = [
        { role: 'system', content: AI_SYSTEM },
        { role: 'user', content: describeQuestion(this.aiQ) }
      ];
      const self = this;
      callLLMStream(
        this.settings.apiKey, this.settings.apiUrl, this.settings.model, messages,
        function (delta) { self.aiReasoning += delta; },
        function (err) {
          self.aiError = err + '（已切换为内置解析）';
          self.aiStreaming = false;
          self.aiReasoningType = 'builtin';
          self.aiReasoning = self.builtinReasoning(self.aiQ);
        }
      ).then(function () { self.aiStreaming = false; });
    },
    builtinReasoning: function (q) {
      const letters = ['A', 'B', 'C', 'D'];
      return '【规律】' + q.category + ' · ' + q.rule + '\n' +
        '【观察】' + q.stemDesc.join(' → ') + '\n' +
        '【推理】' + q.explanation + '\n' +
        '【答案】选项 ' + letters[q.answer] + '。';
    },
    revealAIAnswer: function () {
      if (!this.aiQ) return;
      this.aiReasoningType = 'builtin';
      this.aiReasoning = this.builtinReasoning(this.aiQ);
    },
    /* ---------- 设置 ---------- */
    testKey: async function () {
      if (!this.settings.apiKey) { this.testResult = '请先输入 API Key'; this.testOk = false; return; }
      this.testing = true;
      this.testResult = '';
      try {
        const base = (this.settings.apiUrl || 'https://api.moonshot.cn').replace(/\/+$/, '');
        const resp = await fetch(base + '/v1/models', { headers: { 'Authorization': 'Bearer ' + this.settings.apiKey } });
        this.testOk = resp.ok;
        this.testResult = resp.ok ? 'API Key 有效 ✓' : 'API Key 无效 (HTTP ' + resp.status + ')';
      } catch (e) {
        this.testOk = false;
        this.testResult = '连接失败：' + e.message;
      }
      this.testing = false;
    },
    saveSettingsNow: function () {
      saveSettings(this.settings);
      this.showSettings = false;
    },
    clearKey: function () {
      this.settings.apiKey = '';
      saveSettings(this.settings);
    },
    resetStats: function () {
      this.stats = { score: 0, correct: 0, total: 0, combo: 0, bestCombo: 0, games: 0 };
      saveStats(this.stats);
    },
    /* ---------- 每日挑战 ---------- */
    dailyQuestion: function () {
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      const rng = mulberry32(seed);
      return generateQuestion(2, rng);
    }
  },
  mounted: function () {
    this.startAI();
    this.startQuiz();
  }
}).mount('#app');
