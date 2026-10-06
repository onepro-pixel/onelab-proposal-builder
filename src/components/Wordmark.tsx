import black from "@/assets/brand/wordmark-black.png.asset.json";
import red from "@/assets/brand/wordmark-red.png.asset.json";
import white from "@/assets/brand/wordmark-white.png.asset.json";

const src = { black: black.url, red: red.url, white: white.url };

export function Wordmark({ color = "black", className = "h-5" }: { color?: keyof typeof src; className?: string }) {
  return <img src={src[color]} alt="OneLab" className={`w-auto max-w-none shrink-0 self-start object-contain ${className}`} />;
}
