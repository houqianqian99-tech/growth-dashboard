import { el, h, toast, openModal, closeModal } from '../utils/helpers.js';
import { resetData } from '../data/store.js';

export function renderSettings(data, update) {
  const root = el('div', 'page');

  root.appendChild(buildAutomationCard(data, update));
  root.appendChild(buildFeishuCard(data, update));
  root.appendChild(buildDataCard(data, update));
  root.appendChild(buildAboutCard());

  return root;
}

function buildFeishuCard(data, update) {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '飞书机器人'));

  if (!data.settings.feishu) data.settings.feishu = { appId: '', appSecret: '', botOpenId: '', enabled: false };
  const fs = data.settings.feishu;

  const guide = el('div', 'ai-suggest');
  guide.style.marginBottom = '12px';
  guide.appendChild(h('b', '', '配置指南'));
  const steps = [
    '1. 前往 open.feishu.cn 创建企业自建应用',
    '2. 在「凭证与基础信息」获取 App ID 和 App Secret',
    '3. 启用「机器人」能力',
    '4. 在「事件订阅」填写回调地址（需公网 HTTPS）',
    '5. 订阅「接收消息 v2.0」事件',
    '6. 获取你的 Open ID（在通讯录中查看）',
    '7. 在下方填写信息并保存，即可通过飞书接收提醒和勾选任务'
  ];
  steps.forEach(s => guide.appendChild(h('div', 'rw-sub', s)));
  card.appendChild(guide);

  const fields = [
    { key: 'appId', label: 'App ID', type: 'text', placeholder: 'cli_xxx' },
    { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '••••••••' },
    { key: 'botOpenId', label: '你的 Open ID', type: 'text', placeholder: 'ou_xxx' }
  ];
  fields.forEach(f => {
    const row = el('div');
    row.style.marginBottom = '10px';
    row.appendChild(h('label', '', f.label));
    const input = el('input');
    input.type = f.type;
    input.value = fs[f.key] || '';
    input.placeholder = f.placeholder;
    input.style.width = '100%';
    input.style.border = '1px solid var(--border)';
    input.style.borderRadius = '6px';
    input.style.padding = '8px 10px';
    input.style.fontSize = '13px';
    input.style.marginTop = '4px';
    input.addEventListener('input', () => { fs[f.key] = input.value; });
    row.appendChild(input);
    card.appendChild(row);
  });

  const toggleRow = el('div', 'form-row');
  toggleRow.style.display = 'flex';
  toggleRow.style.alignItems = 'center';
  toggleRow.style.justifyContent = 'space-between';
  toggleRow.style.padding = '10px 0';
  toggleRow.style.borderTop = '1px solid var(--border)';
  toggleRow.style.borderBottom = '1px solid var(--border)';
  const toggleInfo = el('div');
  toggleInfo.appendChild(h('div', '', '启用飞书提醒'));
  toggleInfo.appendChild(h('div', 'rw-sub', '到点自动推送提醒到飞书'));
  toggleRow.appendChild(toggleInfo);
  const toggle = el('label');
  toggle.style.position = 'relative';
  toggle.style.display = 'inline-block';
  toggle.style.width = '40px';
  toggle.style.height = '22px';
  toggle.style.flexShrink = '0';
  const checkbox = el('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !!fs.enabled;
  checkbox.style.opacity = '0';
  checkbox.style.width = '0';
  checkbox.style.height = '0';
  const slider = el('span');
  slider.style.position = 'absolute';
  slider.style.cursor = 'pointer';
  slider.style.top = '0';
  slider.style.left = '0';
  slider.style.right = '0';
  slider.style.bottom = '0';
  slider.style.backgroundColor = checkbox.checked ? 'var(--accent)' : 'var(--surface-3)';
  slider.style.transition = '0.2s';
  slider.style.borderRadius = '22px';
  slider.style.border = '1px solid var(--border)';
  const knob = el('span');
  knob.style.position = 'absolute';
  knob.style.left = '2px';
  knob.style.bottom = '2px';
  knob.style.width = '16px';
  knob.style.height = '16px';
  knob.style.backgroundColor = '#fff';
  knob.style.borderRadius = '50%';
  knob.style.transition = '0.2s';
  knob.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
  if (checkbox.checked) knob.style.transform = 'translateX(18px)';
  slider.appendChild(knob);
  checkbox.addEventListener('change', () => {
    fs.enabled = checkbox.checked;
    slider.style.backgroundColor = checkbox.checked ? 'var(--accent)' : 'var(--surface-3)';
    knob.style.transform = checkbox.checked ? 'translateX(18px)' : 'translateX(0)';
  });
  toggle.appendChild(checkbox);
  toggle.appendChild(slider);
  toggleRow.appendChild(toggle);
  card.appendChild(toggleRow);

  const btnRow = el('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '8px';
  btnRow.style.marginTop = '12px';

  const saveBtn = el('button', 'btn', '保存飞书配置');
  saveBtn.addEventListener('click', async () => {
    if (window._growth && window._growth.saveFeishuConfig) {
      await window._growth.saveFeishuConfig(fs);
    }
    toast('飞书配置已保存', 'success');
    update();
  });

  const testBtn = el('button', 'btn-secondary', '发送测试消息');
  testBtn.addEventListener('click', async () => {
    if (!fs.botOpenId) { toast('请先填写 Open ID', 'error'); return; }
    if (window._growth && window._growth.sendFeishuMessage) {
      const ok = await window._growth.sendFeishuMessage(fs.botOpenId, '测试消息：飞书机器人已连通！\n发送「帮助」查看可用指令。');
      toast(ok ? '测试消息已发送到飞书' : '发送失败，请检查配置', ok ? 'success' : 'error');
    }
  });

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(testBtn);
  card.appendChild(btnRow);

  const cmdBox = el('div', 'ai-suggest');
  cmdBox.style.marginTop = '12px';
  cmdBox.appendChild(h('b', '', '飞书对话指令'));
  const cmds = [
    '待办 — 查看今日待办列表',
    '完成 英语 — 勾选包含「英语」的待办',
    '打卡 健身 — 打卡包含「健身」的习惯',
    '进度 50 — 更新当前目标进度为 50%',
    '今日 — 查看今日完成总结',
    '帮助 — 查看所有指令'
  ];
  cmds.forEach(c => cmdBox.appendChild(h('div', 'rw-sub', '· ' + c)));
  card.appendChild(cmdBox);

  return card;
}

function buildAutomationCard(data, update) {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '自动化设置'));

  const toggles = [
    { key: 'autoDaily', label: '每日自动生成待办', desc: '每天自动生成当日待办清单' },
    { key: 'autoReview', label: '自动复盘提醒', desc: '到复盘时间自动提醒写复盘' },
    { key: 'autoWeeklyReport', label: '周报自动生成', desc: '每周日自动生成本周报告' },
    { key: 'autoMonthlyReport', label: '月报自动生成', desc: '每月末自动生成本月报告' }
  ];

  toggles.forEach(t => {
    const row = el('div', 'form-row');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '10px 0';
    row.style.borderBottom = '1px solid var(--border)';

    const info = el('div');
    info.appendChild(h('div', '', t.label));
    info.appendChild(h('div', 'rw-sub', t.desc));
    row.appendChild(info);

    const toggle = el('label');
    toggle.style.position = 'relative';
    toggle.style.display = 'inline-block';
    toggle.style.width = '40px';
    toggle.style.height = '22px';
    toggle.style.flexShrink = '0';

    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!data.automation[t.key];
    checkbox.style.opacity = '0';
    checkbox.style.width = '0';
    checkbox.style.height = '0';
    checkbox.addEventListener('change', () => {
      data.automation[t.key] = checkbox.checked;
    });

    const slider = el('span');
    slider.style.position = 'absolute';
    slider.style.cursor = 'pointer';
    slider.style.top = '0';
    slider.style.left = '0';
    slider.style.right = '0';
    slider.style.bottom = '0';
    slider.style.backgroundColor = checkbox.checked ? 'var(--accent)' : 'var(--surface-3)';
    slider.style.transition = '0.2s';
    slider.style.borderRadius = '22px';
    slider.style.border = '1px solid var(--border)';

    const knob = el('span');
    knob.style.position = 'absolute';
    knob.style.left = '2px';
    knob.style.bottom = '2px';
    knob.style.width = '16px';
    knob.style.height = '16px';
    knob.style.backgroundColor = '#fff';
    knob.style.borderRadius = '50%';
    knob.style.transition = '0.2s';
    knob.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
    if (checkbox.checked) knob.style.transform = 'translateX(18px)';
    slider.appendChild(knob);

    checkbox.addEventListener('change', () => {
      slider.style.backgroundColor = checkbox.checked ? 'var(--accent)' : 'var(--surface-3)';
      knob.style.transform = checkbox.checked ? 'translateX(18px)' : 'translateX(0)';
    });

    toggle.appendChild(checkbox);
    toggle.appendChild(slider);
    row.appendChild(toggle);
    card.appendChild(row);
  });

  const times = [
    { key: 'wakeUp', label: '起床时间' },
    { key: 'review', label: '复盘时间' },
    { key: 'sleep', label: '睡觉时间' }
  ];
  const timesWrap = el('div', 'grid row3');
  timesWrap.style.marginTop = '16px';
  times.forEach(t => {
    const row = el('div');
    row.appendChild(h('label', '', t.label));
    const input = el('input');
    input.type = 'time';
    input.value = data.automation.reminderTimes[t.key] || '';
    input.style.width = '100%';
    input.style.border = '1px solid var(--border)';
    input.style.borderRadius = '6px';
    input.style.padding = '6px 8px';
    input.style.fontSize = '13px';
    input.style.marginTop = '4px';
    input.addEventListener('input', () => {
      data.automation.reminderTimes[t.key] = input.value;
    });
    row.appendChild(input);
    timesWrap.appendChild(row);
  });
  card.appendChild(timesWrap);

  const saveBtn = el('button', 'btn', '保存设置');
  saveBtn.style.marginTop = '16px';
  saveBtn.addEventListener('click', () => {
    toast('设置已保存', 'success');
    update();
  });
  card.appendChild(saveBtn);

  return card;
}

