export interface DesignToken {
  name: string;
  value: string;
  usage: string;
}

export function useDesignTokens() {
  const colors: DesignToken[] = [
    { name: 'ink', value: '#0C0C0C', usage: '页面底色、弹窗深色背景' },
    { name: 'ink-soft', value: '#171717', usage: '面板、输入框、次级容器' },
    { name: 'deep', value: '#242424', usage: '渐变中段、卡片高光' },
    { name: 'tide', value: '#343434', usage: '高层容器、选中态填充' },
    { name: 'gold', value: '#D8B46A', usage: '主操作、房间号、描边' },
    { name: 'gold-deep', value: '#A87E3D', usage: '金色描边暗部、悬停' },
    { name: 'gold-pale', value: '#F0DCAE', usage: '高亮文字、装饰线' },
    { name: 'paper', value: '#F3F0E8', usage: '正文与标题' },
    { name: 'mist', value: '#D8E6E2', usage: '浅色背景、次要文字' },
    { name: 'jade', value: '#69CDAD', usage: '成功、在线、连接状态' },
    { name: 'ember', value: '#E07A5F', usage: '错误、退出、危险操作' },
    { name: 'muted', value: '#8FA3A7', usage: '说明文字、占位符' },
  ];

  const typography = [
    { name: 'Display', sample: '同步观影', size: '44px', lineHeight: '1.1', usage: '首屏标题' },
    {
      name: 'Title',
      sample: '房间控制',
      size: '24px',
      lineHeight: '1.25',
      usage: '页面与面板标题',
    },
    {
      name: 'Body',
      sample: '定时同步播放进度。',
      size: '14px',
      lineHeight: '1.6',
      usage: '正文说明',
    },
    {
      name: 'Label',
      sample: 'ROOM CODE',
      size: '12px',
      lineHeight: '1.4',
      usage: '字段标签、状态',
    },
    {
      name: 'Mono',
      sample: 'AG-8F3K2Q',
      size: '18px',
      lineHeight: '1.4',
      usage: '房间号、令牌、时间',
    },
  ];

  const spacing = [
    { name: '2xs', value: '4px' },
    { name: 'xs', value: '8px' },
    { name: 'sm', value: '12px' },
    { name: 'md', value: '16px' },
    { name: 'lg', value: '24px' },
    { name: 'xl', value: '32px' },
    { name: '2xl', value: '48px' },
    { name: '3xl', value: '72px' },
  ];

  const motion = [
    { name: 'instant', value: '120ms', usage: '按钮按压、状态切换' },
    { name: 'quick', value: '180ms', usage: '悬停、焦点、弹层出现' },
    { name: 'settle', value: '320ms', usage: '面板展开、页面过渡' },
  ];

  const principles = [
    '空间优先：面板之间保留 24px 以上空隙，信息不贴边。',
    '金色只做行动与状态：主按钮、房间号、需要被看见的描边。',
    '玉青只做运行状态：在线、已同步、遥控通道。',
    'Vapor 组件优先：页面只编排，组合式函数承载状态机。',
  ];

  return { colors, typography, spacing, motion, principles };
}
