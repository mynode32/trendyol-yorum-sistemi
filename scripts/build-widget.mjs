// Gömülebilir widget'ı tek dosyalık klasik bir <script> bundle'ına derler.
// public/widget/widget.js, public/widget-demo.html'in ve üçüncü taraf sitelerin
// yüklediği yoldur; "build" script'i bunu next build'den önce çalıştırır.
import { build } from "esbuild";

await build({
  entryPoints: ["src/widget/widget.ts"],
  bundle: true,
  format: "iife",
  target: "es2018",
  minify: true,
  outfile: "public/widget/widget.js",
});

console.log("Widget bundle yazıldı: public/widget/widget.js");