function buildDataCard(data, update) {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '数据管理'));

  const actions = el('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.flexWrap = 'wrap';

  const exportBtn = el('button', 'btn', '导出数据');
  exportBtn.addEventListener('click', () => {
    const json = JSON.stringify(data, null, 2);
    downloadFile('growth_data.json', json, 'application/json');
  });

  const importBtn = el('button', 'btn-secondary', '导入数据');
  importBtn.addEventListener('click', () => {
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          Object.keys(data).forEach(key => {
            if (imported[key] !== undefined) {
              data[key] = imported[key];
            }
          });
          toast('数据导入成功', 'success');
          update();
        } catch (err) {
          toast('文件解析失败，请检查格式', 'error');
        }
      };
      reader.onerror = () => toast('文件读取失败', 'error');
      reader.readAsText(file);
    });
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  });

  const resetBtn = el('button', 'btn-danger', '重置数据');
  resetBtn.addEventListener('click', () => {
    const modalHtml = `
      <div class="modal">
        <h3>确认重置数据</h3>
        <p style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:16px;">
          此操作将清除所有数据并恢复到初始状态，且不可撤销。确定继续吗？
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" data-close>取消</button>
          <button class="btn-danger" id="r-confirm">确认重置</button>
        </div>
      </div>
    `;
    const overlay = openModal(modalHtml, (ov) => {
      ov.querySelector('#r-confirm').addEventListener('click', () => {
        const defaults = resetData();
        Object.keys(data).forEach(key => {
          if (defaults[key] !== undefined) {
            data[key] = defaults[key];
          }
        });
        toast('数据已重置', 'success');
        closeModal(overlay);
        update();
      });
    });
  });

  actions.appendChild(exportBtn);
  actions.appendChild(importBtn);
  actions.appendChild(resetBtn);
  card.appendChild(actions);

  return card;
}

