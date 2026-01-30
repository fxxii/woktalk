export type Language = 'en' | 'hk';

export const COMMAND_PATTERNS = {
  next: [
    '下一步',
    '下一个',
    '繼續',
    '继续',
    'next',
    'continue'
  ],
  prev: [
    '上一步',
    '返回',
    '前一步',
    'previous',
    'back'
  ],
  repeat: [
    '重複',
    '重复',
    '再講',
    '再说',
    'repeat',
    'again'
  ],
  timer: [
    '計時',
    '计时',
    '開始計時',
    'timer',
    'start timer'
  ],
  stop: [
    '停止',
    '暫停',
    '停',
    'stop',
    'pause'
  ]
};

export const MESSAGES = {
  en: {
    next: 'Next',
    prev: 'Previous',
    repeat: 'Repeat',
    timer: 'Timer',
    stop: 'Stop',
    startTimer: 'Start Timer ⏱️',
    stopTimer: 'Stop ⏹️',
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    lookFor: 'Look for:',
    why: 'Why?',
    hide: 'Hide',
    confirmed: '✓ Confirmed',
    verify: '⚠ Verify',
    uncertain: '⚠ Uncertain',
    listening: 'Listening...',
    tapToTalk: 'Tap to talk',
    voiceNotSupported: 'Voice control not supported in this browser',
    voiceCommands: 'Voice Commands:',

    expertMode: 'Expert Mode',
    expertModeDesc: 'Show AI information (confidence, status, etc.)',
    settings: 'Settings',
    language: 'Language',
    finished: '🎉 Finished! Enjoy your meal!',
    ingredients: 'Ingredients',
    prep: 'Prep',
    cook: 'Cook',
    itemsReady: (current: number, total: number) => `${current} of ${total} items ready`,
    startPrep: 'Start Prep Work →',
    prepSubtitle: 'Wash, cut, and marinate before you open fire.',
    startCooking: 'Start Cooking',
    min: 'min',
    servings: 'servings',
    saved: 'saved',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
  },
  hk: {
    next: '下一步',
    prev: '上一步',
    repeat: '重複',
    timer: '計時',
    stop: '停止',
    startTimer: '開始計時 ⏱️',
    stopTimer: '停止 ⏹️',
    stepOf: (current: number, total: number) => `第 ${current} 步 (共 ${total} 步)`,
    lookFor: '留意:',
    why: '點解？',
    hide: '隱藏',
    confirmed: '✓ 已確認',
    verify: '⚠ 需核實',
    uncertain: '⚠ 未能確定',
    listening: '聽緊...',
    tapToTalk: '撳嚟講嘢',
    voiceNotSupported: '流覽器唔支持語音控制',
    voiceCommands: '語音指令:',

    expertMode: '專家模式',
    expertModeDesc: '顯示 AI 資訊 (信心度、狀態等)',
    settings: '設定',
    language: '語言',
    finished: '🎉 上碟！慢慢享用！',
    ingredients: '買餸',
    prep: '洗切',
    cook: '開火',
    itemsReady: (current: number, total: number) => `已準備 ${current} / ${total} 項食材`,
    startPrep: '開始洗洗切切 →',
    prepSubtitle: '開火之前，先洗好、切好、醃好食材。',
    startCooking: '開始煮嘢食',
    min: '分鐘',
    servings: '人份',
    saved: '節省',
    easy: '簡單',
    medium: '中等',
    hard: '困難'
  }
};
