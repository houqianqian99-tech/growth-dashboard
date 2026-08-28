export const GOAL_CATEGORIES = {
  A: { name: '职业硬技能', icon: '💼', color: 'a' },
  B: { name: '内容创作与运营', icon: '🎨', color: 'b' },
  C: { name: '身心健康', icon: '💪', color: 'c' },
  D: { name: '个人素养', icon: '📖', color: 'd' },
  E: { name: '系统与复盘', icon: '🔄', color: 'e' }
};

export const PHASES = [
  { id: 1, label: 'Phase 1', time: '2026.09-10', name: '打地基', goals: '规律作息、复盘系统、会计启动、健身、小红书、读书、英语、减少外卖' },
  { id: 2, label: 'Phase 2', time: '2026.11-12', name: '稳步扩展', goals: '抖音、写作、练字' },
  { id: 3, label: 'Phase 3', time: '2027.01-03', name: '深度创作', goals: 'PS、剪辑、B站、阅读观影+观后感' },
  { id: 4, label: 'Phase 4', time: '2027.04-05', name: '冲刺收官', goals: '会计考试、播客' }
];

export const TIME_BLOCKS = [
  { time: '06:30-07:30', activity: '起床+拉伸+简易健身', tag: 'h' },
  { time: '07:30-08:00', activity: '自己做早餐+听播客/英语听力', tag: 'h' },
  { time: '08:00-09:00', activity: '英语精学（单词+阅读+口语）', tag: 'l' },
  { time: '09:00-12:00', activity: '会计备考（番茄钟：45min学+10min休）', tag: 'l' },
  { time: '12:00-13:30', activity: '午餐+午休（尽量自己做）', tag: 'h' },
  { time: '13:30-15:00', activity: '技能学习轮换（一三五PS/剪辑，二四写作/练字）', tag: 'l' },
  { time: '15:00-17:00', activity: '内容创作（选题→拍摄/写文→编辑→发布）', tag: 'c' },
  { time: '17:00-18:00', activity: '读书（纸质书，远离屏幕）', tag: 'x' },
  { time: '18:00-19:00', activity: '晚餐+散步', tag: 'h' },
  { time: '19:00-20:00', activity: '练字/观影（一三五练字，二四观影+写观后感）', tag: 'x' },
  { time: '20:00-20:30', activity: '日复盘（5个问题）', tag: 'x' },
  { time: '20:30-22:00', activity: '自由时间', tag: 'x' },
  { time: '22:00-22:30', activity: '洗漱+准备明天+放下手机', tag: 'h' },
  { time: '22:30', activity: '睡觉', tag: 'h' }
];

export const DAILY_QUESTIONS = [
  '今天完成了哪些任务？（列出来）',
  '哪3件事做得好？为什么好？',
  '哪件事没做完/没做好？卡在哪里？',
  '明天最重要的一件事是什么？',
  '今天有什么收获或感恩？'
];

export const WEEKLY_QUESTIONS = [
  '本周目标完成率多少？（逐一打勾）',
  '哪个维度进展最好？哪个最差？',
  '本周最大的收获是什么？',
  '时间花在哪里了？和计划偏差大吗？',
  '下周需要调整什么？（策略 or 目标）',
  '下周的3个must-do是什么？'
];

export const MONTHLY_QUESTIONS = [
  '月度目标完成率？哪些达标哪些没达标？',
  '关键指标追踪（粉丝/读书/健身/复盘天数）',
  '本月最满意的一件事？最遗憾的？',
  '下月需要新增/减少/调整哪些目标？',
  '下月的月计划填好（用模板）'
];

export const MONTHLY_TEMPLATE = {
  theme: '',
  top3: ['', '', ''],
  goals: [
    { dimension: 'A', target: '', metric: '' },
    { dimension: 'B', target: '', metric: '' },
    { dimension: 'C', target: '', metric: '' },
    { dimension: 'D', target: '', metric: '' },
    { dimension: 'E', target: '', metric: '' }
  ],
  keyMetrics: { books: 0, posts: 0, fitness: 0, review: 0 },
  calendarTasks: []
};