function buildAboutCard() {
  const card = el('div', 'card');
  card.appendChild(h('h3', '', '关于'));

  const info = el('div');
  info.style.lineHeight = '1.8';
  info.style.color = 'var(--text-2)';
  info.style.fontSize = '13px';

  const nameRow = el('div');
  nameRow.style.display = 'flex';
  nameRow.style.alignItems = 'center';
  nameRow.style.gap = '8px';
  nameRow.appendChild(h('span', '', '个人成长管理工作台'));
  const ver = h('span', 'badge-ai', 'v1.0.0');
  nameRow.appendChild(ver);
  info.appendChild(nameRow);

  info.appendChild(h('div', 'muted', '一个集目标管理、计划排期、习惯追踪、学习记录、内容运营、健康监测、阅读观影、复盘总结于一体的个人成长工作台。'));

  const features = el('div');
  features.style.marginTop = '12px';
  features.appendChild(h('div', '', '主要功能：'));
  const featList = [
    '年度目标分阶段管理，进度可视化追踪',
    '月计划 / 周计划 / 日待办三级排期',
    '习惯打卡热力图，每日坚持一目了然',
    '学习科目进度记录与资源管理',
    '多平台内容数据采集与运营分析',
    '体重 / 睡眠 / 外卖健康监测',
    '阅读观影记录与书评管理',
    '日 / 周 / 月三级复盘与 AI 分析'
  ];
  featList.forEach(f => {
    features.appendChild(h('div', 'rw-sub', '· ' + f));
  });
  info.appendChild(features);

  card.appendChild(info);
  return card;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('已导出', 'success');
}
