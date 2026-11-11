export const CAMPUSES = ["东区", "西区", "南区", "北区"] as const;
export const CATEGORIES = ["教材教辅", "生活用品", "电子产品", "文体器材"] as const;
export const REPORT_REASONS = ["虚假描述", "疑似广告", "其他"] as const;

export const GOODS_STATUS: Record<string, string> = {
  draft: "草稿",
  pending: "待审核",
  on_sale: "在售",
  trading: "交易中",
  off: "已下架",
  rejected: "已驳回",
  sold: "已售出",
};

export const ORDER_STATUS: Record<string, string> = {
  pending: "待交易",
  cancelled: "已取消",
  done: "已完成",
};

export const REPORT_STATUS: Record<string, string> = {
  open: "未处理",
  hold: "暂缓",
  closed: "已处理",
  dismissed: "已驳回",
};

export function yuan(fen: number) {
  const yuanValue = fen / 100;
  const text = Number.isInteger(yuanValue) ? String(yuanValue) : yuanValue.toFixed(2);
  return "¥" + text;
}

export function orderNo(id: number) {
  return "D" + String(id).padStart(3, "0");
}