export const WEEKLY_TEMPLATE = {
  theme: '',
  schedule: {
    '周一': { A: '', B: '', C: '', D: '', E: '' },
    '周二': { A: '', B: '', C: '', D: '', E: '' },
    '周三': { A: '', B: '', C: '', D: '', E: '' },
    '周四': { A: '', B: '', C: '', D: '', E: '' },
    '周五': { A: '', B: '', C: '', D: '', E: '' },
    '周六': { A: '', B: '', C: '', D: '', E: '' },
    '周日': { A: '', B: '', C: '', D: '', E: '' }
  },
  mustDo: ['', '', '']
};

export const SUGGESTIONS = {
  study: [
    { label: '精听练习', detail: '每天 30 分钟，用 BBC/CNN 素材，第一遍泛听，第二遍精听逐句记录' },
    { label: '精读训练', detail: '每天 1 篇，标注生词和长难句，第二天回顾' },
    { label: '写作输出', detail: '每周 2 篇，主题围绕 Part 2 话题，控制在 250 字' },
    { label: '口语跟读', detail: '每天 15 分钟，跟读 BBC 6 Minute English，录音对比' },
    { label: '单词记忆', detail: '每天 50 个词，词根词缀法 + 艾宾浩斯复习' }
  ],
  exam: [
    { label: '章节学习', detail: '按教材章节推进，每章配 20 道练习题' },
    { label: '真题训练', detail: '每周末完成 1 套完整真题，计时模拟' },
    { label: '错题回顾', detail: '建立错题本，每周回顾，同类题集中突破' }
  ],
  skill: [
    { label: '跟练教程', detail: '每节教程跟练 1 遍，记录关键快捷键/技巧' },
    { label: '实战作品', detail: '每 2 周完成 1 个作品，发布到社交平台' },
    { label: '专项突破', detail: '选择 1 个薄弱技巧，集中 1 周专项训练' }
  ],
  content: [
    { label: '选题策划', detail: '每周 3 个选题，关注热点和用户需求' },
    { label: '内容制作', detail: '每周 2-3 条内容，保持更新频率' },
    { label: '粉丝互动', detail: '每日回复评论 20 分钟，维护粉丝粘性' }
  ],
  health: [
    { label: '有氧运动', detail: '每周 4 次，每次 40 分钟，心率保持 120-140' },
    { label: '力量训练', detail: '每周 3 次，每次 30 分钟，重点下肢和核心' },
    { label: '饮食控制', detail: '三餐定时，碳水 40% + 蛋白 30% + 脂肪 30%' }
  ]
};

export const HABIT_LIST = [
  '22:30前入睡', '6:30起床', '健身/运动30min', '不点外卖',
  '英语学习1h', '会计备考2h+', '读书30min', '小红书/抖音内容产出',
  '练字20min', '日复盘完成', '自己做饭'
];

export const LEARNING_SUBJECTS = {
  english: { name: '英语雅思', icon: '📚', color: 'a' },
  accounting: { name: '初级会计', icon: '📖', color: 'a' },
  writing: { name: '写作', icon: '✍️', color: 'a' },
  editing: { name: '视频剪辑', icon: '🎬', color: 'a' },
  photoshop: { name: 'PS', icon: '🎨', color: 'a' },
  calligraphy: { name: '练字', icon: '✒️', color: 'a' }
};

export const ERROR_TYPES = ['概念混淆', '计算错误', '审题不清', '记忆遗漏', '其他'];

export const REVIEW_INTERVALS = [1, 3, 7, 15, 30];

export function getNextReviewDate(addDate, reviewCount) {
  const date = new Date(addDate);
  const interval = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
  date.setDate(date.getDate() + interval);
  return date.toISOString().split('T')[0];
}

export const PLATFORMS = {
  xiaohongshu: { name: '小红书', icon: '📕', creatorUrl: 'https://creator.xiaohongshu.com/', dataUrl: 'https://creator.xiaohongshu.com/statistics/note' },
  douyin: { name: '抖音', icon: '🎵', creatorUrl: 'https://creator.douyin.com/', dataUrl: 'https://creator.douyin.com/creator-micro/data/overview' },
  bilibili: { name: 'B站', icon: '📺', creatorUrl: 'https://member.bilibili.com/', dataUrl: 'https://member.bilibili.com/platform/upload-manager/article' },
  podcast: { name: '播客', icon: '🎙️', creatorUrl: '', dataUrl: '' }
};
