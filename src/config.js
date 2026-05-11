window.PLANNER_CONFIG = {
  apiBase: "",
  apiMode: "demo",
  amapKey: "bcfb2c22809e9e301734314e0f8a6cee",
  amapSecurityCode: "846b54c438251373f159a89402e1dba7",
  city: "上海",
  mapProvider: "amap",
  authMode: "api",
  allowDemoPayment: true,
  plans: [
    {
      id: "pro-monthly",
      label: "月付",
      price: "¥19",
      period: "每月",
      amountCents: 1900,
      durationDays: 31,
      tag: "灵活",
      description: "适合短期接单或先试用"
    },
    {
      id: "pro-yearly",
      label: "年付",
      price: "¥99",
      period: "每年",
      amountCents: 9900,
      durationDays: 366,
      tag: "推荐",
      description: "长期使用更划算",
      recommended: true
    },
    {
      id: "pro-lifetime",
      label: "终身",
      price: "¥699",
      period: "一次付清",
      amountCents: 69900,
      durationDays: 36500,
      tag: "买断",
      description: "一次开通，长期使用"
    }
  ],
  manualPayment: {
    payeeName: "支付宝收款账户",
    alipayQrImage: "./assets/alipay-qr.jpg"
  }
};
