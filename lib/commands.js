const HABIT_LIST = ['22:30前入睡','6:30起床','健身/运动30min','不点外卖','英语学习1h','会计备考2h+','读书30min','小红书/抖音内容产出','练字20min','日复盘完成','自己做饭'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function parseMessage(text) {
  const t = text.trim();
  if (t === '帮助' || t === 'help' || t === '?') return { cmd: 'help' };
  if (t === '待办' || t === '今日待办' || t === 'todo') return { cmd: 'list_todos' };
  if (t === '打卡' || t === '习惯') return { cmd: 'list_habits' };
  if (t === '今日' || t === '总结' || t === 'summary') return { cmd: 'summary' };

  let m;
  if (m = t.match(/^完成\s+(.+)/)) return { cmd: 'done_todo', keyword: m[1].trim() };
  if (m = t.match(/^打卡\s+(.+)/)) return { cmd: 'done_habit', keyword: m[1].trim() };
  if (m = t.match(/^进度\s+(\d+)/)) return { cmd: 'set_progress', value: parseInt(m[1]) };
  if (m = t.match(/^取消完成\s+(.+)/)) return { cmd: 'undo_todo', keyword: m[1].trim() };
  if (m = t.match(/^取消打卡\s+(.+)/)) return { cmd: 'undo_habit', keyword: m[1].trim() };

  return { cmd: 'unknown', text: t };
}

export function handleCommand(cmd, data) {
  const today = todayStr();
  switch (cmd.cmd) {
    case 'help':
      return '可用指令：\n待办 — 查看今日待办\n打卡 — 查看未打卡习惯\n完成 [关键词] — 勾选待办\n打卡 [关键词] — 打卡习惯\n进度 [数字] — 更新当前目标进度\n取消完成 [关键词] — 取消勾选\n取消打卡 [关键词] — 取消打卡\n今日 — 今日总结';

    case 'list_todos': {
      const todos = (data.todos || []).filter(t => t.date === today);
      if (todos.length === 0) return '今日暂无待办';
      const pending = todos.filter(t => !t.done);
      const done = todos.filter(t => t.done);
      let msg = `今日待办（${done.length}/${todos.length}）：\n`;
      pending.forEach((t, i) => { msg += `\n${i+1}. ⬜ ${t.text}`; });
      done.forEach((t) => { msg += `\n   ✅ ${t.text}`; });
      return msg;
    }

    case 'list_habits': {
      const habits = data.habitData || {};
      const unchecked = HABIT_LIST.filter(h => !habits[h] || !habits[h][today]);
      const checked = HABIT_LIST.filter(h => habits[h] && habits[h][today]);
      if (unchecked.length === 0) return `全部 ${HABIT_LIST.length} 项习惯已打卡！`;
      let msg = `未打卡（${unchecked.length}项）：\n`;
      unchecked.forEach((h, i) => { msg += `\n${i+1}. ⬜ ${h}`; });
      if (checked.length > 0) msg += `\n\n已打卡 ${checked.length} 项`;
      return msg;
    }

    case 'done_todo': {
      const todos = (data.todos || []).filter(t => t.date === today);
      const match = todos.find(t => !t.done && t.text.includes(cmd.keyword));
      if (match) { match.done = true; return `✅ 已完成：${match.text}`; }
      const doneMatch = todos.find(t => t.done && t.text.includes(cmd.keyword));
      if (doneMatch) return `该项已完成：${doneMatch.text}`;
      return `未找到包含「${cmd.keyword}」的待办，发送「待办」查看列表`;
    }

    case 'done_habit': {
      const match = HABIT_LIST.find(h => h.includes(cmd.keyword) || cmd.keyword.includes(h.split('/')[0]));
      if (match) {
        if (!data.habitData) data.habitData = {};
        if (!data.habitData[match]) data.habitData[match] = {};
        data.habitData[match][today] = true;
        return `✅ 已打卡：${match}`;
      }
      return `未找到包含「${cmd.keyword}」的习惯，发送「打卡」查看列表`;
    }

    case 'undo_todo': {
      const todos = (data.todos || []).filter(t => t.date === today);
      const match = todos.find(t => t.done && t.text.includes(cmd.keyword));
      if (match) { match.done = false; return `↩️ 已取消：${match.text}`; }
      return `未找到已完成的「${cmd.keyword}」`;
    }

    case 'undo_habit': {
      const match = HABIT_LIST.find(h => h.includes(cmd.keyword) || cmd.keyword.includes(h.split('/')[0]));
      if (match && data.habitData?.[match]) {
        data.habitData[match][today] = false;
        return `↩️ 已取消打卡：${match}`;
      }
      return `未找到已打卡的「${cmd.keyword}」`;
    }

    case 'set_progress': {
      const goals = (data.goals || data.annualGoals || []).filter(g => g.priority === 'P0');
      if (goals.length === 0) {
        const all = data.goals || data.annualGoals || [];
        if (all.length > 0) { all[0].progress = cmd.value; return `📊 已更新「${all[0].name}」进度为 ${cmd.value}%`; }
        return '暂无目标可更新';
      }
      goals[0].progress = cmd.value;
      return `📊 已更新「${goals[0].name}」进度为 ${cmd.value}%`;
    }

    case 'summary': {
      const todos = (data.todos || []).filter(t => t.date === today);
      const done = todos.filter(t => t.done);
      const habitDone = HABIT_LIST.filter(h => data.habitData?.[h]?.[today]).length;
      let msg = `📊 今日总结\n待办：${done.length}/${todos.length}\n习惯：${habitDone}/${HABIT_LIST.length}`;
      const todayReview = data.review?.daily?.find(r => r.date === today);
      msg += `\n复盘：${todayReview?.answers?.some(a => a?.trim()) ? '已完成' : '未完成'}`;
      return msg;
    }

    default:
      return `未识别指令「${cmd.text}」，发送「帮助」查看可用指令`;
  }
}
