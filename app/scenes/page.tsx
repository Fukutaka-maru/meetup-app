import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "こんなシーンで使える | dot meet",
  description:
    "駅、イベント会場、旅行先など、待ち合わせで相手を見つけにくいシーンでのdot meetの活用例を紹介します。",
};

const SCENES = [
  {
    emoji: "🚉",
    title: "駅・改札での待ち合わせ",
    body: "「どの改札にいる？」「何口から出た？」というやり取りが減ります。大きな駅や乗り換えが多い駅では、同じ駅でも出口が何十mも離れていることがあり、電話で説明するのが難しい場面が多いです。dot meetならお互いの現在地が地図上にそのまま表示されるので、言葉で説明する必要がありません。",
  },
  {
    emoji: "🎪",
    title: "フェス・イベント会場での待ち合わせ",
    body: "人が多く、目印になる場所が少ない野外フェスやイベント会場では、待ち合わせ場所を事前に決めていてもはぐれてしまうことがあります。会場内は電波が混雑して通話がつながりにくいこともありますが、位置情報の共有だけなら軽い通信量で済むため、比較的つながりやすい状況でも使いやすいです。",
  },
  {
    emoji: "✈️",
    title: "旅行先・出張先での待ち合わせ",
    body: "土地勘のない旅行先では、住所や建物名を伝えても相手がすぐに理解できないことがあります。地図上の位置を直接共有できるので、言語や土地勘の違いを気にせず合流できます。海外旅行中に空港や観光地で別行動をしていたグループと合流する場面にも便利です。",
  },
  {
    emoji: "🏬",
    title: "ショッピングモール・商業施設での待ち合わせ",
    body: "フロアが分かれている大型施設では「何階のどのあたり」を口頭で伝えるのが難しいことがあります。買い物中に一時的に別行動をして、後で合流したいときにも役立ちます。",
  },
  {
    emoji: "🎆",
    title: "花火大会・野外イベントでの待ち合わせ",
    body: "混雑した人混みの中で、決めていた待ち合わせ場所にたどり着けないことは珍しくありません。移動しながらでもお互いの位置がリアルタイムに更新されるので、人混みの中でも合流しやすくなります。",
  },
];

export default function ScenesPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-600">
      <h1 className="mb-3 text-xl font-semibold text-slate-900">
        こんなシーンで使える
      </h1>
      <p className="mb-10 text-slate-500">
        dot meet（ドットミート）は、相手を見つけにくい場所での待ち合わせに役立ちます。実際によくある活用シーンを紹介します。
      </p>

      <div className="space-y-10">
        {SCENES.map((scene) => (
          <section key={scene.title}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <span className="text-xl">{scene.emoji}</span>
              {scene.title}
            </h2>
            <p>{scene.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-slate-100 pt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] active:bg-slate-800"
        >
          待ち合わせを始める
        </Link>
      </div>
    </main>
  );
}
