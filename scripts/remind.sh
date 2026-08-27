#!/bin/bash
export PATH="$HOME/.fly/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
LARK_CLI="$HOME/.trae-cn/plugins/trae-remote-official/lark/1.0.4/bin/lark-cli"
OPEN_ID="ou_0c2e26a10d333c6d489b863581d1d9d7"

HH=$(date +%H)
MM=$(date +%M)
DAY=$(date +%u)
DATE=$(date +%d)
MONTH=$(date +%m)
YEAR=$(date +%Y)
LAST_DAY=$(date -j -v+1m -jf "%Y-%m-%d" "${YEAR}-${MONTH}-01" "+%d" 2>/dev/null || echo "28")

send() {
  $LARK_CLI im +messages-send --user-id "$OPEN_ID" --as user --text "$1" 2>/dev/null
}

LOG="$HOME/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a8fea4788c992eb2b5946f3/scripts/remind.log"
echo "[$(date)] Check: HH=$HH MM=$MM DAY=$DAY DATE=$DATE/$MONTH LAST=$LAST_DAY" >> "$LOG"

if [ "$HH" = "07" ] && [ "$MM" -lt "30" ]; then
  send "早上好！今日待办已生成
打开工作台查看
https://houqianqian99-tech.github.io/growth-dashboard/"
  echo "[$(date)] Sent: morning reminder" >> "$LOG"
fi

if [ "$HH" = "09" ] && [ "$MM" -lt "30" ] && [ "$DAY" -le "5" ]; then
  send "会计备考时间到
番茄钟：45min学习 + 10min休息
加油！"
  echo "[$(date)] Sent: accounting reminder" >> "$LOG"
fi

if [ "$HH" = "20" ] && [ "$MM" -lt "30" ]; then
  if [ "$DAY" = "7" ]; then
    send "该写周复盘了
6个问题帮你总结一周
1. 本周目标完成率？
2. 哪个维度进展最好？
3. 本周最大收获？
4. 时间花在哪了？
5. 下周调整什么？
6. 下周3个must-do？"
    echo "[$(date)] Sent: weekly review reminder" >> "$LOG"
  else
    send "该写日复盘了
5个问题回顾今天
1. 今天完成了哪些任务？
2. 哪3件事做得好？
3. 哪件事没做好？卡在哪？
4. 明天最重要的一件事？
5. 今天有什么收获或感恩？"
    echo "[$(date)] Sent: daily review reminder" >> "$LOG"
  fi

  if [ "$DATE" = "$LAST_DAY" ]; then
    send "今天也是月复盘日
5个问题总结本月
1. 月度目标完成率？
2. 关键指标追踪
3. 本月最满意/最遗憾？
4. 下月调整什么？
5. 填好下月计划"
    echo "[$(date)] Sent: monthly review reminder" >> "$LOG"
  fi
fi

if [ "$HH" = "22" ] && [ "$MM" -lt "30" ]; then
  send "习惯打卡提醒
还有哪些习惯没打卡？
打开工作台完成今日打卡
https://houqianqian99-tech.github.io/growth-dashboard/"
  echo "[$(date)] Sent: habit reminder" >> "$LOG"
fi
