// مولّد من مركز إعادة التصميم (gen_all.py SC): رسومات كرتونية بسيطة لكل قسم، إحداثيات لوحة 470×834
export type ScenePose = "wave" | "clip" | "gantt" | "coffee" | "point";
export interface SceneArt { props: string; pose: ScenePose; h: number; x: number; flip: boolean }
export const SCENE_ART: Record<string, SceneArt> = {
 "home": {
  "props": "   <g class=\"sx-flt\"><path d=\"M58 740 V470 a62 62 0 0 1 124 0 V740\" fill=\"#1C0E06\" stroke=\"#F4ECE4\" stroke-width=\"2.5\"/>   <path d=\"M74 740 V474 a46 46 0 0 1 92 0 V740\" fill=\"url(#dg)\" class=\"sx-glow\"/></g>   <path d=\"M74 740 L166 740 L250 812 L-10 812 Z\" fill=\"#FFB547\" opacity=\".12\"/>   <path d=\"M0 690 Q120 650 240 690 T470 680\" fill=\"none\" stroke=\"#FFB547\" stroke-opacity=\".35\" stroke-width=\"2\"/>   <defs><linearGradient id=\"dg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#FFD9A0\"/><stop offset=\"1\" stop-color=\"#FF6A00\"/></linearGradient></defs><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "wave",
  "h": 470,
  "x": 228,
  "flip": false
 },
 "search": {
  "props": "   <rect x=\"40\" y=\"370\" width=\"180\" height=\"370\" rx=\"10\" fill=\"#1C0E06\" stroke=\"#F4ECE4\" stroke-width=\"2.5\"/>   <path d=\"M40 460 H220\" stroke=\"#F4ECE4\" stroke-width=\"2\"/><path d=\"M40 550 H220\" stroke=\"#F4ECE4\" stroke-width=\"2\"/><path d=\"M40 640 H220\" stroke=\"#F4ECE4\" stroke-width=\"2\"/>   <rect x=\"52\" y=\"390\" width=\"16\" height=\"70\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"72\" y=\"404\" width=\"16\" height=\"56\" rx=\"3\" fill=\"#FFB547\"/><rect x=\"92\" y=\"384\" width=\"16\" height=\"76\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"112\" y=\"398\" width=\"16\" height=\"62\" rx=\"3\" fill=\"#FF8A24\"/><rect x=\"132\" y=\"390\" width=\"16\" height=\"70\" rx=\"3\" fill=\"#FFB547\"/><rect x=\"152\" y=\"410\" width=\"16\" height=\"50\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"172\" y=\"394\" width=\"16\" height=\"66\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"192\" y=\"402\" width=\"16\" height=\"58\" rx=\"3\" fill=\"#FFB547\"/>   <rect x=\"52\" y=\"490\" width=\"18\" height=\"60\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"74\" y=\"476\" width=\"18\" height=\"74\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"96\" y=\"498\" width=\"18\" height=\"52\" rx=\"3\" fill=\"#FFB547\"/><rect x=\"118\" y=\"480\" width=\"18\" height=\"70\" rx=\"3\" fill=\"#FF8A24\"/><rect x=\"140\" y=\"488\" width=\"18\" height=\"62\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"162\" y=\"494\" width=\"18\" height=\"56\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"184\" y=\"478\" width=\"18\" height=\"72\" rx=\"3\" fill=\"#FFB547\"/>   <rect x=\"52\" y=\"574\" width=\"16\" height=\"66\" rx=\"3\" fill=\"#FFB547\"/><rect x=\"72\" y=\"582\" width=\"16\" height=\"58\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"92\" y=\"566\" width=\"16\" height=\"74\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"112\" y=\"590\" width=\"16\" height=\"50\" rx=\"3\" fill=\"#FF8A24\"/><rect x=\"132\" y=\"572\" width=\"16\" height=\"68\" rx=\"3\" fill=\"#FFB547\"/><rect x=\"152\" y=\"580\" width=\"16\" height=\"60\" rx=\"3\" fill=\"#FF6A00\"/><rect x=\"172\" y=\"570\" width=\"16\" height=\"70\" rx=\"3\" fill=\"#F4ECE4\"/><rect x=\"192\" y=\"586\" width=\"16\" height=\"54\" rx=\"3\" fill=\"#FFB547\"/>   <g class=\"sx-flt\"><circle cx=\"370\" cy=\"300\" r=\"30\" fill=\"none\" stroke=\"#FFB547\" stroke-width=\"7\"/><path d=\"M392 322 L418 348\" stroke=\"#FFB547\" stroke-width=\"9\" stroke-linecap=\"round\"/></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "point",
  "h": 460,
  "x": 250,
  "flip": false
 },
 "write": {
  "props": "<circle class=\"sx-glow\" cx=\"110\" cy=\"420\" r=\"90\" fill=\"#FF6A00\" opacity=\"0.9\"/>   <g class=\"sx-flt\"><g transform=\"rotate(-8 140 520)\"><rect x=\"60\" y=\"440\" width=\"150\" height=\"196\" rx=\"10\" fill=\"#F4ECE4\"/><path d=\"M80 470 H150\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 492 H190\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 514 H190\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 536 H150\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 558 H190\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 580 H190\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M80 602 H150\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"3\" stroke-linecap=\"round\"/></g>   <g transform=\"rotate(6 160 520)\"><rect x=\"96\" y=\"470\" width=\"150\" height=\"196\" rx=\"10\" fill=\"#FFF6EC\" stroke=\"#1A0A02\" stroke-opacity=\".2\"/><path d=\"M116 500 H180\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 522 H226\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 544 H226\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 566 H226\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 588 H180\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 610 H226\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M116 632 H226\" stroke=\"#1A0A02\" stroke-opacity=\".45\" stroke-width=\"3\" stroke-linecap=\"round\"/><rect x=\"116\" y=\"496\" width=\"70\" height=\"8\" rx=\"4\" fill=\"#FF6A00\"/></g></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "clip",
  "h": 470,
  "x": 232,
  "flip": false
 },
 "collect": {
  "props": "   <rect class=\"sx-rise\" x=\"48\" y=\"650\" width=\"36\" height=\"90\" rx=\"8\" fill=\"#F4ECE4\"/><rect class=\"sx-rise\" x=\"98\" y=\"590\" width=\"36\" height=\"150\" rx=\"8\" fill=\"#FFB547\"/><rect class=\"sx-rise\" x=\"148\" y=\"620\" width=\"36\" height=\"120\" rx=\"8\" fill=\"#FF8A24\"/><rect class=\"sx-rise\" x=\"198\" y=\"530\" width=\"36\" height=\"210\" rx=\"8\" fill=\"#FF6A00\"/>   <g class=\"sx-flt\"><circle cx=\"110\" cy=\"390\" r=\"46\" fill=\"#F4ECE4\"/><path d=\"M110 390 L110 344 A46 46 0 0 1 154 404 Z\" fill=\"#FF6A00\"/><path d=\"M110 390 L154 404 A46 46 0 0 1 120 435 Z\" fill=\"#FFB547\"/></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "point",
  "h": 450,
  "x": 262,
  "flip": true
 },
 "chat": {
  "props": "<circle class=\"sx-glow\" cx=\"110\" cy=\"330\" r=\"70\" fill=\"#FF6A00\" opacity=\"0.85\"/>   <g class=\"sx-flt\"><rect x=\"40\" y=\"420\" width=\"190\" height=\"64\" rx=\"26\" fill=\"#F4ECE4\"/><path d=\"M70 482 l-8 26 l30 -24\" fill=\"#F4ECE4\"/><circle cx=\"100\" cy=\"452\" r=\"7\" fill=\"#1A0A02\" opacity=\".55\"/><circle cx=\"130\" cy=\"452\" r=\"7\" fill=\"#1A0A02\" opacity=\".55\"/><circle cx=\"160\" cy=\"452\" r=\"7\" fill=\"#1A0A02\" opacity=\".55\"/>   <rect x=\"250\" y=\"370\" width=\"170\" height=\"56\" rx=\"24\" fill=\"#FF6A00\"/><path d=\"M390 424 l12 24 l-30 -22\" fill=\"#FF6A00\"/><path d=\"M276 398 H392\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"5\" stroke-linecap=\"round\"/></g>   <path d=\"M420 200 V300\" stroke=\"#F4ECE4\" stroke-opacity=\".4\" stroke-width=\"2\"/><path d=\"M392 300 h56 l-12 -34 h-32z\" fill=\"#FFB547\" class=\"sx-glow\"/><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "coffee",
  "h": 420,
  "x": 120,
  "flip": false
 },
 "team": {
  "props": "<circle class=\"sx-glow\" cx=\"110\" cy=\"540\" r=\"100\" fill=\"#FF6A00\" opacity=\"0.55\"/>   <g class=\"sx-flt\"><g><circle cx=\"300\" cy=\"430\" r=\"24\" fill=\"#F4ECE4\"/><text x=\"300\" y=\"438\" text-anchor=\"middle\" font-family=\"Tajawal\" font-weight=\"800\" font-size=\"20\" fill=\"#1A0A02\">س</text></g><g><circle cx=\"348\" cy=\"430\" r=\"24\" fill=\"#FF8A24\"/><text x=\"348\" y=\"438\" text-anchor=\"middle\" font-family=\"Tajawal\" font-weight=\"800\" font-size=\"20\" fill=\"#1A0A02\">ن</text></g><g><circle cx=\"396\" cy=\"430\" r=\"24\" fill=\"#FFB547\"/><text x=\"396\" y=\"438\" text-anchor=\"middle\" font-family=\"Tajawal\" font-weight=\"800\" font-size=\"20\" fill=\"#1A0A02\">ر</text></g></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "gantt",
  "h": 430,
  "x": 40,
  "flip": false
 },
 "sup": {
  "props": "   <g class=\"sx-flt\"><rect x=\"34\" y=\"380\" width=\"230\" height=\"168\" rx=\"14\" fill=\"#F4ECE4\"/>   <g><circle cx=\"234\" cy=\"416\" r=\"12\" fill=\"#FF6A00\" stroke=\"#FF6A00\" stroke-width=\"3\"/><path d=\"M58 416 H210\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"5\" stroke-linecap=\"round\"/></g><g><circle cx=\"234\" cy=\"460\" r=\"12\" fill=\"#FF6A00\" stroke=\"#FF6A00\" stroke-width=\"3\"/><path d=\"M58 460 H210\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"5\" stroke-linecap=\"round\"/></g><g><circle cx=\"234\" cy=\"504\" r=\"12\" fill=\"none\" stroke=\"#FF6A00\" stroke-width=\"3\"/><path d=\"M58 504 H210\" stroke=\"#1A0A02\" stroke-opacity=\".5\" stroke-width=\"5\" stroke-linecap=\"round\"/></g><path d=\"M90 548 L70 740 M208 548 L228 740\" stroke=\"#F4ECE4\" stroke-width=\"3\"/></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "point",
  "h": 450,
  "x": 262,
  "flip": false
 },
 "cal": {
  "props": "<circle class=\"sx-glow\" cx=\"120\" cy=\"600\" r=\"90\" fill=\"#FF6A00\" opacity=\"0.7\"/>   <g class=\"sx-flt\"><rect x=\"36\" y=\"380\" width=\"200\" height=\"190\" rx=\"18\" fill=\"#F4ECE4\"/><rect x=\"36\" y=\"380\" width=\"200\" height=\"44\" rx=\"18\" fill=\"#FF6A00\"/><rect x=\"36\" y=\"404\" width=\"200\" height=\"20\" fill=\"#FF6A00\"/>   <path d=\"M80 368 v26 M192 368 v26\" stroke=\"#F4ECE4\" stroke-width=\"7\" stroke-linecap=\"round\"/>   <rect x=\"54\" y=\"440\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"90\" y=\"440\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"126\" y=\"440\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"162\" y=\"440\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"198\" y=\"440\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"54\" y=\"480\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"90\" y=\"480\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"126\" y=\"480\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"162\" y=\"480\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#FFB547\" opacity=\"1\"/><rect x=\"198\" y=\"480\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"54\" y=\"520\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"90\" y=\"520\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"126\" y=\"520\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"162\" y=\"520\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/><rect x=\"198\" y=\"520\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#1A0A02\" opacity=\"0.16\"/></g>   <path d=\"M40 740 v-80 h70 l14 14 h86 v66 z\" fill=\"#FFB547\"/><path d=\"M40 740 v-62 h170 v62 z\" fill=\"#FF8A24\"/><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "clip",
  "h": 460,
  "x": 250,
  "flip": false
 },
 "files": {
  "props": "   <g class=\"sx-flt\"><path d=\"M60 380 a40 40 0 0 1 70 -26 a50 50 0 0 1 92 18 a34 34 0 0 1 -6 66 h-150 a30 30 0 0 1 -6 -58z\" fill=\"#F4ECE4\"/></g>   <path d=\"M40 740 v-60 h40 l12 12 h44 v48 z\" fill=\"#FF6A00\"/><path d=\"M144 740 v-60 h40 l12 12 h44 v48 z\" fill=\"#FFB547\"/><path d=\"M40 666 v-60 h40 l12 12 h44 v48 z\" fill=\"#FF8A24\"/><path d=\"M144 666 v-60 h40 l12 12 h44 v48 z\" fill=\"#F4ECE4\"/><path d=\"M40 592 v-60 h40 l12 12 h44 v48 z\" fill=\"#FFB547\"/><path d=\"M144 592 v-60 h40 l12 12 h44 v48 z\" fill=\"#FF6A00\"/><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "wave",
  "h": 470,
  "x": 236,
  "flip": false
 },
 "viva": {
  "props": "   <path d=\"M270 740 L292 560 H420 L442 740 Z\" fill=\"#FFB547\"/><rect x=\"284\" y=\"540\" width=\"144\" height=\"26\" rx=\"8\" fill=\"#FF6A00\"/>   <path d=\"M356 540 V480\" stroke=\"#F4ECE4\" stroke-width=\"4\"/><rect x=\"344\" y=\"446\" width=\"24\" height=\"40\" rx=\"12\" fill=\"#F4ECE4\" class=\"sx-glow\"/><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "point",
  "h": 450,
  "x": 40,
  "flip": false
 },
 "price": {
  "props": "   <g class=\"sx-flt\"><circle cx=\"110\" cy=\"440\" r=\"48\" fill=\"none\" stroke=\"#FFB547\" stroke-width=\"14\"/><path d=\"M110 488 V640 M110 600 h34 M110 628 h24\" stroke=\"#FFB547\" stroke-width=\"14\" stroke-linecap=\"round\"/></g><path d=\"M24 740 H446\" stroke=\"#F4ECE4\" stroke-opacity=\".22\" stroke-width=\"2\"/>",
  "pose": "wave",
  "h": 470,
  "x": 230,
  "flip": false
 }
};
