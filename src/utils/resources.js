export const LEARNING_RESOURCES = {
  english: {
    name: '英语雅思',
    examInfo: { date: '随时报考', regUrl: 'https://www.chinaielts.org/' },
    resources: [
      { title: '雅思官方备考指南', url: 'https://www.chinaielts.org/prepare', type: 'official', free: true, desc: '英国文化教育协会官方备考资源' },
      { title: '剑桥英语免费样题下载', url: 'https://www.cambridgeenglish.cn/exams-and-tests/ielts/preparation-new/', type: 'official', free: true, desc: '官方免费样题和音频' },
      { title: 'IELTS官方模拟考试', url: 'https://www.ielts.org/for-test-takers/sample-test-questions', type: 'official', free: true, desc: 'IELTS.org 官方免费样题' },
      { title: 'IELTS Ready 初阶版(免费)', url: 'https://www.chinaielts.org/', type: 'official', free: true, desc: '注册即可使用，含2套全科练习' }
    ]
  },
  accounting: {
    name: '初级会计',
    examInfo: { date: '2026年5月16-18日', regDate: '2026年1月5-27日', regUrl: 'https://ausm.mof.gov.cn/index/' },
    resources: [
      { title: '2026年初级会计考试大纲(PDF)', url: 'https://m.mof.gov.cn/tzgg/202512/P020251225378678530611.pdf', type: 'official', free: true, desc: '财政部官方发布，2026年度考试大纲' },
      { title: '全国会计人员统一服务管理平台', url: 'https://ausm.mof.gov.cn/index/', type: 'official', free: true, desc: '官方报名平台' },
      { title: '之了课堂免费题库', url: 'https://www.zlketang.com/exercises/4.html', type: 'free', free: true, desc: '免费刷题平台，含章节试题+真题+模拟题' },
      { title: '环球网校免费题库', url: 'https://www.hqwx.com/cjkjzc-kaoshi/', type: 'free', free: true, desc: '每日一练+章节试题+真题+模拟题' }
    ]
  },
  writing: {
    name: '写作',
    resources: [
      { title: 'B站写作教程合集', url: 'https://search.bilibili.com/all?keyword=写作教程', type: 'free', free: true, desc: 'B站免费视频教程' },
      { title: '豆瓣写作小组', url: 'https://www.douban.com/group/explore', type: 'free', free: true, desc: '写作交流社区' }
    ]
  },
  editing: {
    name: '视频剪辑',
    resources: [
      { title: 'B站PR/剪映教程', url: 'https://search.bilibili.com/all?keyword=PR剪辑教程', type: 'free', free: true, desc: 'B站免费视频教程' },
      { title: '剪映官方教程', url: 'https://www.capcut.cn/', type: 'official', free: true, desc: '剪映官方教程和模板' }
    ]
  },
  photoshop: {
    name: 'PS',
    resources: [
      { title: 'B站PS教程合集', url: 'https://search.bilibili.com/all?keyword=PS教程', type: 'free', free: true, desc: 'B站免费PS视频教程' },
      { title: 'Adobe官方教程', url: 'https://helpx.adobe.com/cn/photoshop/tutorials.html', type: 'official', free: true, desc: 'Adobe官方PS教程' }
    ]
  },
  calligraphy: {
    name: '练字',
    resources: [
      { title: 'B站硬笔书法教程', url: 'https://search.bilibili.com/all?keyword=硬笔书法教程', type: 'free', free: true, desc: 'B站免费练字教程' },
      { title: '字帖生成工具', url: 'https://www.zuofanka.com/', type: 'free', free: true, desc: '在线生成字帖' }
    ]
  }
};
