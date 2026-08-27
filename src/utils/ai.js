import { todayStr, dateStr, daysUntil, weekStart, monthStr, formatMinutes } from './helpers.js';
import { SUGGESTIONS, LEARNING_SUBJECTS, HABIT_LIST } from './frameworks.js';
import { LEARNING_RESOURCES } from './resources.js';

export function computeStreak(checkins) {
  const dates = new Set((checkins || []).map(c => c.date));
  let streak = 0;
  let d = new Date();
  if (!dates.has(dateStr(d))) d.setDate(d.getDate() - 1);
  while (dates.has(dateStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function weekMinutes(subj) {
  const ws = weekStart().getTime();
  return (subj.studyCheckins || []).filter(c => new Date(c.date).getTime() >= ws).reduce((s, c) => s + (c.minutes || 0), 0);
}

export function monthMinutes(subj) {
  const ms = monthStr();
  return (subj.studyCheckins || []).filter(c => c.date && c.date.slice(0, 7) === ms).reduce((s, c) => s + (c.minutes || 0), 0);
}

export function parseChineseDate(text) {
  if (!text) return null;
  const m = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export function autoDecompose(goal) {
  const name = (goal.name || '').toLowerCase();

  if (name.includes('会计')) {
    return {
      monthly: {
        theme: '会计备考月',
        top3: ['完成教材章节学习', '刷题200道', '建立错题本'],
        goals: [
          { dimension: 'A', target: '完成会计基础章节', metric: '章节完成数' },
          { dimension: 'B', target: '每周一套真题', metric: '真题套数' },
          { dimension: 'E', target: '错题回顾', metric: '错题掌握率' }
        ]
      },
      weekly: {
        theme: '会计章节推进',
        mustDo: ['完成2章学习', '完成50道练习题', '回顾上周错题']
      }
    };
  }

  if (name.includes('英语') || name.includes('english') || name.includes('雅思')) {
    return {
      monthly: {
        theme: '英语提升月',
        top3: ['单词量达3000+', '精读文章20篇', '写作练习4篇'],
        goals: [
          { dimension: 'A', target: '每日英语精学1h', metric: '学习天数' },
          { dimension: 'B', target: '口语跟读练习', metric: '录音次数' },
          { dimension: 'E', target: '单词记忆复习', metric: '复习完成率' }
        ]
      },
      weekly: {
        theme: '英语精学周',
        mustDo: ['精听5篇', '精读7篇', '写作1篇']
      }
    };
  }

  if (name.includes('写作') || name.includes('内容') || name.includes('创作')) {
    return {
      monthly: {
        theme: '内容创作月',
        top3: ['产出8篇内容', '粉丝增长目标', '建立内容库'],
        goals: [
          { dimension: 'B', target: '每周产出2篇内容', metric: '内容数量' },
          { dimension: 'A', target: '学习写作技巧', metric: '学习时长' },
          { dimension: 'E', target: '复盘内容数据', metric: '复盘次数' }
        ]
      },
      weekly: {
        theme: '内容产出周',
        mustDo: ['完成2篇内容', '选题策划3个', '互动维护']
      }
    };
  }

  if (name.includes('健身') || name.includes('健康') || name.includes('运动')) {
    return {
      monthly: {
        theme: '健康管理月',
        top3: ['健身20天', '体重管理', '作息规律'],
        goals: [
          { dimension: 'C', target: '每周健身4次', metric: '健身天数' },
          { dimension: 'C', target: '控制饮食', metric: '外卖次数' },
          { dimension: 'E', target: '睡眠管理', metric: '早睡天数' }
        ]
      },
      weekly: {
        theme: '健康养成周',
        mustDo: ['健身4次', '不点外卖', '22:30前入睡']
      }
    };
  }

  if (name.includes('读书') || name.includes('阅读')) {
    return {
      monthly: {
        theme: '阅读月',
        top3: ['读完2本书', '写2篇读书笔记', '每日阅读30min'],
        goals: [
          { dimension: 'D', target: '每日阅读', metric: '阅读天数' },
          { dimension: 'B', target: '输出读书笔记', metric: '笔记篇数' }
        ]
      },
      weekly: {
        theme: '阅读周',
        mustDo: ['读半本书', '写1篇笔记', '分享1个金句']
      }
    };
  }

  return {
    monthly: {
      theme: `${goal.name || '目标'}月计划`,
      top3: ['制定详细执行计划', '每日推进任务', '定期复盘'],
      goals: [
        { dimension: 'A', target: goal.name || '目标推进', metric: '完成进度' },
        { dimension: 'E', target: '定期复盘', metric: '复盘次数' }
      ]
    },
    weekly: {
      theme: `${goal.name || '目标'}周计划`,
      mustDo: ['推进核心任务', '检查进度', '调整策略']
    }
  };
}

export function generateReview(data) {
  const today = todayStr();
  const todos = (data.plans && data.plans.daily) || [];
  const doneCount = todos.filter(t => t.done).length;
  const totalCount = todos.length;
  const completionRate = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  let checkedCount = 0;
  HABIT_LIST.forEach(name => {
    const hd = data.habitData && data.habitData[name];
    if (hd && hd[today]) checkedCount++;
  });
  const habitRate = HABIT_LIST.length > 0 ? Math.round(checkedCount / HABIT_LIST.length * 100) : 0;

  const highlights = [];
  const improvements = [];

  if (completionRate >= 80) {
    highlights.push('今日任务完成率优秀，执行力很强');
  } else if (completionRate >= 50) {
    highlights.push('完成了一半以上的任务，继续保持');
  } else {
    improvements.push('今日任务完成率偏低，需要提高执行力');
  }

  if (habitRate >= 80) {
    highlights.push('习惯养成表现优秀，坚持得很好');
  } else if (habitRate >= 50) {
    highlights.push('习惯打卡过半，继续保持');
  } else {
    improvements.push('习惯打卡较少，需要加强坚持');
  }

  if (doneCount > 0) {
    const doneTodos = todos.filter(t => t.done).map(t => t.text);
    if (doneTodos.length > 0) {
      highlights.push(`完成了：${doneTodos.slice(0, 3).join('、')}`);
    }
  }

  const undone = todos.filter(t => !t.done);
  if (undone.length > 0) {
    improvements.push(`未完成：${undone.slice(0, 3).map(t => t.text).join('、')}`);
  }

  let suggestion = '';
  if (completionRate >= 80 && habitRate >= 80) {
    suggestion = '今天表现非常出色，保持这个节奏，明天继续加油！';
  } else if (completionRate >= 50 || habitRate >= 50) {
    suggestion = '今天表现不错，但还有提升空间，明天重点完成未完成的任务。';
  } else {
    suggestion = '今天完成情况不理想，建议明天优先完成最重要的3件事，并坚持习惯打卡。';
  }

  return {
    completionRate,
    habitRate,
    highlights,
    improvements,
    suggestion
  };
}

export function getLearningSuggestions(dataOrType, subject) {
  if (typeof dataOrType === 'string') {
    const map = {
      english: SUGGESTIONS.study,
      accounting: SUGGESTIONS.exam,
      writing: SUGGESTIONS.skill,
      editing: SUGGESTIONS.skill,
      photoshop: SUGGESTIONS.skill,
      calligraphy: SUGGESTIONS.skill
    };
    return map[dataOrType] || SUGGESTIONS.skill;
  }

  const data = dataOrType;
  const subj = data.learning[subject];
  const out = [];
  if (!subj) return out;

  const wm = weekMinutes(subj);
  const streak = computeStreak(subj.studyCheckins);
  const todayMin = (subj.studyCheckins || []).filter(c => c.date === todayStr()).reduce((s, c) => s + (c.minutes || 0), 0);

  out.push({
    label: '学习时长分析',
    detail: `本周累计 ${formatMinutes(wm)}，今日 ${formatMinutes(todayMin)}，连续打卡 ${streak} 天。` +
      (wm >= 300 ? '保持节奏，稳定输出。' : (wm > 0 ? '时长偏少，建议本周至少达到 5 小时。' : '本周还未开始学习，立即开启一次打卡吧。'))
  });

  const courses = subj.bilibiliCourses || [];
  const inProgress = courses.filter(c => !c.completed && c.watchedEpisodes < c.totalEpisodes);
  const completed = courses.filter(c => c.completed || c.watchedEpisodes >= c.totalEpisodes);
  if (inProgress.length) {
    const c = inProgress[0];
    out.push({ label: '网课进度', detail: `「${c.title}」已学 ${c.watchedEpisodes}/${c.totalEpisodes} 集，继续观看保持连贯。` });
  } else if (courses.length && !completed.length) {
    out.push({ label: '网课进度', detail: '有未开始的网课，建议尽快开始第一集。' });
  } else if (completed.length) {
    out.push({ label: '网课进度', detail: `已完成 ${completed.length} 门网课，可挑选进阶课程或开始实战作品。` });
  } else {
    out.push({ label: '网课进度', detail: '暂无网课记录，可在「B站网课」添加课程并跟学。' });
  }

  const errors = subj.errorBook || [];
  if (errors.length) {
    const mastered = errors.filter(e => e.mastered).length;
    const due = errors.filter(e => !e.mastered && e.nextReviewDate && e.nextReviewDate <= todayStr()).length;
    out.push({ label: '错题本', detail: `共 ${errors.length} 题，已掌握 ${mastered} 题，` + (due ? `今日待复习 ${due} 题，建议优先回顾。` : '暂无到期复习。') });
  }

  const res = LEARNING_RESOURCES[subject];
  if (res && res.examInfo) {
    const ed = parseChineseDate(res.examInfo.date);
    if (ed) {
      const dd = daysUntil(ed);
      if (dd > 0) {
        out.push({ label: '考试倒计时', detail: `距离考试约 ${dd} 天（${res.examInfo.date}）。` + (dd <= 30 ? '进入冲刺阶段，加大真题与模考强度。' : '按章节稳步推进，配合错题本查漏补缺。') });
      } else if (dd === 0) {
        out.push({ label: '考试倒计时', detail: '考试就在今日，保持心态，轻量复习重点知识。' });
      }
      if (res.examInfo.regDate) {
        const rd = parseChineseDate(res.examInfo.regDate);
        if (rd && daysUntil(rd) >= 0) {
          out.push({ label: '报名提醒', detail: `报名时间为 ${res.examInfo.regDate}，请在截止前完成报名。` });
        }
      }
    } else if (res.examInfo.date) {
      out.push({ label: '考试信息', detail: `考试时间：${res.examInfo.date}，请关注官网获取最新动态。` });
    }
  }

  const base = subject === 'accounting' ? SUGGESTIONS.exam : subject === 'english' ? SUGGESTIONS.study : SUGGESTIONS.skill;
  if (base && base.length) {
    const s = base[Math.floor(Math.random() * base.length)];
    out.push({ label: '方法建议', detail: `${s.label}：${s.detail}` });
  }

  return out;
}

export function getStudyCheckinAnalysis(data, subject) {
  const sub = data.learning && data.learning[subject];
  const checkins = (sub && sub.studyCheckins) || [];
  const today = todayStr();
  const ws = dateStr(weekStart());
  const monthPrefix = monthStr() + '-';

  let weekMinutesVal = 0;
  let monthMinutesVal = 0;
  checkins.forEach(c => {
    if (c.date >= ws && c.date <= today) weekMinutesVal += (c.minutes || 0);
    if (c.date.startsWith(monthPrefix)) monthMinutesVal += (c.minutes || 0);
  });

  const checkinDates = checkins
    .map(c => c.date)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort();

  let streak = 0;
  let maxStreak = 0;
  let prevDate = null;
  checkinDates.forEach(d => {
    if (prevDate) {
      const diff = (new Date(d) - new Date(prevDate)) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        maxStreak = Math.max(maxStreak, streak);
        streak = 1;
      }
    } else {
      streak = 1;
    }
    maxStreak = Math.max(maxStreak, streak);
    prevDate = d;
  });

  let suggestion = '';
  if (weekMinutesVal >= 300) {
    suggestion = '本周学习时长充足，继续保持！';
  } else if (weekMinutesVal >= 120) {
    suggestion = '本周学习时长尚可，建议增加至5小时以上。';
  } else {
    suggestion = '本周学习时长不足，建议每天至少学习30分钟。';
  }

  return {
    weekMinutes: weekMinutesVal,
    monthMinutes: monthMinutesVal,
    streak: maxStreak,
    suggestion
  };
}

export function getBilibiliCourseSuggestions(courses) {
  if (!courses || courses.length === 0) {
    return '还没有添加B站网课，去添加一个开始学习吧';
  }

  const incompleted = courses.filter(c => !c.completed);
  if (incompleted.length === 0) {
    return '所有网课已完成，太棒了！可以添加新的课程继续学习。';
  }

  let totalRemaining = 0;
  incompleted.forEach(c => {
    const watched = c.watchedEpisodes || 0;
    const total = c.totalEpisodes || 0;
    totalRemaining += Math.max(0, total - watched);
  });

  const dailySuggest = Math.ceil(totalRemaining / 30);
  return `还有${totalRemaining}集未看完，建议每天看${dailySuggest}集`;
}

export function getScheduleSuggestions(data, subject) {
  if (subject === 'accounting') {
    const examDate = '2026-05-16';
    const days = daysUntil(examDate);
    if (days > 0) {
      const chaptersPerWeek = Math.max(1, Math.ceil(10 / (days / 7)));
      return `距考试还有${days}天，建议每周完成${chaptersPerWeek}章`;
    } else if (days === 0) {
      return '今天是考试日，加油！';
    } else {
      return '考试已结束，可以开始准备下一阶段学习。';
    }
  }

  if (subject === 'english') {
    return '建议每天英语精学1小时，包括单词、阅读、听力和口语。';
  }

  if (subject === 'writing' || subject === 'editing' || subject === 'photoshop' || subject === 'calligraphy') {
    return '建议每周跟练3次教程，每2周完成1个实战作品并发布。';
  }

  return '建议制定详细的学习计划并坚持执行。';
}

export function getErrorBookAnalysis(errorBook) {
  const book = errorBook || [];
  const today = todayStr();

  const errorTypes = {};
  const knowledgeTags = {};
  let reviewDue = 0;
  let mastered = 0;

  book.forEach(item => {
    const et = item.errorType || '其他';
    errorTypes[et] = (errorTypes[et] || 0) + 1;

    const kt = item.knowledgeTag || '未分类';
    knowledgeTags[kt] = (knowledgeTags[kt] || 0) + 1;

    if (item.mastered) {
      mastered++;
    } else if (item.nextReviewDate && item.nextReviewDate <= today) {
      reviewDue++;
    }
  });

  let suggestion = '';
  if (book.length === 0) {
    suggestion = '错题本为空，学习中遇到错题记得记录。';
  } else if (reviewDue > 0) {
    suggestion = `有${reviewDue}道错题需要复习，建议今天完成复习。`;
  } else if (mastered === book.length) {
    suggestion = '所有错题已掌握，继续保持！';
  } else {
    const topType = Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0];
    if (topType) {
      suggestion = `错误类型最多的是"${topType[0]}"（${topType[1]}次），建议针对此类问题加强练习。`;
    } else {
      suggestion = '继续记录和复习错题。';
    }
  }

  return {
    errorTypes,
    knowledgeTags,
    reviewDue,
    mastered,
    total: book.length,
    suggestion
  };
}

export function getTodayReviewErrors(data) {
  const today = todayStr();
  const result = [];

  Object.keys(LEARNING_SUBJECTS).forEach(subject => {
    const sub = data.learning && data.learning[subject];
    if (!sub || !sub.errorBook) return;
    sub.errorBook.forEach(err => {
      if (err.nextReviewDate && err.nextReviewDate <= today && !err.mastered) {
        result.push({ subject, errorItem: err });
      }
    });
  });

  return result;
}

export function getContentSuggestions(platform) {
  const suggestions = {
    xiaohongshu: '关注收藏率和封面优化，本周尝试2种封面风格',
    douyin: '关注完播率和前3秒，本周测试不同开头',
    bilibili: '优化标题和封面，关注互动率',
    podcast: '关注选题和时长，本期建议30-45分钟'
  };
  return suggestions[platform] || '关注数据反馈，持续优化内容质量。';
}

export function getReadingSuggestions(finished) {
  const books = (finished || []).filter(f => f.type === 'book' || !f.type);
  const movies = (finished || []).filter(f => f.type === 'movie');

  if (books.length === 0 && movies.length === 0) {
    return '还没有读完的书或看完的电影，先从一本感兴趣的书开始吧！';
  }

  if (books.length < 2) {
    return `已读${books.length}本书，建议每月至少读完1-2本书，保持阅读习惯。`;
  }

  return `已读${books.length}本书，阅读量不错！可以尝试不同类型的书籍拓宽视野。`;
}
