type Props = {
  className?: string;
};

// 2人の棒人間が手を伸ばし合い、その間に「・・」(dotdot)が浮かぶロゴ。
// 人物はモノトーン、間の2ドットだけがブランドカラー(青=自分/オレンジ=相手、
// 地図マーカーの色と対応)。
export default function Logo({ className = "h-16 w-auto" }: Props) {
  return (
    <svg viewBox="0 0 140 104" className={className} aria-hidden="true">
      <g stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none">
        {/* 自分 */}
        <circle cx="38" cy="22" r="10.5" fill="#0f172a" stroke="none" />
        <path d="M39 38 L43 66" />
        <path d="M40 47 L25 60" />
        <path d="M40 47 L60 36" />
        <path d="M43 66 L33 92" />
        <path d="M43 66 L54 90" />
        {/* 相手 */}
        <circle cx="102" cy="22" r="10.5" fill="#0f172a" stroke="none" />
        <path d="M101 38 L97 66" />
        <path d="M100 47 L115 60" />
        <path d="M100 47 L80 36" />
        <path d="M97 66 L107 92" />
        <path d="M97 66 L86 90" />
      </g>
      {/* 2人の手の間の「・・」= dotdot */}
      <circle cx="66.5" cy="33" r="3.5" fill="#2563eb" />
      <circle cx="73.5" cy="33" r="3.5" fill="#f97316" />
    </svg>
  );
}
