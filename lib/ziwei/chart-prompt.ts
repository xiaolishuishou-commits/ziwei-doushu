/**
 * 命盘 → 结构化提示词
 * 把 ZiweiChart 序列化为 LLM 可读的命盘文本，供纯前端 AI 解读使用（无需后端）
 */

import type { ZiweiChart, Palace, Star } from './types';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const HOUR_NAMES = [
  '子时(23-01)', '丑时(01-03)', '寅时(03-05)', '卯时(05-07)',
  '辰时(07-09)', '巳时(09-11)', '午时(11-13)', '未时(13-15)',
  '申时(15-17)', '酉时(17-19)', '戌时(19-21)', '亥时(21-23)',
];

function starLabel(s: Star): string {
  const parts = [s.name];
  if (s.brightnessRaw) parts.push(`(${s.brightnessRaw})`);
  if (s.siHua) parts.push(`化${s.siHua}`);
  return parts.join('');
}

export function palaceToText(p: Palace, all: Palace[]): string {
  const ganZhi = `${STEMS[p.stem]}${BRANCHES[p.branch]}`;
  const majors = p.stars.filter(s => s.type === 'major').map(starLabel);
  const minors = p.stars.filter(s => s.type !== 'major').map(starLabel);
  const lines: string[] = [];

  let head = `${p.name}〔${ganZhi}〕`;
  const tags: string[] = [];
  if (p.isMingGong) tags.push('命宫主体');
  if (p.isShenGong) tags.push('身宫所在');
  if (p.isCurrentDaXian) tags.push('当前大限宫');
  if (p.daXianAge) tags.push(`大限${p.daXianAge[0]}-${p.daXianAge[1]}岁`);
  if (tags.length) head += `（${tags.join('，')}）`;

  if (p.isEmpty) {
    const opp = all.find(x => x.branch === p.borrowedFromBranch);
    const borrowed = p.borrowedStars?.length
      ? p.borrowedStars.join('、')
      : opp ? opp.stars.filter(s => s.type === 'major').map(s => s.name).join('、') : '';
    lines.push(`${head}：空宫，借对宫${opp?.name ?? ''}主星：${borrowed || '无'}`);
  } else {
    lines.push(`${head}：主星 ${majors.join('、') || '无'}`);
  }
  if (minors.length) lines.push(`  辅煞星：${minors.join('、')}`);
  if (p.selfSihua?.length) {
    lines.push(`  宫干自化：${p.selfSihua.map(x => `${x.starName}自化${x.siHua}`).join('、')}`);
  }
  return lines.join('\n');
}

export function chartToText(chart: ZiweiChart): string {
  const b = chart.birthInfo;
  const l = chart.lunarInfo;
  const gender = b.gender === 'male' ? '男' : '女';
  const yinYang = chart.yinYangGender ?? '';
  const lunarMonth = l.isLeapMonth ? `闰${Math.abs(l.lunarMonth)}` : l.lunarMonth;

  const current = chart.daXians[chart.currentDaXianIndex];
  const currentDaxianText = current
    ? `${current.startAge}-${current.endAge}岁，大限宫：${current.palaceName}〔${current.stemName ?? ''}${BRANCHES[current.palaceBranch]}〕` +
      (current.siHua
        ? `，大限四化：${current.siHua.lu}化禄、${current.siHua.quan}化权、${current.siHua.ke}化科、${current.siHua.ji}化忌`
        : '')
    : '未知';

  const birthText = `${yinYang}${gender}命，公历 ${b.year}年${b.month}月${b.day}日 ${HOUR_NAMES[b.hour] ?? ''}` +
    (l.fourPillarsLunar ? `，四柱（紫微历法）：${l.fourPillarsLunar.join(' ')}` : '');

  return [
    '【基本信息】',
    birthText,
    `农历：${l.lunarYear}年${lunarMonth}月${l.lunarDay}日`,
    `五行局：${chart.wuxingJuName}；命主：${chart.mingZhu ?? '—'}；身主：${chart.shenZhu ?? '—'}`,
    '',
    '【十二宫命盘】',
    ...chart.palaces.map(p => palaceToText(p, chart.palaces)),
    '',
    '【当前大限】',
    currentDaxianText,
    `当前虚岁：${chart.currentAge}`,
  ].join('\n');
}

export function buildSystemPrompt(chart: ZiweiChart): string {
  return [
    '你是一位精通紫微斗数的命理解读师，基于倪海厦《天纪》体系进行解读。要求：',
    '1. 严格基于下方命盘给出的实际星曜、四化、宫位进行解读，不得编造盘上不存在的星曜或格局；',
    '2. 空宫借对宫时需说明是借星解读；',
    '3. 引用倪师观点时可口语化转述，标注（倪师观点）；',
    '4. 语气专业但平和，不做绝对化断语，结尾给积极的可操作建议；',
    '5. 用简体中文，分节时使用「**【标题】**」格式；',
    '6. /no_think：直接输出解读正文，不要输出思考过程。',
    '',
    '=== 命盘数据 ===',
    chartToText(chart),
    '=== 命盘数据结束 ===',
  ].join('\n');
}
