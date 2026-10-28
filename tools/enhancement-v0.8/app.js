/* ============================================================
   Trusted Garden - V0.7 Showcase layer (render + UX)
   Appended after the V0.6 scripts. Non-destructive overrides.
   ============================================================ */
(function () {
'use strict';
if (!gl || !canvas) return;

try {

/* ---------------- tiny helpers ---------------- */
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const s2l = (x) => Math.pow(x < 0 ? 0 : x, 2.2);
const toLin = (a) => [s2l(a[0]), s2l(a[1]), s2l(a[2])];
function invert4(m) {
  const o = new Float32Array(16);
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
        a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
        a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}

/* ---------------- config ---------------- */
const CFG = {
  exposure: 1.18, gamma: 2.2,
  bloomStr: 0.30, bloomThresh: 0.90,
  vignette: 0.24, grain: 0.010,
  saturation: 1.08, contrast: 1.05,
  aoStrength: 0.62, aoRadius: 0.80, aoBias: 0.055, aoPower: 0.95,
  sharpen: 0.26,
};

/* ---------------- state ---------------- */
let tod = 0.20;              // time of day 0..1  (06:00 -> 20:00)
let cinematic = false, photoMode = false, wantShot = false;
let sunDir7 = [0, 1, 0];
let lightVP7 = lightVP;
let skyZen = [0.24, 0.44, 0.72], skyHor = [0.72, 0.82, 0.9], skySun = [1, 0.94, 0.8], skyGround = [0.3, 0.33, 0.28];
let skyZenL = [0, 0, 0], skyHorL = [0, 0, 0], skySunL = [0, 0, 0], skyGroundL = [0, 0, 0], fogColorL = [0, 0, 0];
let ambNow = 0.42, fogNear = 22, fogDensity = 0.028, expoNow = CFG.exposure;
let lastNow = performance.now();
let frames = 0;

/* ---------------- sky palettes per weather ---------------- */
const SKYP = {
  clear: { zen: [.18, .38, .68], hor: [.70, .80, .89], sunCol: [1.00, .93, .78], amb: [.44, .50, .48], ground: [.30, .33, .28] },
  cloud: { zen: [.40, .50, .60], hor: [.72, .77, .79], sunCol: [1.00, .96, .86], amb: [.40, .44, .44], ground: [.28, .31, .27] },
  rain:  { zen: [.32, .38, .44], hor: [.58, .64, .66], sunCol: [.78, .80, .78], amb: [.31, .35, .36], ground: [.24, .27, .24] },
  storm: { zen: [.17, .21, .26], hor: [.39, .44, .47], sunCol: [.52, .55, .57], amb: [.23, .26, .28], ground: [.19, .22, .20] },
  heat:  { zen: [.28, .44, .66], hor: [.88, .83, .70], sunCol: [1.00, .88, .66], amb: [.48, .47, .42], ground: [.33, .33, .25] },
  wind:  { zen: [.32, .48, .68], hor: [.78, .84, .87], sunCol: [1.00, .95, .82], amb: [.43, .48, .47], ground: [.29, .32, .27] },
  fog:   { zen: [.60, .64, .66], hor: [.78, .81, .81], sunCol: [.80, .82, .80], amb: [.40, .43, .43], ground: [.40, .42, .40] },
};
for (const k in SKYP) if (WEATHER[k]) Object.assign(WEATHER[k], SKYP[k]);

/* ---------------- weather smoothing ---------------- */
const mixW = {};
(function initMix() {
  const s = WEATHER.clear;
  for (const k in s) {
    const v = s[k];
    if (typeof v === 'number') mixW[k] = v;
    else if (Array.isArray(v)) mixW[k] = v.slice();
    else mixW[k] = v;
  }
})();
W = function () { return mixW; };   // global W now returns the smoothed state
function stepWeather(dt) {
  const t = WEATHER[weatherKey] || WEATHER.clear;
  const r = clamp(dt * 1.7, 0, 1);
  mixW.name = t.name; mixW.action = t.action;
  for (const k in t) {
    const tv = t[k], cv = mixW[k];
    if (typeof tv === 'number' && typeof cv === 'number') mixW[k] = lerp(cv, tv, r);
    else if (Array.isArray(tv) && Array.isArray(cv)) for (let i = 0; i < tv.length; i++) cv[i] = lerp(cv[i], tv[i], r);
  }
}

/* ---------------- sun / light ---------------- */
function updateSun() {
  const E = Math.sin(Math.PI * tod) * 0.95 + 0.20;      // elevation (rad), 0.20 .. 1.15
  const Az = -1.32 + 2.62 * tod;
  sunDir7 = V.norm([Math.cos(E) * Math.sin(Az), Math.sin(E), Math.cos(E) * Math.cos(Az)]);
  const eye = [sunDir7[0] * 42, Math.max(sunDir7[1] * 42, 4), sunDir7[2] * 42];
  // V0.8: fit the shadow frustum tightly to the real scene AABB (much crisper shadows)
  const SC = sceneBounds;
  const R = 80;
  const eyeF = [SC.c[0] + sunDir7[0] * R, Math.max(SC.c[1] + sunDir7[1] * R, 8), SC.c[2] + sunDir7[2] * R];
  const LVw = M4.lookAt(eyeF, SC.c, [0, 1, 0]);
  let mnX = 1e9, mnY = 1e9, mnZ = 1e9, mxX = -1e9, mxY = -1e9, mxZ = -1e9;
  for (let i = 0; i < 8; i++) {
    const px = i & 1 ? SC.hi[0] : SC.lo[0], py = i & 2 ? SC.hi[1] : SC.lo[1], pz = i & 4 ? SC.hi[2] : SC.lo[2];
    const x = LVw[0] * px + LVw[4] * py + LVw[8] * pz + LVw[12];
    const y = LVw[1] * px + LVw[5] * py + LVw[9] * pz + LVw[13];
    const z = LVw[2] * px + LVw[6] * py + LVw[10] * pz + LVw[14];
    if (x < mnX) mnX = x; if (x > mxX) mxX = x;
    if (y < mnY) mnY = y; if (y > mxY) mxY = y;
    if (z < mnZ) mnZ = z; if (z > mxZ) mxZ = z;
  }
  const M = 1.5;
  lightVP7 = M4.mul(M4.ortho(mnX - M, mxX + M, mnY - M, mxY + M, -mxZ - M, -mnZ + M), LVw);

  const dayF = clamp((E - 0.20) / 0.72, 0, 1);          // 0 dawn -> 1 high
  const g = 1 - dayF;                                    // golden factor
  const w = mixW;
  const warmH = [1.0, 0.58, 0.34], warmS = [1.0, 0.54, 0.28];
  for (let i = 0; i < 3; i++) {
    skyZen[i] = lerp(w.zen[i], w.zen[i] * [1.12, 0.86, 0.74][i], g);
    skyHor[i] = lerp(w.hor[i], lerp(w.hor[i], warmH[i], 0.70), g);
    skySun[i] = lerp(w.sunCol[i], warmS[i], g * 0.85);
    skyGround[i] = lerp(w.ground[i], w.ground[i] * [1.15, 0.92, 0.82][i], g * 0.6);
  }
  ambNow = (w.amb[0] + w.amb[1] + w.amb[2]) / 3 * (0.64 + 0.50 * dayF) * (1.0 + 0.55 * g);
  fogNear = Math.max(16, w.fog[0] * 1.0);
  fogDensity = 1.15 / Math.max(20, w.fog[1]);
  expoNow = CFG.exposure * (1.0 + 0.42 * g);
  skyZenL = toLin(skyZen); skyHorL = toLin(skyHor); skySunL = toLin(skySun); skyGroundL = toLin(skyGround);
  fogColorL = toLin([w.fogColor[0] * 0.92, w.fogColor[1] * 0.92, w.fogColor[2] * 0.92]);
}

/* ---------------- fullscreen quad ---------------- */
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const quadVAO = gl.createVertexArray();
gl.bindVertexArray(quadVAO);
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

const FS_VS = `#version 300 es
precision highp float;layout(location=0)in vec2 a;out vec2 vUV;void main(){vUV=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}`;

/* ---------------- sky ---------------- */
const skyVS = FS_VS;
const skyFS = `#version 300 es
precision highp float;
in vec2 vUV;out vec4 o;
uniform mat4 uInvVP;uniform vec3 uCamPos,uZenith,uHorizon,uSunColor,uGround,uSunDir;
uniform float uCloud,uTime,uWind,uHaze;
float h31(vec3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
 float a=mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);
 return a;}
float fbm(vec3 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+11.0;a*=0.5;}return s;}
void main(){
 vec2 ndc=vUV*2.0-1.0;
 vec4 A=uInvVP*vec4(ndc,-1.0,1.0),B=uInvVP*vec4(ndc,1.0,1.0);
 vec3 dir=normalize(B.xyz/B.w-A.xyz/A.w);
 float h=dir.y;
 float t=pow(clamp(h,0.0,1.0),0.42);
 vec3 col=mix(uHorizon,uZenith,t);
 col=mix(col,uGround,clamp(-h*7.0,0.0,1.0));
 float sd=max(dot(dir,uSunDir),0.0);
 col+=uSunColor*pow(sd,1900.0)*9.0;
 col+=uSunColor*pow(sd,64.0)*0.30;
 col+=uSunColor*pow(sd,7.0)*0.13;
 col+=uSunColor*pow(sd,2.2)*0.07*(1.0-t);
 if(h>0.004&&uCloud>0.02){
   float ph=max(h,0.03);
   vec2 p=(uCamPos.xz+dir.xz*(230.0/ph))*0.0021;
   p+=vec2(uTime*0.0075,uTime*0.0055)*max(uWind,0.4);
   float f=fbm(vec3(p, uTime*0.012));
   float f2=fbm(vec3(p*2.35+5.0, uTime*0.02));
   float cov=uCloud*0.72+0.16;
   float d=smoothstep(1.0-cov,1.0-cov+0.34,f*0.62+f2*0.44);
   d*=smoothstep(0.0,0.15,h);
   vec3 cc=mix(vec3(0.52,0.56,0.60),vec3(1.08,1.05,1.00),clamp(1.0-uCloud*0.55,0.0,1.0));
   cc=mix(cc,uSunColor,pow(sd,3.0)*0.55);
   cc*=mix(0.72,1.0,smoothstep(0.0,0.5,h));
   col=mix(col,cc,d*0.94);
 }
 float band=exp(-abs(h)*11.0);
 col=mix(col,uHorizon,band*uHaze*0.5);
 o=vec4(col,1.0);
}`;
const skyProg = program(skyVS, skyFS);
const skyU = {}; for (const n of ['uInvVP', 'uCamPos', 'uZenith', 'uHorizon', 'uSunColor', 'uGround', 'uSunDir', 'uCloud', 'uTime', 'uWind', 'uHaze']) skyU[n] = gl.getUniformLocation(skyProg, n);

/* ---------------- main material program (V0.7) ---------------- */
const VS7 = `#version 300 es
precision highp float;layout(location=0)in vec3 p;layout(location=1)in vec3 n;
uniform mat4 uVP,uLightVP;uniform float uGrow,uCrop,uTime,uKind,uWind;uniform vec2 uWindDir;
out vec3 vN;out vec3 vW;out vec4 vLight;
void main(){
 vec3 q=p;
 if(uCrop>.5){float pivot=.47;q.y=pivot+(q.y-pivot)*uGrow;}
 float h=clamp((q.y-.35)/3.8,0.0,1.0);
 float sway=((uKind>2.5&&uKind<3.5)||uCrop>.5)?1.0:((uKind>1.5&&uKind<2.5)?0.28:0.0);
 if(sway>0.0){float s=sin(q.x*1.73+q.z*1.31+uTime*(1.05+uWind*.09));float s2=cos(q.x*.71-q.z*1.93+uTime*.83);
  float amp=(s*.048+s2*.021)*uWind*h*sway;q.x+=uWindDir.x*amp;q.z+=uWindDir.y*amp;}
 if(uKind>.5&&uKind<1.5){q.y+=sin(q.x*2.15+q.z*1.78+uTime*.9)*.02;}
 vW=q;vec3 nn=n;if(uCrop>.5)nn.y/=max(uGrow,.25);vN=normalize(nn);
 vLight=uLightVP*vec4(q,1.0);gl_Position=uVP*vec4(q,1.0);
}`;
const FS7 = `#version 300 es
precision highp float;
in vec3 vN;in vec3 vW;in vec4 vLight;out vec4 outColor;
uniform vec4 uColor;uniform float uRough,uMetal,uKind,uData,uRisk,uSurf,uWet,uAmbient,uTime,uFogNear,uFogDensity;
uniform vec3 uCam,uSun,uFogColor,uSkyTop,uSkyHor,uSunCol;
uniform sampler2D uShadow;uniform vec2 uShadowTexel;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float shadowPCF(vec4 lp,vec3 n){vec3 q=lp.xyz/lp.w;q=q*.5+.5;if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0)return 1.0;
 float bias=max(.0010*(1.0-dot(n,uSun)),.00030);float lit=0.0;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadow,q.xy+vec2(float(x),float(y))*uShadowTexel).r;lit+=q.z-bias<=d?1.0:0.0;}
 return lit/9.0;}
vec3 skyRefl(vec3 d){float t=pow(clamp(d.y*.5+.5,0.0,1.0),0.9);return mix(uSkyHor,uSkyTop,t);}
void main(){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
 vec3 l=normalize(uSun);vec3 v=normalize(uCam-vW);
 float nd=max(dot(n,l),0.0);
 float sh=shadowPCF(vLight,n);
 vec3 base=pow(uColor.rgb,vec3(2.2));float micro=0.0;
 if(uSurf>.5&&uSurf<1.5){micro=(noise(vW.xz*3.6)-.5)*.13+(noise(vW.xz*16.0)-.5)*.045;base*=1.0+micro;base=mix(base,base*.58,uWet*.28);}
 else if(uSurf>1.5&&uSurf<2.5){micro=(noise(vW.xz*7.0)-.5)*.10;base*=1.0+micro;base=mix(base,base*.72,uWet*.16);}
 else if(uSurf>2.5&&uSurf<3.5){float grain=sin(vW.y*19.0+noise(vW.xz*4.0)*5.0);base*=.93+.08*grain;}
 else if(uSurf>3.5&&uSurf<4.5){micro=(noise(vW.xz*22.0)-.5)*.06;base*=1.0+micro;base=mix(base,base*.70,uWet*.18);}
 if(uData>.5){vec3 cold=pow(vec3(.20,.43,.33),vec3(2.2)),hot=pow(vec3(.70,.34,.22),vec3(2.2));base=mix(base,mix(cold,hot,uRisk),.34);}
 float rough=clamp(uRough-uWet*.16,0.04,1.0);
 vec3 N=n;
 if(uKind>.5&&uKind<1.5){
   vec2 uv=vW.xz;
   float n1=noise(uv*1.7+vec2(uTime*.22,uTime*.16));
   float n2=noise(uv*4.4-vec2(uTime*.31,uTime*.24));
   N=normalize(n+vec3((n1-.5)*.07,(n2-.5)*.05,(n2-.5)*.07));
   rough=0.055;
 }
 vec3 hh=normalize(l+v);
 float specPow=mix(170.0,10.0,rough);
 float spec=pow(max(dot(N,hh),0.0),specPow)*(1.0-rough*.5);
 float fres=pow(1.0-max(dot(N,v),0.0),5.0);
 vec3 refl=skyRefl(reflect(-v,N));
 vec3 specCol=mix(vec3(.95),base,uMetal);
 vec3 skyAmb=mix(uSkyHor,uSkyTop,clamp(n.y*.5+.5,0.0,1.0));
 vec3 col=base*(uAmbient*skyAmb+(1.00*nd*sh+0.08*nd));
 col+=specCol*spec*(0.45+0.95*sh+uWet*.15);
 if(uKind>.5&&uKind<1.5){vec3 rw=mix(uSkyHor,uSkyTop,clamp(0.34+0.30*fres,0.0,1.0));col=mix(col,rw,0.20+0.28*fres);col+=specCol*spec*0.45;}
 if(uKind>1.5&&uKind<2.5){col=mix(col,refl,0.10+0.34*fres);col=mix(col,pow(vec3(.82,.91,.91),vec3(2.2)),.05);}
 col+=uSunCol*0.045*nd*sh*0.35;
 float dist=length(uCam-vW);
 float fog=1.0-exp(-pow(max(dist-uFogNear,0.0)*uFogDensity,2.0));
 vec3 fogc=mix(uFogColor,uSkyHor,0.40);
 col=mix(col,fogc,clamp(fog,0.0,1.0));
 outColor=vec4(col,uColor.a);
}`;
const mainProg7 = program(VS7, FS7);
const U7 = {}; for (const n of ['uVP', 'uLightVP', 'uGrow', 'uCrop', 'uTime', 'uKind', 'uColor', 'uRough', 'uMetal', 'uData', 'uRisk', 'uSurf', 'uWet', 'uAmbient', 'uCam', 'uSun', 'uShadow', 'uShadowTexel', 'uFogColor', 'uFogNear', 'uFogDensity', 'uWind', 'uWindDir', 'uSkyTop', 'uSkyHor', 'uSunCol']) U7[n] = gl.getUniformLocation(mainProg7, n);

/* ---------------- post programs ---------------- */
const brightProg = program(FS_VS, `#version 300 es
precision highp float;in vec2 vUV;out vec4 o;uniform sampler2D uTex;uniform float uThresh;
void main(){vec3 c=texture(uTex,vUV).rgb;float l=max(max(c.r,c.g),c.b);float k=max(l-uThresh,0.0)/max(l,1e-4);o=vec4(c*k,1.0);}`);
const brightU = { uTex: gl.getUniformLocation(brightProg, 'uTex'), uThresh: gl.getUniformLocation(brightProg, 'uThresh') };

const blurProg = program(FS_VS, `#version 300 es
precision highp float;in vec2 vUV;out vec4 o;uniform sampler2D uTex;uniform vec2 uDir;
void main(){vec3 s=texture(uTex,vUV).rgb*0.227027;
 s+=texture(uTex,vUV+uDir*1.3846).rgb*0.316216;s+=texture(uTex,vUV-uDir*1.3846).rgb*0.316216;
 s+=texture(uTex,vUV+uDir*3.2308).rgb*0.070270;s+=texture(uTex,vUV-uDir*3.2308).rgb*0.070270;o=vec4(s,1.0);}`);
const blurU = { uTex: gl.getUniformLocation(blurProg, 'uTex'), uDir: gl.getUniformLocation(blurProg, 'uDir') };

const compProg = program(FS_VS, `#version 300 es
precision highp float;in vec2 vUV;out vec4 o;
uniform sampler2D uScene,uBloom,uAO;
uniform float uExposure,uBloomStr,uVignette,uGrain,uSat,uContrast,uTime,uAOStrength,uSharpen;uniform vec2 uRes;
vec3 aces(vec3 x){const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);}
float hh(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
 vec3 c=texture(uScene,vUV).rgb;
 float ao=texture(uAO,vUV).r;
 c*=mix(1.0,ao,uAOStrength);
 vec3 b=texture(uBloom,vUV).rgb;
 c+=b*uBloomStr;
 c*=uExposure;
 c=aces(c);
 c=pow(max(c,0.0),vec3(1.0/2.2));
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,uSat);
 c=(c-0.5)*uContrast+0.5;
  // unsharp mask: supersampled downscale softens fine detail, this brings it back
  if(uSharpen>0.001){
    vec2 tx=1.0/uRes;
    vec3 bl=(texture(uScene,vUV+vec2(tx.x,0.0)).rgb+texture(uScene,vUV-vec2(tx.x,0.0)).rgb
            +texture(uScene,vUV+vec2(0.0,tx.y)).rgb+texture(uScene,vUV-vec2(0.0,tx.y)).rgb)*0.25;
    c+=(c-bl)*uSharpen;
  }
  float d=length(vUV-0.5)*1.4142;
  c*=1.0-uVignette*smoothstep(0.30,1.05,d);
  c+=(hh(vUV*uRes+7.3)-0.5)*uGrain;
 o=vec4(clamp(c,0.0,1.0),1.0);
}`);
const compU = {}; for (const n of ['uScene', 'uBloom', 'uExposure', 'uBloomStr', 'uVignette', 'uGrain', 'uSat', 'uContrast', 'uTime', 'uRes', 'uAO', 'uAOStrength', 'uSharpen']) compU[n] = gl.getUniformLocation(compProg, n);

/* ---------------- screen-space ambient occlusion ---------------- */
const ssaoKernel = [];
for (let i = 0; i < 12; i++) {
  const u1 = (i + 0.5) / 12, th = Math.random() * Math.PI * 2;
  const r = Math.sqrt(u1);
  const s = 0.32 + 0.68 * u1;
  ssaoKernel.push(Math.cos(th) * r * s, Math.sin(th) * r * s, Math.sqrt(Math.max(0, 1 - u1)) * s);
}
const ssaoProg = program(FS_VS, `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uDepth;
uniform mat4 uProj, uProjInv;
uniform vec2 uRes;
uniform float uRadius, uBias, uPower;
uniform vec3 uKernel[12];
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec3 viewPos(vec2 uv){
  float d = texture(uDepth, uv).r;
  vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return p.xyz / p.w;
}
void main(){
  float d0 = texture(uDepth, vUV).r;
  if (d0 >= 0.99999) { o = vec4(1.0, 0.0, 0.0, 1.0); return; }
  vec3 P = viewPos(vUV);
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  if (dot(N, normalize(-P)) < 0.0) N = -N;
  float ang = hash(vUV * uRes) * 6.2831853;
  float ca = cos(ang), sa = sin(ang);
  mat2 rot = mat2(ca, sa, -sa, ca);
  float occ = 0.0, cnt = 0.0;
  for (int i = 0; i < 12; i++) {
    vec3 s = uKernel[i];
    s.xy = rot * s.xy;
    vec3 sp = P + N * uBias + s * uRadius;
    vec4 cp = uProj * vec4(sp, 1.0);
    vec2 suv = cp.xy / cp.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    float sd = viewPos(suv).z;
    float rc = smoothstep(0.0, 1.0, uRadius / max(0.0001, abs(P.z - sd)));
    occ += (sd >= sp.z + 0.025 ? 1.0 : 0.0) * rc;
    cnt += 1.0;
  }
  float ao = 1.0 - (occ / max(cnt, 1.0)) * uPower;
  o = vec4(clamp(ao, 0.0, 1.0), 0.0, 0.0, 1.0);
}`);
const ssaoU = {}; for (const n of ['uDepth', 'uProj', 'uProjInv', 'uRes', 'uRadius', 'uBias', 'uPower', 'uKernel']) ssaoU[n] = gl.getUniformLocation(ssaoProg, n);

const ssaoBlurProg = program(FS_VS, `#version 300 es
precision highp float;
in vec2 vUV; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  float s = texture(uTex, vUV).r * 2.0;
  s += texture(uTex, vUV + uTexel * vec2(-1.0, -1.0)).r;
  s += texture(uTex, vUV + uTexel * vec2( 0.0, -1.0)).r;
  s += texture(uTex, vUV + uTexel * vec2( 1.0, -1.0)).r;
  s += texture(uTex, vUV + uTexel * vec2(-1.0,  0.0)).r;
  s += texture(uTex, vUV + uTexel * vec2( 1.0,  0.0)).r;
  s += texture(uTex, vUV + uTexel * vec2(-1.0,  1.0)).r;
  s += texture(uTex, vUV + uTexel * vec2( 0.0,  1.0)).r;
  s += texture(uTex, vUV + uTexel * vec2( 1.0,  1.0)).r;
  o = vec4(s / 10.0, 0.0, 0.0, 1.0);
}`);
const ssaoBlurU = { uTex: gl.getUniformLocation(ssaoBlurProg, 'uTex'), uTexel: gl.getUniformLocation(ssaoBlurProg, 'uTexel') };

/* ---------------- life: birds + motes ---------------- */
const birdN = 12;
const bpos = [], bmeta = [];
for (let i = 0; i < birdN; i++) {
  const seed = Math.random(), s2 = Math.random() * 0.5 + 0.7;
  const verts = [[-1, 0.95, 0], [0, 0, 0], [0, 0, 0], [1, 0.95, 0]];
  for (const v of verts) { bpos.push(v[0], v[1], v[2]); bmeta.push(seed, s2); }
}
const birdProg = program(`#version 300 es
precision highp float;layout(location=0)in vec3 aLocal;layout(location=1)in vec2 aMeta;
uniform mat4 uVP;uniform float uTime,uOn;out float vA;
void main(){
 float seed=aMeta.x;
 float ang=uTime*0.052+seed*6.2831;
 vec3 c=vec3(cos(ang)*21.0,12.5+sin(seed*5.0)*3.0,sin(ang)*21.0);
 float flap=0.30+0.70*abs(sin(uTime*3.1+seed*9.0));
 vec3 l=aLocal;l.y*=flap;
 vec3 p=c+l*1.35*aMeta.y;
 p.y+=sin(uTime*0.7+seed*3.0)*0.7;
 vA=uOn;
 gl_Position=uVP*vec4(p,1.0);
}`, `#version 300 es
precision highp float;in float vA;out vec4 o;void main(){o=vec4(0.014,0.020,0.022,vA*0.72);}`);
const birdU = { uVP: gl.getUniformLocation(birdProg, 'uVP'), uTime: gl.getUniformLocation(birdProg, 'uTime'), uOn: gl.getUniformLocation(birdProg, 'uOn') };
const birdVAO = gl.createVertexArray(); gl.bindVertexArray(birdVAO);
{ let b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bpos), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  let m = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bmeta), gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); }
gl.bindVertexArray(null);

const moteN = 240, mpos = [], mmeta = [];
for (let i = 0; i < moteN; i++) {
  mpos.push((Math.random() - 0.5) * 42, 0.4 + Math.random() * 6.5, (Math.random() - 0.5) * 34);
  mmeta.push(Math.random(), Math.random());
}
const moteProg = program(`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec2 aMeta;
uniform mat4 uVP;uniform float uTime,uWind,uOn;uniform vec2 uWindDir;out float vA;
void main(){
 vec3 p=aPos;
 p.x+=uWindDir.x*uTime*(0.22+aMeta.y*0.35);
 p.z+=uWindDir.y*uTime*(0.22+aMeta.y*0.35);
 p.x=mod(p.x+22.0,44.0)-22.0;
 p.z=mod(p.z+18.0,36.0)-18.0;
 p.y+=sin(uTime*0.5+aMeta.x*6.2831)*0.55;
 gl_PointSize=1.6+aMeta.y*2.4;
 float fx=1.0-smoothstep(17.0,22.0,abs(p.x));
 float fz=1.0-smoothstep(13.0,18.0,abs(p.z));
 vA=uOn*fx*fz;
 gl_Position=uVP*vec4(p,1.0);
}`, `#version 300 es
precision highp float;in float vA;out vec4 o;uniform vec3 uColor;
void main(){vec2 q=gl_PointCoord-0.5;float d=dot(q,q);if(d>0.25)discard;float a=smoothstep(0.25,0.0,d)*vA*0.36;o=vec4(uColor,a);}`);
const moteU = {}; for (const n of ['uVP', 'uTime', 'uWind', 'uOn', 'uWindDir', 'uColor']) moteU[n] = gl.getUniformLocation(moteProg, n);
const moteVAO = gl.createVertexArray(); gl.bindVertexArray(moteVAO);
{ let b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mpos), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  let m = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mmeta), gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); }
gl.bindVertexArray(null);

let birdOn = 1, moteOn = 1;

/* higher-resolution output cap for crisp edges */
resize = function () {
  const r = canvas.getBoundingClientRect();
  const cap = qualityMode === 'high' ? 2.4 : 1.3;
  const dpr = Math.min(window.devicePixelRatio || 1, cap);
  const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
};

/* ---------------- atmosphere override: higher, softer clouds ---------------- */
const atmVS2 = `#version 300 es
precision highp float;layout(location=0)in vec4 a;
uniform mat4 uVP;uniform float uTime,uMode,uWind,uSize,uLift,uAlpha;uniform vec2 uWindDir;out float vA;
void main(){vec3 p=a.xyz;
 if(uMode<.5){p.x+=uWindDir.x*(uTime*.34+a.w*16.);p.z+=uWindDir.y*(uTime*.34+a.w*16.);
  p.x=mod(p.x+32.,64.)-32.;p.z=mod(p.z+26.,52.)-26.;p.y+=uLift;
  gl_PointSize=uSize*(0.72+a.w*0.7);vA=0.13*(1.0-smoothstep(26.,32.,abs(p.x)))*(1.0-smoothstep(20.,26.,abs(p.z)));}
 else{float t=fract(a.w+uTime*(.12+.015*uWind));p.y=25.-t*25.;p.x+=uWindDir.x*t*3.;p.z+=uWindDir.y*t*3.;gl_PointSize=1.;vA=.42;}
 gl_Position=uVP*vec4(p,1.0);}`;
const atmFS2 = `#version 300 es
precision highp float;uniform float uMode,uAlpha;uniform vec3 uCloudColor;in float vA;out vec4 o;
void main(){if(uMode<.5){vec2 q=gl_PointCoord-.5;float d=dot(q,q);if(d>.25)discard;float a=smoothstep(.25,.02,d)*vA*uAlpha;o=vec4(uCloudColor,a);}else{o=vec4(.74,.84,.87,vA);}}`;
const atmProg2 = program(atmVS2, atmFS2);
const atmU2 = {}; for (const n of ['uVP', 'uTime', 'uMode', 'uWind', 'uSize', 'uLift', 'uAlpha', 'uWindDir', 'uCloudColor']) atmU2[n] = gl.getUniformLocation(atmProg2, n);
function renderAtmos2(VP, now) {
  const w = W();
  if (w.cloud < 0.05 && w.rain < 0.1) return;
  gl.useProgram(atmProg2);
  gl.uniformMatrix4fv(atmU2.uVP, false, VP);
  gl.uniform1f(atmU2.uTime, now * 0.001);
  gl.uniform1f(atmU2.uWind, w.wind);
  gl.uniform2f(atmU2.uWindDir, Math.cos(0.65), Math.sin(0.65));
  const cc = toLin(weatherKey === 'storm' ? [.42, .45, .46] : [.94, .96, .95]);
  gl.uniform3f(atmU2.uCloudColor, cc[0], cc[1], cc[2]);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
  if (w.cloud > 0.05) {
    gl.uniform1f(atmU2.uMode, 0);
    gl.uniform1f(atmU2.uSize, 96);
    gl.uniform1f(atmU2.uLift, 12);
    gl.uniform1f(atmU2.uAlpha, Math.min(1, w.cloud * 0.85));
    gl.bindVertexArray(cloudVAO);
    gl.drawArrays(gl.POINTS, 0, cloudCount);
  }
  if (w.rain > 0.2) {
    gl.uniform1f(atmU2.uMode, 1);
    gl.bindVertexArray(rainVAO);
    gl.lineWidth(1);
    gl.drawArrays(gl.LINES, 0, rainDrops * 2);
  }
  gl.bindVertexArray(null);
  gl.depthMask(true); gl.disable(gl.BLEND);
}
renderAtmos = renderAtmos2;

/* ---------------- anti-flicker: finer depth layering ---------------- */
function depthLayer2(m) {
  const n = (m.name || '').toLowerCase();
  if (n.includes('meadow grass')) return -3;
  if (n.includes('mown grass')) return -2;
  if (n.includes('_soil')) return 1;
  if (n.includes('moist soil')) return 2;
  if (n.includes('warm white')) return 3;
  if (n.includes('fine gravel')) return 3;
  if (n.includes('limestone')) return 4;
  if (n.includes('concrete')) return 4;
  return 0;
}
meshes.forEach((m, i) => { m.idx = i; m.dl = depthLayer2(m); });
gl.depthFunc(gl.LEQUAL);

/* ---------------- high-resolution shadow map (crisper, stable) ---------------- */
let SH2 = 3072, shTex = null, shFBO = null, shQuality = null;
function buildShadowTex(size) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return ok ? { t, f, size } : null;
}
function ensureShadowRT() {
  const want = qualityMode === 'perf' ? 2048 : 4096;
  if (shTex && shQuality === want) return;
  if (shTex) gl.deleteTexture(shTex);
  if (shFBO) gl.deleteFramebuffer(shFBO);
  let r = buildShadowTex(want);
  if (!r) r = buildShadowTex(3072);
  if (!r) r = buildShadowTex(2048);
  if (!r) { shTex = shadowTex; shFBO = shadowFBO; SH2 = SH; shQuality = want; return; }
  shTex = r.t; shFBO = r.f; SH2 = r.size; shQuality = want;
}
ensureShadowRT();

/* ---------------- render targets ---------------- */
let rtW = 0, rtH = 0, bw = 0, bh = 0;
let msFBO = null, msColor = null, msDepth = null, resFBO = null, resTex = null;
let bloomAFBO = null, bloomATex = null, bloomBFBO = null, bloomBTex = null;
let depthTex = null, depthFBO = null;
let aoW = 0, aoH = 0, aoTex = null, aoFBO = null, aoBlurTex = null, aoBlurFBO = null;
let useMSAA = true;
let samples = clamp((gl.getParameter(gl.MAX_SAMPLES) || 0) | 0, 0, 4);
if (samples < 2) useMSAA = false;
let lastQuality = null;
let useAO = true;

function colorTex(w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function fboFor(tex) {
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return f;
}
function depthTexCreate(w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function depthFBOFor(tex) {
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  return f;
}
function ensureTargets(w, h) {
  const q = qualityMode;
  const scale = q === 'perf' ? 1.0 : 1.45;          // supersampling in high-quality mode
  const W2 = Math.max(2, Math.round(w * scale)), H2 = Math.max(2, Math.round(h * scale));
  if (W2 === rtW && H2 === rtH && msFBO && resFBO && q === lastQuality) return;
  lastQuality = q;
  rtW = W2; rtH = H2;
  useMSAA = (q !== 'perf') && samples >= 2;
  useAO = (q !== 'perf');
  for (const o of [msFBO, resFBO, bloomAFBO, bloomBFBO, depthFBO, aoFBO, aoBlurFBO]) if (o) gl.deleteFramebuffer(o);
  for (const o of [msColor, msDepth]) if (o) gl.deleteRenderbuffer(o);
  for (const o of [resTex, bloomATex, bloomBTex, depthTex, aoTex, aoBlurTex]) if (o) gl.deleteTexture(o);
  msFBO = resFBO = bloomAFBO = bloomBFBO = depthFBO = aoFBO = aoBlurFBO = null;

  // scene FBO always carries BOTH colour and depth (MSAA when available, plain otherwise)
  const ns = useMSAA ? samples : 0;
  function makeSceneFBO(sampleCount) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    const cb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, cb);
    if (sampleCount) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, sampleCount, gl.RGBA8, W2, H2);
    else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, W2, H2);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cb);
    const db = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, db);
    if (sampleCount) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, sampleCount, gl.DEPTH_COMPONENT24, W2, H2);
    else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W2, H2);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, db);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return ok ? { f, cb, db } : null;
  }
  let sf = makeSceneFBO(ns);
  if (!sf && ns) { sf = makeSceneFBO(0); useMSAA = false; }
  if (sf) { msFBO = sf.f; msColor = sf.cb; msDepth = sf.db; }
  else { msFBO = null; msColor = null; msDepth = null; useMSAA = false; }

  resTex = colorTex(W2, H2); resFBO = fboFor(resTex);
  depthTex = depthTexCreate(W2, H2); depthFBO = depthFBOFor(depthTex);

  bw = Math.max(2, W2 >> 2); bh = Math.max(2, H2 >> 2);
  bloomATex = colorTex(bw, bh); bloomAFBO = fboFor(bloomATex);
  bloomBTex = colorTex(bw, bh); bloomBFBO = fboFor(bloomBTex);

  aoW = Math.max(2, W2 >> 1); aoH = Math.max(2, H2 >> 1);
  aoTex = colorTex(aoW, aoH); aoFBO = fboFor(aoTex);
  aoBlurTex = colorTex(aoW, aoH); aoBlurFBO = fboFor(aoBlurTex);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* ---------------- draw: sky ---------------- */
function drawSky(now, invVP, eye) {
  gl.useProgram(skyProg);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.uniformMatrix4fv(skyU.uInvVP, false, invVP);
  gl.uniform3f(skyU.uCamPos, eye[0], eye[1], eye[2]);
  gl.uniform3f(skyU.uZenith, skyZenL[0], skyZenL[1], skyZenL[2]);
  gl.uniform3f(skyU.uHorizon, skyHorL[0], skyHorL[1], skyHorL[2]);
  gl.uniform3f(skyU.uSunColor, skySunL[0], skySunL[1], skySunL[2]);
  gl.uniform3f(skyU.uGround, skyGroundL[0], skyGroundL[1], skyGroundL[2]);
  gl.uniform3f(skyU.uSunDir, sunDir7[0], sunDir7[1], sunDir7[2]);
  gl.uniform1f(skyU.uCloud, mixW.cloud);
  gl.uniform1f(skyU.uHaze, weatherKey === 'fog' ? 0.9 : 0.35);
  gl.uniform1f(skyU.uTime, now * 0.001);
  gl.uniform1f(skyU.uWind, 0.5 + Math.min(1.5, mixW.wind / 7));
  gl.bindVertexArray(quadVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
}

/* ---------------- draw: meshes ---------------- */
function drawMeshes(now, VP, eye) {
  gl.useProgram(mainProg7);
  gl.uniformMatrix4fv(U7.uVP, false, VP);
  gl.uniformMatrix4fv(U7.uLightVP, false, lightVP7);
  gl.uniform3f(U7.uCam, eye[0], eye[1], eye[2]);
  gl.uniform3f(U7.uSun, sunDir7[0], sunDir7[1], sunDir7[2]);
  gl.uniform3f(U7.uSunCol, skySunL[0], skySunL[1], skySunL[2]);
  gl.uniform3f(U7.uSkyTop, skyZenL[0], skyZenL[1], skyZenL[2]);
  gl.uniform3f(U7.uSkyHor, skyHorL[0], skyHorL[1], skyHorL[2]);
  gl.uniform1f(U7.uData, dataOverlay ? 1 : 0);
  gl.uniform1f(U7.uTime, now * 0.001);
  gl.uniform1f(U7.uWet, mixW.wet);
  gl.uniform1f(U7.uAmbient, ambNow);
  gl.uniform3f(U7.uFogColor, fogColorL[0], fogColorL[1], fogColorL[2]);
  gl.uniform1f(U7.uFogNear, fogNear);
  gl.uniform1f(U7.uFogDensity, fogDensity);
  gl.uniform1f(U7.uWind, 0.35 + Math.min(1.6, mixW.wind / 6));
  gl.uniform2f(U7.uWindDir, Math.cos(0.65), Math.sin(0.65));
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shTex || shadowTex);
  gl.uniform1i(U7.uShadow, 0);
  gl.uniform2f(U7.uShadowTexel, 1 / SH2, 1 / SH2);

  const opaque = meshes.filter(m => m.visible && m.alpha >= 0.92 && m.kind !== 'glass' && m.kind !== 'water' && m.kind !== 'bubble');
  const transp = meshes.filter(m => m.visible && !opaque.includes(m));
  opaque.sort((a, b) => ((a.dl || 0) - (b.dl || 0)) || (a.idx - b.idx));

  const draw = (list) => {
    for (const m of list) {
      gl.uniform1f(U7.uGrow, cropGrowth(m));
      gl.uniform1f(U7.uCrop, m.crop ? 1 : 0);
      gl.uniform1f(U7.uKind, m.kindN);
      gl.uniform4f(U7.uColor, m.color[0], m.color[1], m.color[2], m.color[3]);
      gl.uniform1f(U7.uRough, m.roughness);
      gl.uniform1f(U7.uMetal, m.metallic);
      gl.uniform1f(U7.uRisk, risk(m));
      gl.uniform1f(U7.uSurf, m.surf || 0);
      // V0.8: every mesh gets a UNIQUE depth bias so no two surfaces can ever
      // tie for the same depth -> z-fighting becomes structurally impossible.
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-(m.dl || 0) * 1.0, -(m.dl || 0) * 4 - 2 - (m.idx || 0) * 0.02);
      if (m.doubleSided || m.kind === 'foliage' || m.kind === 'glass') gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
      gl.bindVertexArray(m.vao);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  };
  gl.disable(gl.BLEND); gl.depthMask(true); draw(opaque);
  gl.enable(gl.BLEND); gl.depthMask(false);
  transp.sort((a, b) => {
    const ca = a.center, cb = b.center;
    const da = (ca[0] - eye[0]) ** 2 + (ca[1] - eye[1]) ** 2 + (ca[2] - eye[2]) ** 2;
    const db = (cb[0] - eye[0]) ** 2 + (cb[1] - eye[1]) ** 2 + (cb[2] - eye[2]) ** 2;
    const d = db - da;
    if (Math.abs(d) > 0.03) return d;
    return a.idx - b.idx;
  });
  draw(transp);
  gl.depthMask(true); gl.disable(gl.BLEND);
}

/* ---------------- draw: life ---------------- */
function drawLife(now, VP) {
  const t = now * 0.001;
  const windy = weatherKey === 'storm' || weatherKey === 'rain';
  birdOn = lerp(birdOn, windy ? 0 : 1, 0.02);
  moteOn = lerp(moteOn, weatherKey === 'fog' || weatherKey === 'rain' ? 0.25 : 1, 0.02);

  if (birdOn > 0.02) {
    gl.useProgram(birdProg);
    gl.uniformMatrix4fv(birdU.uVP, false, VP);
    gl.uniform1f(birdU.uTime, t);
    gl.uniform1f(birdU.uOn, birdOn);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(birdVAO);
    gl.drawArrays(gl.LINES, 0, birdN * 4);
    gl.bindVertexArray(null);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
  if (moteOn > 0.02) {
    gl.useProgram(moteProg);
    gl.uniformMatrix4fv(moteU.uVP, false, VP);
    gl.uniform1f(moteU.uTime, t);
    gl.uniform1f(moteU.uWind, Math.min(1.4, mixW.wind / 7));
    gl.uniform1f(moteU.uOn, moteOn * (weatherKey === 'heat' ? 1.0 : 0.8));
    gl.uniform2f(moteU.uWindDir, Math.cos(0.65), Math.sin(0.65));
    gl.uniform3f(moteU.uColor, 1.0, 0.905, 0.66);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(moteVAO);
    gl.drawArrays(gl.POINTS, 0, moteN);
    gl.bindVertexArray(null);
    gl.depthMask(true); gl.disable(gl.BLEND);
  }
}

/* ---------------- shadow pass ---------------- */
function renderShadow7(now) {
  ensureShadowRT();
  gl.bindFramebuffer(gl.FRAMEBUFFER, shFBO);
  gl.viewport(0, 0, SH2, SH2);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(shadowProg);
  gl.uniformMatrix4fv(SU.uLightVP, false, lightVP7);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
  for (const m of meshes) {
    if (!m.visible || m.alpha < 0.92 || m.kind === 'glass' || m.kind === 'water' || m.kind === 'bubble' || m.noShadow) continue;
    gl.uniform1f(SU.uGrow, cropGrowth(m));
    gl.uniform1f(SU.uCrop, m.crop ? 1 : 0);
    if (m.doubleSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
    gl.bindVertexArray(m.vao);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
  }
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* ---------------- post ---------------- */
function bloomPass() {
  if (qualityMode === 'perf') {
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomAFBO);
    gl.viewport(0, 0, bw, bh);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return;
  }
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(quadVAO);
  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomAFBO); gl.viewport(0, 0, bw, bh);
  gl.useProgram(brightProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, resTex);
  gl.uniform1i(brightU.uTex, 0); gl.uniform1f(brightU.uThresh, CFG.bloomThresh);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBFBO); gl.viewport(0, 0, bw, bh);
  gl.useProgram(blurProg);
  gl.bindTexture(gl.TEXTURE_2D, bloomATex);
  gl.uniform1i(blurU.uTex, 0); gl.uniform2f(blurU.uDir, 1 / bw, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomAFBO); gl.viewport(0, 0, bw, bh);
  gl.bindTexture(gl.TEXTURE_2D, bloomBTex);
  gl.uniform2f(blurU.uDir, 0, 1 / bh);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
  gl.enable(gl.DEPTH_TEST);
}
function composite(now) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.useProgram(compProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, resTex); gl.uniform1i(compU.uScene, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomATex); gl.uniform1i(compU.uBloom, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, aoBlurTex || resTex); gl.uniform1i(compU.uAO, 2);
  gl.uniform1f(compU.uAOStrength, useAO ? CFG.aoStrength : 0);
  gl.uniform1f(compU.uSharpen, CFG.sharpen);
  gl.uniform1f(compU.uExposure, expoNow);
  gl.uniform1f(compU.uBloomStr, CFG.bloomStr);
  gl.uniform1f(compU.uVignette, CFG.vignette);
  gl.uniform1f(compU.uGrain, CFG.grain);
  gl.uniform1f(compU.uSat, CFG.saturation);
  gl.uniform1f(compU.uContrast, CFG.contrast);
  gl.uniform1f(compU.uTime, now * 0.001);
  gl.uniform2f(compU.uRes, canvas.width, canvas.height);
  gl.bindVertexArray(quadVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.enable(gl.DEPTH_TEST);
}

/* ---------------- SSAO passes ---------------- */
let lastProj = null, lastProjInv = null;
function ssaoPass() {
  if (!useAO || !depthTex || !aoFBO) return;
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(quadVAO);

  gl.bindFramebuffer(gl.FRAMEBUFFER, aoFBO);
  gl.viewport(0, 0, aoW, aoH);
  gl.useProgram(ssaoProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, depthTex);
  gl.uniform1i(ssaoU.uDepth, 0);
  gl.uniformMatrix4fv(ssaoU.uProj, false, lastProj);
  gl.uniformMatrix4fv(ssaoU.uProjInv, false, lastProjInv);
  gl.uniform2f(ssaoU.uRes, aoW, aoH);
  gl.uniform1f(ssaoU.uRadius, CFG.aoRadius);
  gl.uniform1f(ssaoU.uBias, CFG.aoBias);
  gl.uniform1f(ssaoU.uPower, CFG.aoPower);
  gl.uniform3fv(ssaoU.uKernel, ssaoKernel);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, aoBlurFBO);
  gl.viewport(0, 0, aoW, aoH);
  gl.useProgram(ssaoBlurProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, aoTex);
  gl.uniform1i(ssaoBlurU.uTex, 0);
  gl.uniform2f(ssaoBlurU.uTexel, 1 / aoW, 1 / aoH);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.enable(gl.DEPTH_TEST);
}

/* ---------------- pipeline ---------------- */
const prevRenderMain = renderMain;
function pipeline(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000) || 0.016;
  lastNow = now;
  stepWeather(dt);
  updateSun();
  resize();
  const w = canvas.width, h = canvas.height;
  ensureTargets(w, h);
  const sw = rtW, sh = rtH;

  renderShadow7(now);

  const e = cameraEye();
  const Vw = M4.lookAt(e, cam.target, [0, 1, 0]);
  const P = M4.perspective(0.74, sw / sh, 0.30, 92);
  const VP = M4.mul(P, Vw);
  lastVP = VP;
  lastProj = P;
  lastProjInv = invert4(P);
  const invVP = invert4(VP);

  gl.bindFramebuffer(gl.FRAMEBUFFER, msFBO);
  gl.viewport(0, 0, sw, sh);
  gl.clearColor(fogColorL[0], fogColorL[1], fogColorL[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);

  drawSky(now, invVP, e);
  drawMeshes(now, VP, e);
  renderScreen(VP);
  renderAtmos(VP, now);
  drawLife(now, VP);
  updateLabels(VP);

  // resolve colour AND depth (depth is needed for SSAO)
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFBO);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resFBO);
  gl.blitFramebuffer(0, 0, sw, sh, 0, 0, sw, sh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, depthFBO);
  gl.blitFramebuffer(0, 0, sw, sh, 0, 0, sw, sh, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  ssaoPass();
  bloomPass();
  composite(now);

  if (wantShot) { wantShot = false; doShot(); }
  frames++;
  if (frames === 3) onFirstFrame();
}
renderMain = pipeline;
renderShadow = renderShadow7;

/* ---------------- overrides: cinematic orbit ---------------- */
const prevUT = updateTransition;
updateTransition = function (now) {
  prevUT(now);
  if (cinematic && !v6ptr && !trans) cam.yaw += 0.0021;
};

/* ============================================================
   UI
   ============================================================ */
const ICON = {
  play: '<svg class="v7-ic-play" viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l1.4-2h7.2L17 8h3v10H4z"/><circle cx="12" cy="13" r="3.1"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3"/><path d="M4 20v-4.6h4.6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.7.3-.9.7-.9 1.4"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>',
};

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const app = document.getElementById('app');

/* controls */
const controls = el('div', 'v7-controls');
controls.innerHTML =
  '<button class="v7-btn" id="v7Cinema" title="Cinematic auto-orbit (C)">' + ICON.play + '<span>Cinematic</span></button>' +
  '<button class="v7-btn" id="v7Shot" title="Save a PNG snapshot (S)">' + ICON.camera + '<span>Snapshot</span></button>' +
  '<button class="v7-btn" id="v7Full" title="Fullscreen (F)">' + ICON.expand + '<span>Fullscreen</span></button>' +
  '<button class="v7-btn" id="v7Reset" title="Reset view (R)">' + ICON.reset + '<span>Reset</span></button>' +
  '<button class="v7-btn" id="v7Photo" title="Photo mode - hide interface (H)">' + ICON.eye + '<span>Photo</span></button>' +
  '<button class="v7-btn" id="v7Help" title="Keyboard shortcuts (?)">' + ICON.help + '<span>Keys</span></button>';
app.appendChild(controls);

const exitPhoto = el('button', 'v7-btn', ICON.eye + '<span>Exit photo mode</span>');
exitPhoto.id = 'v7ExitPhoto';
app.appendChild(exitPhoto);

/* legend */
const legend = el('div', 'v7-legend');
legend.innerHTML =
  '<div><i style="background:#4f8793"></i>Water loop / pond</div>' +
  '<div><i style="background:#5f8a63"></i>Living crop layer</div>' +
  '<div><i style="background:#b58b4d"></i>Compute &amp; actuation</div>';
app.appendChild(legend);

/* minimap */
const mm = el('div', 'v7-minimap');
mm.innerHTML = '<div class="v7-mm-head"><b>Site plan</b><span>Live camera</span></div>';
const mmCanvas = el('canvas'); mmCanvas.width = 384; mmCanvas.height = 264;
mm.appendChild(mmCanvas);
app.appendChild(mm);
const mmCtx = mmCanvas.getContext('2d');

/* toasts */
const toastBox = el('div', 'v7-toasts');
app.appendChild(toastBox);
let toastTimer = null;
function toast(html, dur) {
  toastBox.innerHTML = '';
  const t = el('div', 'v7-toast', html);
  toastBox.appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, dur || 3200);
}

/* help modal */
const help = el('div', 'v7-modal');
help.innerHTML =
  '<div class="v7-modal-inner">' +
  '<button class="v7-modal-close" id="v7HelpClose">&times;</button>' +
  '<h2>Controls</h2><p class="v7-sub">Reference Farm 001 - navigation, views and analysis tools</p>' +
  '<div class="v7-kbd-grid">' +
  '<div class="v7-kbd-row"><span>Orbit / look around</span><span class="v7-keys"><kbd>drag</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Zoom in / out</span><span class="v7-keys"><kbd>scroll</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Pan the view</span><span class="v7-keys"><kbd>right-drag</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Focus a subsystem</span><span class="v7-keys"><kbd>dbl-click</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>View 01 - 08</span><span class="v7-keys"><kbd>1</kbd><kbd>..</kbd><kbd>8</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Guided tour</span><span class="v7-keys"><kbd>T</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Next weather</span><span class="v7-keys"><kbd>W</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Cinematic orbit</span><span class="v7-keys"><kbd>C</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Field notes drawer</span><span class="v7-keys"><kbd>D</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Toggle labels</span><span class="v7-keys"><kbd>L</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Snapshot (PNG)</span><span class="v7-keys"><kbd>S</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Photo mode</span><span class="v7-keys"><kbd>H</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Fullscreen</span><span class="v7-keys"><kbd>F</kbd></span></div>' +
  '<div class="v7-kbd-row"><span>Reset view</span><span class="v7-keys"><kbd>R</kbd></span></div>' +
  '</div></div>';
app.appendChild(help);
help.addEventListener('click', (e) => { if (e.target === help || e.target.id === 'v7HelpClose') help.classList.remove('open'); });

/* keep the new chrome out of the way until the visitor enters */
app.classList.add('v7-intro');
let introToastShown = false;
function clearIntro() {
  if (!app.classList.contains('v7-intro')) return;
  app.classList.remove('v7-intro');
  if (!introToastShown) {
    introToastShown = true;
    setTimeout(() => toast('<b>Reference Farm 001</b> &middot; drag to orbit, scroll to zoom, press <b>?</b> for every control', 5400), 800);
  }
}
{ const e0 = document.getElementById('enterBtn'); if (e0) e0.addEventListener('click', clearIntro); }
document.querySelectorAll('.viewbtn').forEach(b => b.addEventListener('click', clearIntro));

/* time-of-day row inside the weather dock */
const dock = document.getElementById('weatherDock');
if (dock) {
  const row = el('div', 'v7-tod');
  row.innerHTML = '<label>Time of day</label><input id="v7Tod" type="range" min="0" max="100" value="20"><span id="v7TodText">08:48</span>';
  const action = document.getElementById('weatherAction');
  if (action) dock.insertBefore(row, action); else dock.appendChild(row);
  const todIn = row.querySelector('#v7Tod'), todTx = row.querySelector('#v7TodText');
  const fmt = (t) => { const h = 6 + t * 14, hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(Math.min(59, mm)).padStart(2, '0'); };
  todTx.textContent = fmt(tod);
  todIn.addEventListener('input', () => { tod = +todIn.value / 100; todTx.textContent = fmt(tod); });
}

/* ---------------- weather override (smooth + toast) ---------------- */
setWeather = function (k) {
  if (!WEATHER[k]) return;
  weatherKey = k;
  const w = WEATHER[k];
  document.querySelectorAll('.weather-chip').forEach(b => b.classList.toggle('active', b.dataset.w === k));
  const g = (id) => document.getElementById(id);
  if (g('weatherName')) g('weatherName').textContent = w.name;
  if (g('wTemp')) g('wTemp').textContent = w.temp.toFixed(1) + '\u00B0';
  if (g('wRh')) g('wRh').textContent = Math.round(w.rh) + '%';
  if (g('wWind')) g('wWind').textContent = w.wind.toFixed(1);
  if (g('wRain')) g('wRain').textContent = w.rain.toFixed(1);
  if (g('weatherAction')) g('weatherAction').textContent = w.action;
  const vg = g('weatherVignette');
  if (vg) vg.classList.toggle('on', k === 'storm' || k === 'rain' || k === 'fog');
  toast('<b>' + w.name + '</b> &middot; ' + w.action, 3600);
};

/* ---------------- actions ---------------- */
function setCinema(on) {
  cinematic = on;
  const b = document.getElementById('v7Cinema');
  b.classList.toggle('on', on);
  b.innerHTML = (on ? ICON.pause : ICON.play) + '<span>' + (on ? 'Pause' : 'Cinematic') + '</span>';
  if (on) toast('<b>Cinematic orbit</b> &middot; the camera drifts around the farm', 2600);
}
function setPhoto(on) {
  photoMode = on;
  app.classList.toggle('v7-photo', on);
  document.getElementById('v7Photo').classList.toggle('on', on);
}
function toggleFull() {
  if (!document.fullscreenElement) { (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement); }
  else document.exitFullscreen && document.exitFullscreen();
}
function doShot() {
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trusted-garden-v07-' + Date.now() + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('<b>Snapshot saved</b> &middot; PNG captured at display resolution', 2600);
  } catch (e) { toast('Snapshot unavailable in this browser', 2600); }
}
function resetView() { focus('overview'); toast('View reset to master plan', 2000); }

document.getElementById('v7Cinema').onclick = () => setCinema(!cinematic);
document.getElementById('v7Shot').onclick = () => { wantShot = true; };
document.getElementById('v7Full').onclick = toggleFull;
document.getElementById('v7Reset').onclick = resetView;
document.getElementById('v7Photo').onclick = () => setPhoto(true);
exitPhoto.onclick = () => setPhoto(false);
document.getElementById('v7Help').onclick = () => help.classList.add('open');

/* ---------------- keyboard ---------------- */
const viewKeys = ['overview', 'entrance', 'compute', 'field', 'pond', 'aqua', 'control', 'north'];
const weatherKeys = ['clear', 'cloud', 'rain', 'storm', 'heat', 'wind', 'fog'];
let wIdx = 0;
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  // V0.8: while walking, WASD / C / 1-8 belong to the walker, not to the showcase
  // shortcuts (otherwise W would also cycle the weather).
  if (walkMode) return;
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '8') { focus(viewKeys[+k - 1]); }
  else if (k === 't') { document.getElementById('tourBtn').click(); }
  else if (k === 'w') { wIdx = (wIdx + 1) % weatherKeys.length; setWeather(weatherKeys[wIdx]); }
  else if (k === 'c') { setCinema(!cinematic); }
  else if (k === 'd') { document.getElementById('dataBtn').click(); }
  else if (k === 'l') { document.getElementById('labelSwitch').click(); }
  else if (k === 's') { wantShot = true; }
  else if (k === 'h') { setPhoto(!photoMode); }
  else if (k === 'f') { toggleFull(); }
  else if (k === 'r') { resetView(); }
  else if (k === '?' || k === '/') { help.classList.toggle('open'); }
  else if (k === 'escape') { help.classList.remove('open'); if (photoMode) setPhoto(false); }
});

/* ---------------- minimap ---------------- */
const mmZones = [
  { x: -13.6, z: 7.2, w: 8.4, h: 6.2, c: '#5f8a63' },
  { x: -13.6, z: 0.0, w: 8.4, h: 6.2, c: '#6b9470' },
  { x: -13.6, z: -7.4, w: 8.4, h: 6.2, c: '#557f5a' },
  { x: 9.5, z: 5.1, r: 3.2, c: '#4f8793' },
  { x: 10.0, z: -6.9, w: 6.6, h: 5.0, c: '#7ba36f' },
  { x: 3.0, z: -10.9, w: 4.4, h: 3.2, c: '#b58b4d' },
];
function drawMinimap() {
  const W = mmCanvas.width, H = mmCanvas.height;
  const X0 = -17, X1 = 17, Z0 = -15, Z1 = 15;
  const mx = (x) => (x - X0) / (X1 - X0) * W;
  const my = (z) => (z - Z0) / (Z1 - Z0) * H;
  mmCtx.clearRect(0, 0, W, H);
  mmCtx.fillStyle = 'rgba(247,244,236,.55)'; mmCtx.fillRect(0, 0, W, H);
  mmCtx.strokeStyle = 'rgba(31,47,37,.10)'; mmCtx.lineWidth = 1;
  for (let gx = -16; gx <= 16; gx += 4) { mmCtx.beginPath(); mmCtx.moveTo(mx(gx), 0); mmCtx.lineTo(mx(gx), H); mmCtx.stroke(); }
  for (let gz = -14; gz <= 14; gz += 4) { mmCtx.beginPath(); mmCtx.moveTo(0, my(gz)); mmCtx.lineTo(W, my(gz)); mmCtx.stroke(); }
  for (const z of mmZones) {
    mmCtx.fillStyle = z.c; mmCtx.globalAlpha = 0.55;
    if (z.r) { mmCtx.beginPath(); mmCtx.arc(mx(z.x), my(z.z), (z.r / (X1 - X0)) * W, 0, Math.PI * 2); mmCtx.fill(); }
    else mmCtx.fillRect(mx(z.x - z.w / 2), my(z.z - z.h / 2), (z.w / (X1 - X0)) * W, (z.h / (Z1 - Z0)) * H);
  }
  mmCtx.globalAlpha = 1;
  // camera
  const e = cameraEye();
  const fwd = V.norm(V.sub(cam.target, e));
  const ang = Math.atan2(fwd[0], fwd[2]);
  const cx = mx(e[0]), cy = my(e[2]);
  mmCtx.save();
  mmCtx.translate(cx, cy); mmCtx.rotate(-ang);
  const grd = mmCtx.createLinearGradient(0, 0, 0, -66);
  grd.addColorStop(0, 'rgba(38,65,47,.42)'); grd.addColorStop(1, 'rgba(38,65,47,0)');
  mmCtx.fillStyle = grd;
  mmCtx.beginPath(); mmCtx.moveTo(0, 0); mmCtx.lineTo(-30, -66); mmCtx.lineTo(30, -66); mmCtx.closePath(); mmCtx.fill();
  mmCtx.restore();
  mmCtx.fillStyle = '#26412f';
  mmCtx.beginPath(); mmCtx.arc(cx, cy, 4.2, 0, Math.PI * 2); mmCtx.fill();
  mmCtx.strokeStyle = 'rgba(247,244,236,.9)'; mmCtx.lineWidth = 1.6; mmCtx.stroke();
}
let mmTick = 0;

/* ---------------- first frame / intro ---------------- */
let introDone = false;
function onFirstFrame() {
  if (introDone) return; introDone = true;
  const ld = document.getElementById('loading');
  if (ld) ld.classList.add('done');
}

/* ---------------- minimap hook into frame ---------------- */
const prevPipelineHook = () => { if ((mmTick++ % 6) === 0) drawMinimap(); };
const origPipeline = renderMain;
renderMain = function (now) { origPipeline(now); prevPipelineHook(); };

/* ---------------- title / wordmark refresh ---------------- */
try {
  document.title = 'Trusted Garden - Reference Farm 001 / V0.8 Weather + Realism Showcase';
  const wm = document.querySelector('.wordmark span');
  if (wm) wm.textContent = 'Reference Farm 001 \u00B7 Weather + Realism Showcase / V0.8';
} catch (e) {}

/* ---------------- frame loop: keep the shadow map in sync with the sun ---------------- */
let shadowTick7 = 0, lastLightKey = '';
frame = function (now) {
  updateTransition(now);
  updateSun();
  const key = lightVP7[12].toFixed(4) + ',' + lightVP7[13].toFixed(4) + ',' + lightVP7[14].toFixed(4);
  if (key !== lastLightKey || (shadowTick7++ % 3) === 0) { renderShadow(now); lastLightKey = key; }
  renderMain(now);
  requestAnimationFrame(frame);
};

/* ============================================================
   V0.8 - character, first / third person, geometry repair
   ============================================================ */

/* ---------------- small matrix helpers ---------------- */
function mat4id() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
function mul3(A, B) {
  const C = new Float32Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++)
    C[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2];
  return C;
}
function trs(tx, ty, tz, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const Rz = new Float32Array([cz, -sz, 0, sz, cz, 0, 0, 0, 1]);
  const Rx = new Float32Array([1, 0, 0, 0, cx, -sx, 0, sx, cx]);
  const Ry = new Float32Array([cy, 0, sy, 0, 1, 0, -sy, 0, cy]);
  const R = mul3(mul3(Ry, Rx), Rz);
  const m = mat4id();
  m[0] = R[0]; m[1] = R[1]; m[2] = R[2];
  m[4] = R[3]; m[5] = R[4]; m[6] = R[5];
  m[8] = R[6]; m[9] = R[7]; m[10] = R[8];
  m[12] = tx; m[13] = ty; m[14] = tz;
  return m;
}
function mmul(a, b) { return M4.mul(a, b); }
function angLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* ---------------- scene analysis: AABB + walkable occupancy grid ---------------- */
let sceneBounds = { lo: [-22, -1, -17], hi: [22, 7, 18], c: [0, 3, 0.5] };
const GRID = { x0: -23, z0: -18, cell: 0.4, nx: 116, nz: 92 };
let occGrid = null, occCount = 0;
function analyzeScene() {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const g = new Uint8Array(GRID.nx * GRID.nz);
  for (const m of meshes) {
    if (m.v8char) continue;
    let p;
    try { p = f32(m.positions); } catch (e) { continue; }
    let ax = 1e9, ay = 1e9, az = 1e9, bx = -1e9, by = -1e9, bz = -1e9;
    for (let k = 0; k < p.length; k += 3) {
      const x = p[k], y = p[k + 1], z = p[k + 2];
      if (x < ax) ax = x; if (x > bx) bx = x;
      if (y < ay) ay = y; if (y > by) by = y;
      if (z < az) az = z; if (z > bz) bz = z;
    }
    if (ax < lo[0]) lo[0] = ax; if (bx > hi[0]) hi[0] = bx;
    if (ay < lo[1]) lo[1] = ay; if (by > hi[1]) hi[1] = by;
    if (az < lo[2]) lo[2] = az; if (bz > hi[2]) hi[2] = bz;
    // a mesh blocks walking when it is grounded AND tall enough to stop a person
    // (canopies, overhead gantries, flat paving and ground planes are all excluded)
    if (!(ay < 0.7 && by > 0.85)) continue;
    for (let k = 0; k < p.length; k += 3) {
      if (p[k + 1] > 2.2) continue;            // only the footprint at body height
      const gx = Math.floor((p[k] - GRID.x0) / GRID.cell);
      const gz = Math.floor((p[k + 2] - GRID.z0) / GRID.cell);
      if (gx >= 0 && gx < GRID.nx && gz >= 0 && gz < GRID.nz) g[gz * GRID.nx + gx] = 1;
    }
  }
  // dilate by one cell so the walker keeps a small clearance from geometry
  const g2 = new Uint8Array(g.length);
  for (let z = 0; z < GRID.nz; z++) for (let x = 0; x < GRID.nx; x++) {
    if (!g[z * GRID.nx + x]) continue;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx2 = x + dx, nz2 = z + dz;
      if (nx2 >= 0 && nx2 < GRID.nx && nz2 >= 0 && nz2 < GRID.nz) g2[nz2 * GRID.nx + nx2] = 1;
    }
  }
  occGrid = g2;
  occCount = 0;
  for (let i = 0; i < g2.length; i++) if (g2[i]) occCount++;
  sceneBounds = { lo: lo, hi: hi, c: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] };
  return sceneBounds;
}

/* ---------------- geometry repair: zero normals + degenerate triangles ---------------- */
let repairStats = null;
function repairGeometry() {
  if (repairStats) return repairStats;
  let touched = 0, removed = 0, fixed = 0;
  for (const m of meshes) {
    if (m.v8char) continue;
    let pos, nor, idx;
    try { pos = f32(m.positions); nor = f32(m.normals); idx = u32(m.indices); } catch (e) { continue; }
    const nv = pos.length / 3;
    let zero = 0;
    for (let i = 0; i < nv; i++) {
      const a = nor[i * 3], b = nor[i * 3 + 1], c = nor[i * 3 + 2];
      if (a * a + b * b + c * c < 1e-8) zero++;
    }
    let deg = 0;
    const triOK = (t) => {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      return cx * cx + cy * cy + cz * cz >= 1e-12;
    };
    for (let t = 0; t < idx.length; t += 3) if (!triOK(t)) deg++;
    if (zero === 0 && deg === 0) continue;
    touched++; removed += deg;

    const keep = new Uint32Array(idx.length - deg * 3);
    let w = 0;
    for (let t = 0; t < idx.length; t += 3) {
      if (!triOK(t)) continue;
      keep[w++] = idx[t]; keep[w++] = idx[t + 1]; keep[w++] = idx[t + 2];
    }
    const acc = new Float32Array(nv * 3);
    for (let t = 0; t < w; t += 3) {
      const a = keep[t], b = keep[t + 1], c = keep[t + 2];
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      acc[a * 3] += cx; acc[a * 3 + 1] += cy; acc[a * 3 + 2] += cz;
      acc[b * 3] += cx; acc[b * 3 + 1] += cy; acc[b * 3 + 2] += cz;
      acc[c * 3] += cx; acc[c * 3 + 1] += cy; acc[c * 3 + 2] += cz;
    }
    for (let i = 0; i < nv; i++) {
      const a = nor[i * 3], b = nor[i * 3 + 1], c = nor[i * 3 + 2];
      if (a * a + b * b + c * c >= 1e-8) continue;
      const gx = acc[i * 3], gy = acc[i * 3 + 1], gz = acc[i * 3 + 2];
      const l = Math.sqrt(gx * gx + gy * gy + gz * gz);
      if (l > 1e-9) { nor[i * 3] = gx / l; nor[i * 3 + 1] = gy / l; nor[i * 3 + 2] = gz / l; }
      else { nor[i * 3] = 0; nor[i * 3 + 1] = 1; nor[i * 3 + 2] = 0; }
      fixed++;
    }
    gl.bindVertexArray(m.vao);
    let pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    let nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, nor, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    let ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, keep.subarray(0, w), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    m.count = w;
  }
  repairStats = { touched: touched, removed: removed, fixed: fixed };
  return repairStats;
}


/* ---------------- procedural geometry primitives ---------------- */
function geo3(v, n, i) { return { v: new Float32Array(v), n: new Float32Array(n), i: new Uint32Array(i) }; }

function sphereGeo(r, seg, ring, half) {
  const v = [], n = [], idx = [];
  const phiMax = half ? Math.PI / 2 : Math.PI;
  const rows = half ? ring : ring;
  for (let y = 0; y <= rows; y++) {
    const phi = phiMax * y / rows;
    const sy = Math.sin(phi), cy = Math.cos(phi);
    for (let x = 0; x <= seg; x++) {
      const th = 2 * Math.PI * x / seg;
      const px = r * sy * Math.cos(th), py = r * cy, pz = r * sy * Math.sin(th);
      v.push(px, py, pz);
      n.push(sy * Math.cos(th), cy, sy * Math.sin(th));
    }
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < seg; x++) {
    const a = y * (seg + 1) + x, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  return geo3(v, n, idx);
}

function boxGeo(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  const F = [
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
    [[-x, -y, -z], [-x, y, -z], [x, y, -z], [x, -y, -z], [0, 0, -1]],
    [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0]],
    [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z], [0, -1, 0]],
    [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z], [-1, 0, 0]],
    [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]]
  ];
  const v = [], n = [], idx = [];
  for (const f of F) {
    const base = v.length / 3;
    for (let i = 0; i < 4; i++) { v.push(f[i][0], f[i][1], f[i][2]); n.push(f[4][0], f[4][1], f[4][2]); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return geo3(v, n, idx);
}

/* capsule: cylinder of height h along Y plus hemispherical caps (total height h + 2r) */
function capGeo(r, h, seg, capRing) {
  const v = [], n = [], idx = [];
  const rows = [];
  for (let k = 0; k <= capRing; k++) {
    const t = (Math.PI / 2) * k / capRing;
    rows.push({ y: h / 2 + Math.cos(t) * r, rr: Math.sin(t) * r, ni: Math.cos(t), nr: Math.sin(t) });
  }
  for (let k = 1; k <= capRing; k++) {
    const t = (Math.PI / 2) * k / capRing;
    rows.push({ y: -h / 2 - Math.cos(t) * r, rr: Math.sin(t) * r, ni: -Math.cos(t), nr: Math.sin(t) });
  }
  for (const row of rows) {
    for (let x = 0; x <= seg; x++) {
      const th = 2 * Math.PI * x / seg;
      v.push(row.rr * Math.cos(th), row.y, row.rr * Math.sin(th));
      n.push(row.nr * Math.cos(th), row.ni, row.nr * Math.sin(th));
    }
  }
  for (let y = 0; y < rows.length - 1; y++) for (let x = 0; x < seg; x++) {
    const a = y * (seg + 1) + x, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  return geo3(v, n, idx);
}


/* ---------------- character ---------------- */
const COL = {
  skin: [0.80, 0.60, 0.46], hair: [0.13, 0.12, 0.12],
  jacket: [0.20, 0.33, 0.40], jacket2: [0.27, 0.42, 0.50],
  trousers: [0.40, 0.38, 0.32], boot: [0.13, 0.12, 0.11],
  pack: [0.44, 0.32, 0.20], board: [0.64, 0.65, 0.62],
  vest: [0.82, 0.52, 0.14]
};
const CHAR = {
  pos: [0, 0, -9], y: 0, yaw: 0, yawTarget: 0, vx: 0, vz: 0, speed: 0,
  phase: 0, headBob: 0, hipY: 0, hipPitch: 0, chestPitch: 0.02,
  headPitch: 0, headYaw: 0, shLx: 0.06, shLz: 0.10, shRx: 0.06,
  elLx: -0.32, elRx: -0.40, thLx: 0, thRx: 0, knLx: 0.05, knRx: 0.05
};
const CHARCAM = { mode: 'third', dist: 4.6, curDist: 4.6, yaw: 0, pitch: 0.02 };
let walkMode = false;

const charParts = [];
const charBones = {};

function addCharPart(desc) {
  const g = desc.geo;
  const m = {
    name: 'v08_char_' + desc.id, region: 'site', layer: 'v08-char', kind: 'solid',
    color: [desc.color[0], desc.color[1], desc.color[2], 1],
    roughness: desc.rough, metallic: desc.metal || 0, alpha: 1,
    doubleSided: true, crop: false, visible: true, kindN: 0, dl: 0,
    idx: 2000 + charParts.length, surf: desc.surf || 0,
    center: [0, 0, 0], count: g.i.length, v8char: true,
    bone: desc.bone, off: desc.off, rot: desc.rot || [0, 0, 0],
    vao: null, posBuf: null, norBuf: null, posCpu: null, norCpu: null, geo: g
  };
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const pb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, g.v, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, g.n, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.i, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  m.vao = vao; m.posBuf = pb; m.norBuf = nb;
  m.posCpu = new Float32Array(g.v.length);
  m.norCpu = new Float32Array(g.n.length);
  charParts.push(m);
  meshes.push(m);
  return m;
}

function buildCharacter() {
  const S = (r, s, g) => sphereGeo(r, s, g);
  const C = (r, h) => capGeo(r, h, 12, 4);
  const B = (w, h, d) => boxGeo(w, h, d);
  // torso / hips
  addCharPart({ id: 'pelvis', bone: 'hips', off: [0, 0, 0], geo: B(0.29, 0.20, 0.20), color: COL.trousers, rough: 0.82, surf: 4 });
  addCharPart({ id: 'torso', bone: 'chest', off: [0, 0.07, 0], geo: C(0.150, 0.22), color: COL.jacket, rough: 0.74, surf: 4 });
  addCharPart({ id: 'chest', bone: 'chest', off: [0, 0.29, 0], geo: C(0.168, 0.19), color: COL.jacket2, rough: 0.72, surf: 4 });
  addCharPart({ id: 'strap', bone: 'chest', off: [0, 0.33, 0.145], geo: B(0.30, 0.05, 0.05), color: COL.vest, rough: 0.55, surf: 3 });
  addCharPart({ id: 'pack', bone: 'chest', off: [0, 0.22, -0.150], geo: B(0.20, 0.27, 0.09), color: COL.pack, rough: 0.78, surf: 4 });
  // neck / head
  addCharPart({ id: 'neckm', bone: 'neck', off: [0, 0.01, 0], geo: C(0.055, 0.07), color: COL.skin, rough: 0.62 });
  addCharPart({ id: 'head', bone: 'neck', off: [0, 0.115, 0], geo: S(0.102, 16, 12), color: COL.skin, rough: 0.60, head: true });
  addCharPart({ id: 'hair', bone: 'neck', off: [0, 0.115, 0], geo: sphereGeo(0.110, 16, 8, true), color: COL.hair, rough: 0.55, head: true });
  addCharPart({ id: 'brim', bone: 'neck', off: [0, 0.150, 0.095], geo: B(0.195, 0.020, 0.125), color: COL.hair, rough: 0.5, head: true });
  // arms
  for (const side of [1, -1]) {
    const tag = side > 0 ? 'L' : 'R';
    addCharPart({ id: 'upArm' + tag, bone: 'shoulder' + tag, off: [0, -0.13, 0], geo: C(0.055, 0.20), color: COL.jacket2, rough: 0.74, surf: 4 });
    addCharPart({ id: 'foreArm' + tag, bone: 'elbow' + tag, off: [0, -0.11, 0], geo: C(0.048, 0.18), color: COL.jacket, rough: 0.74, surf: 4 });
    addCharPart({ id: 'hand' + tag, bone: 'elbow' + tag, off: [0, -0.245, 0], geo: S(0.055, 10, 8), color: COL.skin, rough: 0.62 });
  }
  // clipboard in the right hand
  addCharPart({ id: 'board', bone: 'elbowR', off: [0, -0.30, 0.08], rot: [-1.15, 0, 0.25], geo: B(0.17, 0.016, 0.24), color: COL.board, rough: 0.45, metal: 0.05, surf: 3 });
  // legs
  for (const side of [1, -1]) {
    const tag = side > 0 ? 'L' : 'R';
    addCharPart({ id: 'thigh' + tag, bone: 'hip' + tag, off: [0, -0.22, 0], geo: C(0.082, 0.34), color: COL.trousers, rough: 0.82, surf: 4 });
    addCharPart({ id: 'shin' + tag, bone: 'knee' + tag, off: [0, -0.19, 0], geo: C(0.062, 0.30), color: COL.trousers, rough: 0.82, surf: 4 });
    addCharPart({ id: 'foot' + tag, bone: 'knee' + tag, off: [0, -0.395, 0.045], geo: B(0.105, 0.085, 0.25), color: COL.boot, rough: 0.52, surf: 3 });
  }
}


/* ---------------- character rig + animation ---------------- */
function computeBones() {
  const root = trs(CHAR.pos[0], CHAR.y, CHAR.pos[2], 0, CHAR.yaw, 0);
  const B = charBones;
  B.hips = mmul(root, trs(0, 0.90 + CHAR.hipY, 0, CHAR.hipPitch, 0, 0));
  B.chest = mmul(B.hips, trs(0, 0.20, 0, CHAR.chestPitch, 0, 0));
  B.neck = mmul(B.chest, trs(0, 0.46, 0, CHAR.headPitch, 0, CHAR.headYaw));
  B.shoulderL = mmul(B.chest, trs(0.205, 0.40, 0, CHAR.shLx, 0, CHAR.shLz));
  B.elbowL = mmul(B.shoulderL, trs(0, -0.26, 0, CHAR.elLx, 0, 0));
  B.shoulderR = mmul(B.chest, trs(-0.205, 0.40, 0, CHAR.shRx, 0, -CHAR.shLz));
  B.elbowR = mmul(B.shoulderR, trs(0, -0.26, 0, CHAR.elRx, 0, 0));
  B.hipL = mmul(B.hips, trs(0.095, -0.02, 0, CHAR.thLx, 0, 0));
  B.kneeL = mmul(B.hipL, trs(0, -0.44, 0, CHAR.knLx, 0, 0));
  B.hipR = mmul(B.hips, trs(-0.095, -0.02, 0, CHAR.thRx, 0, 0));
  B.kneeR = mmul(B.hipR, trs(0, -0.44, 0, CHAR.knRx, 0, 0));
  return B;
}

function animateCharacter(dt, moving) {
  const amp = moving ? Math.min(1, CHAR.speed / 2.2) : 0;
  CHAR.phase += dt * (moving ? (4.4 + CHAR.speed * 1.1) : 1.3);
  const p = CHAR.phase;
  const swing = Math.sin(p), swing2 = Math.sin(p + Math.PI);
  const breathe = Math.sin(p * 0.62) * 0.5 + 0.5;

  CHAR.thLx = -swing * 0.58 * amp - 0.01;
  CHAR.thRx = -swing2 * 0.58 * amp - 0.01;
  CHAR.knLx = Math.max(0, Math.sin(p + 1.05)) * 0.95 * amp + 0.05;
  CHAR.knRx = Math.max(0, Math.sin(p + Math.PI + 1.05)) * 0.95 * amp + 0.05;
  CHAR.shLx = swing * 0.46 * amp + 0.06;
  CHAR.shRx = swing2 * 0.46 * amp + 0.06;
  CHAR.shLz = 0.10 + amp * 0.03;
  CHAR.elLx = -0.30 - 0.22 * amp;
  CHAR.elRx = -0.42 - 0.22 * amp;
  CHAR.hipY = moving ? Math.abs(Math.sin(p)) * 0.026 * amp : (breathe - 0.5) * 0.008;
  CHAR.chestPitch = (moving ? 0.07 * amp : 0.02) + (breathe - 0.5) * 0.012;
  CHAR.hipPitch = -0.02 * amp;
  CHAR.headBob = moving ? Math.sin(p * 2) * 0.019 * amp : Math.sin(p * 0.62) * 0.006;
}

function transformCharParts() {
  const B = computeBones();
  for (const m of charParts) {
    const bone = B[m.bone];
    const local = trs(m.off[0], m.off[1], m.off[2], m.rot[0], m.rot[1], m.rot[2]);
    const M = mmul(bone, local);
    const gv = m.geo.v, gn = m.geo.n, P = m.posCpu, N = m.norCpu;
    for (let i = 0; i < gv.length; i += 3) {
      const x = gv[i], y = gv[i + 1], z = gv[i + 2];
      P[i] = M[0] * x + M[4] * y + M[8] * z + M[12];
      P[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
      P[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      const nx = gn[i], ny = gn[i + 1], nz = gn[i + 2];
      N[i] = M[0] * nx + M[4] * ny + M[8] * nz;
      N[i + 1] = M[1] * nx + M[5] * ny + M[9] * nz;
      N[i + 2] = M[2] * nx + M[6] * ny + M[10] * nz;
    }
    m.center[0] = M[12]; m.center[1] = M[13]; m.center[2] = M[14];
  }
}

function uploadCharParts() {
  for (const m of charParts) {
    gl.bindVertexArray(m.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.posCpu);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.norBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.norCpu);
  }
  gl.bindVertexArray(null);
}

/* ---------------- collision (occupancy grid + pond + world bounds) ---------------- */
const WORLD = { x0: -20.5, x1: 20.5, z0: -15.5, z1: 16.5, pondX: 9.5, pondZ: 5.1, pondR: 3.55 };
function posFree(x, z) {
  if (x < WORLD.x0 || x > WORLD.x1 || z < WORLD.z0 || z > WORLD.z1) return false;
  const dx = x - WORLD.pondX, dz = z - WORLD.pondZ;
  if (dx * dx + dz * dz < WORLD.pondR * WORLD.pondR) return false;
  if (occGrid) {
    const gx = Math.floor((x - GRID.x0) / GRID.cell), gz = Math.floor((z - GRID.z0) / GRID.cell);
    if (gx < 0 || gx >= GRID.nx || gz < 0 || gz >= GRID.nz) return false;
    if (occGrid[gz * GRID.nx + gx]) return false;
  }
  return true;
}
function gridBlocked(x, z) {
  if (!occGrid) return false;
  const gx = Math.floor((x - GRID.x0) / GRID.cell), gz = Math.floor((z - GRID.z0) / GRID.cell);
  if (gx < 0 || gx >= GRID.nx || gz < 0 || gz >= GRID.nz) return false;
  return !!occGrid[gz * GRID.nx + gx];
}
/* pick the most open standing spot on the site (clear ring in all directions) */
function openScore(x, z) {
  let n = 0;
  for (let a = 0; a < 8; a++) {
    const ang = a * Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang);
    let ok = true;
    for (let r = 1; r <= 5; r += 0.5) if (!posFree(x + ca * r, z + sa * r)) { ok = false; break; }
    if (ok) n++;
  }
  return n;
}
function findSpawn() {
  let best = [0, -7.5], bestScore = -1;
  for (let x = -14; x <= 14; x += 1.0) for (let z = -12; z <= 12; z += 1.0) {
    if (!posFree(x, z)) continue;
    const s = openScore(x, z) * 100 - (Math.abs(x) + Math.abs(z + 4) * 0.5);
    if (s > bestScore) { bestScore = s; best = [x, z]; }
  }
  return best;
}


/* ---------------- camera modes ---------------- */
function cameraEye() {
  if (walkMode && CHARCAM.mode === 'first') {
    return [CHAR.pos[0], CHAR.pos[1] + 1.62 + CHAR.headBob, CHAR.pos[2]];
  }
  return eyeFrom();
}

function idleCharacter(dt) {
  CHAR.vx *= 0.85; CHAR.vz *= 0.85;
  CHAR.speed = Math.hypot(CHAR.vx, CHAR.vz);
  CHAR.yawTarget = Math.atan2(cam.target[0] - CHAR.pos[0], cam.target[2] - CHAR.pos[2]);
  CHAR.yaw = angLerp(CHAR.yaw, CHAR.yawTarget, Math.min(1, dt * 1.6));
  animateCharacter(dt, false);
}

function updateCharacter(dt) {
  const run = !!(keys.ShiftLeft || keys.ShiftRight);
  const fx = Math.sin(CHARCAM.yaw), fz = Math.cos(CHARCAM.yaw);
  const rx = Math.cos(CHARCAM.yaw), rz = -Math.sin(CHARCAM.yaw);
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) { mx += fx; mz += fz; }
  if (keys.KeyS || keys.ArrowDown) { mx -= fx; mz -= fz; }
  if (keys.KeyD || keys.ArrowRight) { mx += rx; mz += rz; }
  if (keys.KeyA || keys.ArrowLeft) { mx -= rx; mz -= rz; }
  const l = Math.hypot(mx, mz);
  const tv = run ? 3.05 : 1.42;
  if (l > 0.001) { mx = mx / l * tv; mz = mz / l * tv; } else { mx = 0; mz = 0; }
  const k = Math.min(1, dt * (l > 0.001 ? 8.5 : 11));
  CHAR.vx += (mx - CHAR.vx) * k;
  CHAR.vz += (mz - CHAR.vz) * k;
  if (Math.abs(CHAR.vx) < 0.02) CHAR.vx = 0;
  if (Math.abs(CHAR.vz) < 0.02) CHAR.vz = 0;

  let nx = CHAR.pos[0] + CHAR.vx * dt, nz = CHAR.pos[2] + CHAR.vz * dt;
  if (!posFree(nx, nz)) {
    if (posFree(nx, CHAR.pos[2])) { nz = CHAR.pos[2]; CHAR.vz = 0; }
    else if (posFree(CHAR.pos[0], nz)) { nx = CHAR.pos[0]; CHAR.vx = 0; }
    else { nx = CHAR.pos[0]; nz = CHAR.pos[2]; CHAR.vx = 0; CHAR.vz = 0; }
  }
  CHAR.pos[0] = nx; CHAR.pos[2] = nz;
  CHAR.speed = Math.hypot(CHAR.vx, CHAR.vz);
  CHAR.yawTarget = CHARCAM.yaw;
  CHAR.yaw = angLerp(CHAR.yaw, CHARCAM.yaw, Math.min(1, dt * 9));
  animateCharacter(dt, CHAR.speed > 0.12);
}

function applyCharCamera(dt) {
  if (!walkMode) return;
  const k = Math.min(1, dt * 6.5);
  if (CHARCAM.mode === 'first') {
    const cp = Math.cos(CHARCAM.pitch);
    const fx = Math.sin(CHARCAM.yaw) * cp, fy = Math.sin(CHARCAM.pitch), fz = Math.cos(CHARCAM.yaw) * cp;
    const hy = CHAR.pos[1] + 1.62 + CHAR.headBob;
    cam.target[0] = CHAR.pos[0] + fx * 6; cam.target[1] = hy + fy * 6; cam.target[2] = CHAR.pos[2] + fz * 6;
    cam.yaw = CHARCAM.yaw; cam.pitch = CHARCAM.pitch; cam.dist = 6;
  } else {
    const ty = CHAR.pos[1] + 1.42 + CHAR.hipY;
    cam.target[0] += (CHAR.pos[0] - cam.target[0]) * k;
    cam.target[1] += (ty - cam.target[1]) * k;
    cam.target[2] += (CHAR.pos[2] - cam.target[2]) * k;
    cam.yaw = CHAR.yaw + Math.PI;
    cam.pitch = clamp(CHARCAM.pitch + 0.22, 0.05, 1.05);
    // camera collision: pull in when geometry sits between the walker and the camera
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const dx = Math.sin(cam.yaw) * cp, dz = Math.cos(cam.yaw) * cp;
    let want = CHARCAM.dist;
    for (let i = 1; i <= 12; i++) {
      const t = i / 12 * CHARCAM.dist;
      if (gridBlocked(cam.target[0] + dx * t, cam.target[2] + dz * t)) {
        want = Math.max(1.15, (i - 1) / 12 * CHARCAM.dist);
        break;
      }
    }
    CHARCAM.curDist += (want - CHARCAM.curDist) * Math.min(1, dt * (want < CHARCAM.curDist ? 12 : 3));
    cam.dist = CHARCAM.curDist;
  }
}
function snapCharCamera() {
  cam.target[0] = CHAR.pos[0];
  cam.target[1] = CHAR.pos[1] + 1.42;
  cam.target[2] = CHAR.pos[2];
  cam.dist = CHARCAM.dist;
  CHARCAM.curDist = CHARCAM.dist;
  cam.yaw = CHAR.yaw + Math.PI;
  cam.pitch = clamp(CHARCAM.pitch + 0.22, 0.05, 1.05);
}

/* ---------------- input ---------------- */
const keys = Object.create(null);
let lookDrag = false, lastPX = 0, lastPY = 0, ptrLocked = false;
const LOOK_SENS = 0.0032;

function walkInputActive() { return walkMode; }

function onDown(e) {
  if (!walkInputActive()) return;
  if (e.button !== 0) return;
  lookDrag = true; lastPX = e.clientX; lastPY = e.clientY;
  if (CHARCAM.mode === 'first' && canvas.requestPointerLock) {
    try { canvas.requestPointerLock(); } catch (err) {}
  }
}
function onMove(e) {
  if (!walkInputActive()) return;
  let dx = 0, dy = 0;
  if (ptrLocked) { dx = e.movementX || 0; dy = e.movementY || 0; }
  else if (lookDrag) { dx = e.clientX - lastPX; dy = e.clientY - lastPY; lastPX = e.clientX; lastPY = e.clientY; }
  else return;
  if (dx === 0 && dy === 0) return;
  CHARCAM.yaw -= dx * LOOK_SENS;
  CHARCAM.pitch = clamp(CHARCAM.pitch - dy * LOOK_SENS * 0.85, -1.05, 1.15);
}
function onUp() { lookDrag = false; }
// guard the legacy pointer capture call (synthetic / stale pointers can throw)
if (canvas.setPointerCapture) {
  const _spc = canvas.setPointerCapture.bind(canvas);
  canvas.setPointerCapture = function (id) { try { _spc(id); } catch (err) {} };
}
document.addEventListener('pointerdown', onDown, true);
document.addEventListener('pointermove', onMove, true);
document.addEventListener('pointerup', onUp, true);
document.addEventListener('pointercancel', onUp, true);
document.addEventListener('pointerlockchange', () => {
  ptrLocked = document.pointerLockElement === canvas;
  if (ptrLocked && walkMode) toast('Pointer locked &middot; move the mouse to look, press <b>Esc</b> to release', 3200);
});
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  // G toggles walk mode from either state
  if (e.code === 'KeyG') {
    if (walkMode) exitWalk(); else enterWalk('third');
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyY') { setSundial(!sundial); e.preventDefault(); return; }
  if (!walkMode) return;
  if (e.code === 'KeyV') { setCharCam(CHARCAM.mode === 'first' ? 'third' : 'first'); e.preventDefault(); }
  else if (e.code === 'Escape') {
    if (ptrLocked) { document.exitPointerLock && document.exitPointerLock(); }
    else exitWalk();
  } else if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
             e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
             e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
    e.preventDefault();
  }
}, true);
window.addEventListener('keyup', (e) => { keys[e.code] = false; }, true);

/* ---------------- walk mode plumbing ---------------- */
function setHeadVisible(v) {
  for (const m of charParts) if (m.geo.head || m.bone === 'neck') m.visible = v;
}
function setCharCam(mode) {
  CHARCAM.mode = mode;
  const b1 = document.getElementById('v8First'), b2 = document.getElementById('v8Third');
  if (b1) b1.classList.toggle('active', mode === 'first');
  if (b2) b2.classList.toggle('active', mode === 'third');
  setHeadVisible(mode !== 'first');
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.toggle('v8-first', mode === 'first');
  if (walkMode && mode === 'third') snapCharCamera();
  if (mode !== 'first' && ptrLocked && document.exitPointerLock) document.exitPointerLock();
  toast(mode === 'first' ? '<b>First person</b> &middot; you are the field researcher' : '<b>Third person</b> &middot; camera follows the researcher', 2400);
}
function enterWalk(mode) {
  if (walkMode) { setCharCam(mode); return; }
  walkMode = true;
  trans = null;
  if (!posFree(CHAR.pos[0], CHAR.pos[2])) { const sp = findSpawn(); CHAR.pos[0] = sp[0]; CHAR.pos[2] = sp[1]; }
  CHARCAM.yaw = CHAR.yaw;
  CHARCAM.pitch = 0.02;
  snapCharCamera();
  const bar = document.getElementById('v8Walkbar');
  if (bar) bar.classList.add('open');
  const btn = document.getElementById('v8Walk');
  if (btn) btn.classList.add('on');
  setCharCam(mode);
  document.getElementById('app').classList.add('v8-walking');
}
function exitWalk() {
  if (!walkMode) return;
  walkMode = false;
  if (ptrLocked && document.exitPointerLock) document.exitPointerLock();
  const bar = document.getElementById('v8Walkbar');
  if (bar) bar.classList.remove('open');
  const btn = document.getElementById('v8Walk');
  if (btn) btn.classList.remove('on');
  setHeadVisible(true);
  document.getElementById('app').classList.remove('v8-walking');
  focus(currentView);
  toast('Returned to orbit view', 2000);
}



/* ---------------- procedural ground detail (grass tufts) ---------------- */
/* The source model is clean but its ground planes carry no fine-scale geometry.
   This scatters small cross-quad tufts over the grass surfaces to raise the
   perceived detail and ground the planting beds. */
const detailMeshes = [];

function makeStaticMesh(geo, opt) {
  const m = {
    name: 'v08_detail_' + opt.id, region: 'site', layer: 'v08-detail', kind: 'solid',
    color: [opt.color[0], opt.color[1], opt.color[2], 1],
    roughness: opt.rough || 0.78, metallic: 0, alpha: 1,
    doubleSided: true, crop: false, visible: true, kindN: 0, dl: 0,
    idx: opt.idx, surf: 2, center: [0, 0.6, 0], count: geo.i.length,
    v8char: true, v8detail: true, noShadow: true, vao: null
  };
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, geo.v, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, geo.n, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.i, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  m.vao = vao;
  meshes.push(m);
  detailMeshes.push(m);
  return m;
}

function addTuft(B, x, z, rnd) {
  const h = 0.12 + rnd() * 0.14;
  const w = 0.042 + rnd() * 0.028;
  const yaw = rnd() * Math.PI;
  const lean = (rnd() - 0.5) * 0.07;
  for (let q = 0; q < 3; q++) {
    const a = yaw + q * Math.PI / 3;
    const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    const nx = Math.sin(a) * 0.42, nz = -Math.cos(a) * 0.42;
    const nl = Math.sqrt(nx * nx + 0.82 + nz * nz);
    const nX = nx / nl, nY = 0.9 / nl, nZ = nz / nl;
    const base = B.v.length / 3;
    B.v.push(x - dx, 0.0, z - dz, x + dx, 0.0, z + dz,
             x + dx + lean, h, z + dz + lean * 0.6, x - dx + lean, h, z - dz + lean * 0.6);
    B.n.push(nX, nY, nZ, nX, nY, nZ, nX, nY * 0.7, nZ, nX, nY * 0.7, nZ);
    B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function buildGroundDetail() {
  const GS = 0.85, gx0 = -23, gz0 = -18, gnx = 78, gnz = 62;
  const mask = new Uint8Array(gnx * gnz);
  let grassCells = 0;
  for (const m of meshes) {
    if (m.v8char || m.v8detail) continue;
    const nm = (m.name || '').toLowerCase();
    if (nm.indexOf('grass') < 0) continue;
    let p, ix;
    try { p = f32(m.positions); ix = u32(m.indices); } catch (e) { continue; }
    // the grass planes are huge and sparse (8-16 verts): rasterise each TRIANGLE
    for (let t = 0; t < ix.length; t += 3) {
      const A = ix[t], B = ix[t + 1], C = ix[t + 2];
      if (p[A * 3 + 1] > 0.60 || p[B * 3 + 1] > 0.60 || p[C * 3 + 1] > 0.60) continue;
      const ax = p[A * 3], az = p[A * 3 + 2], bx = p[B * 3], bz = p[B * 3 + 2], cx = p[C * 3], cz = p[C * 3 + 2];
      if (Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) < 1e-9) continue;
      let x0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - gx0) / GS));
      let x1 = Math.min(gnx - 1, Math.floor((Math.max(ax, bx, cx) - gx0) / GS));
      let z0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - gz0) / GS));
      let z1 = Math.min(gnz - 1, Math.floor((Math.max(az, bz, cz) - gz0) / GS));
      for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
        if (mask[gz * gnx + gx]) continue;
        const px = gx0 + (gx + 0.5) * GS, pz = gz0 + (gz + 0.5) * GS;
        const d1 = (bx - ax) * (pz - az) - (bz - az) * (px - ax);
        const d2 = (cx - bx) * (pz - bz) - (cz - bz) * (px - bx);
        const d3 = (ax - cx) * (pz - cz) - (az - cz) * (px - cx);
        const neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const po = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(neg && po)) { mask[gz * gnx + gx] = 1; grassCells++; }
      }
    }
  }
  if (grassCells === 0) return;

  const shades = [
    [0.196, 0.310, 0.148], [0.255, 0.380, 0.176],
    [0.157, 0.267, 0.129], [0.310, 0.424, 0.203]
  ];
  const buckets = shades.map(() => ({ v: [], n: [], i: [] }));
  let seed = 20261023;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  let n = 0;
  for (let cz = 0; cz < gnz; cz++) for (let cx = 0; cx < gnx; cx++) {
    if (!mask[cz * gnx + cx]) continue;
    for (let t = 0; t < 3; t++) {
      if (rnd() > 0.78) continue;
      const x = gx0 + (cx + rnd()) * GS, z = gz0 + (cz + rnd()) * GS;
      if (!posFree(x, z)) continue;
      addTuft(buckets[n & 3], x, z, rnd);
      n++;
    }
  }
  if (n === 0) return;

  let tri = 0;
  for (let b = 0; b < 4; b++) {
    const B = buckets[b];
    if (!B.i.length) continue;
    tri += B.i.length / 3;
    makeStaticMesh({ v: new Float32Array(B.v), n: new Float32Array(B.n), i: new Uint32Array(B.i) }, {
      id: 'grass' + b, color: shades[b], rough: 0.80, idx: 3000 + b
    });
  }
  groundDetailStats = { grassCells: grassCells, tufts: n, triangles: tri };
}
let groundDetailStats = null;

/* ---------------- V0.8 UI ---------------- */
/* sundial: let the day run so the visitor sees the light change */
let sundial = false;
const SUNDIAL_DUR = 52;
function fmtTod(t) {
  const h = 6 + t * 14, hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(Math.min(59, mm)).padStart(2, '0');
}
function stepSundial(dt) {
  if (!sundial) return;
  tod += dt / SUNDIAL_DUR;
  if (tod > 1) tod -= 1;
  const s = document.getElementById('v7Tod'), t = document.getElementById('v7TodText');
  if (s) s.value = Math.round(tod * 100);
  if (t) t.textContent = fmtTod(tod);
}
function setSundial(on) {
  sundial = on;
  const b = document.getElementById('v8Sundial');
  if (b) b.classList.toggle('on', on);
  if (on) toast('<b>Sundial</b> &middot; the day runs from 06:00 to 20:00', 3000);
}
(function buildV8UI() {
  const controls = document.querySelector('.v7-controls');
  const personIcon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.4" r="3.2"/><path d="M5.4 20.5c.6-4.1 3.3-6.4 6.6-6.4s6 2.3 6.6 6.4"/></svg>';
  const walkBtn = document.createElement('button');
  walkBtn.className = 'v7-btn';
  walkBtn.id = 'v8Walk';
  walkBtn.title = 'Walk the farm as the field researcher (G)';
  walkBtn.innerHTML = personIcon + '<span>Walk mode</span>';
  if (controls) controls.insertBefore(walkBtn, controls.firstChild);

  const sunIcon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>';
  const sunBtn = document.createElement('button');
  sunBtn.className = 'v7-btn';
  sunBtn.id = 'v8Sundial';
  sunBtn.title = 'Let the day run (Y)';
  sunBtn.innerHTML = sunIcon + '<span>Sundial</span>';
  if (controls) controls.insertBefore(sunBtn, walkBtn.nextSibling);
  sunBtn.onclick = () => setSundial(!sundial);
  const todEl = document.getElementById('v7Tod');
  if (todEl) todEl.addEventListener('input', () => { if (sundial) setSundial(false); });

  const bar = document.createElement('div');
  bar.className = 'v8-walkbar';
  bar.id = 'v8Walkbar';
  bar.innerHTML =
    '<div class="v8-wb-head"><b>Walk mode</b><span>Reference Farm 001</span></div>' +
    '<div class="v8-wb-views">' +
    '<button id="v8First">First person</button><button id="v8Third" class="active">Third person</button>' +
    '</div>' +
    '<div class="v8-wb-keys">' +
    '<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>' +
    '<span><kbd>Shift</kbd> run</span>' +
    '<span><kbd>drag</kbd> look</span>' +
    '<span><kbd>V</kbd> switch view</span>' +
    '<span><kbd>Esc</kbd> exit</span>' +
    '</div>' +
    '<button class="v8-wb-exit" id="v8Exit">Exit walk mode</button>';
  app.appendChild(bar);

  walkBtn.onclick = () => { if (walkMode) exitWalk(); else enterWalk('third'); };
  document.getElementById('v8Exit').onclick = exitWalk;
  document.getElementById('v8First').onclick = () => { if (!walkMode) enterWalk('first'); else setCharCam('first'); };
  document.getElementById('v8Third').onclick = () => { if (!walkMode) enterWalk('third'); else setCharCam('third'); };

  // leaving walk mode when a fixed view is requested
  document.querySelectorAll('.viewbtn').forEach(b => {
    const prev = b.onclick;
    b.onclick = () => { if (walkMode) exitWalk(); if (prev) prev(); };
  });
})();

/* ---------------- character name tag ---------------- */
(function addCharLabel() {
  const tag = document.createElement('div');
  tag.className = 'hotspot v8-charlabel';
  tag.innerHTML = '<span>Field researcher &middot; you</span>';
  document.getElementById('labels').appendChild(tag);
  labelData.push(['Field researcher', [0, 0, 0]]);
  labelEls.push(tag);
})();

/* ---------------- hook the character into the render loop ---------------- */
let lastNow8 = performance.now();
const prevRenderMain8 = renderMain;
renderMain = function (now) {
  const dt = Math.min(0.05, (now - lastNow8) / 1000) || 0.016;
  lastNow8 = now;
  stepSundial(dt);
  if (walkMode) updateCharacter(dt); else idleCharacter(dt);
  applyCharCamera(dt);
  transformCharParts();
  uploadCharParts();
  const li = labelData.length - 1;
  labelData[li][1][0] = CHAR.pos[0];
  labelData[li][1][1] = CHAR.pos[1] + 2.02;
  labelData[li][1][2] = CHAR.pos[2];
  prevRenderMain8(now);
};

/* ---------------- boot ---------------- */
analyzeScene();
buildGroundDetail();
repairGeometry();
buildCharacter();
{ const sp = findSpawn(); CHAR.pos[0] = sp[0]; CHAR.pos[2] = sp[1]; }
CHAR.yaw = 0; CHAR.yawTarget = 0;
CHARCAM.yaw = 0;
animateCharacter(0.016, false);
transformCharParts();
uploadCharParts();
setHeadVisible(true);
window.__v8ao = function (v) { if (v === undefined) return CFG.aoStrength; CFG.aoStrength = v; return CFG.aoStrength; };
window.__v8head = function () {
  let total = 0, shown = 0;
  for (const p of charParts) if (p.bone === 'neck') { total++; if (p.visible) shown++; }
  return { headParts: total, visible: shown };
};
window.__v8cam = function () {
  const e = cameraEye();
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of charParts) for (let i = 0; i < p.posCpu.length; i += 3) {
    for (let a = 0; a < 3; a++) { const v = p.posCpu[i + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
  }
  return {
    eye: e.map(v => +v.toFixed(2)), target: cam.target.map(v => +v.toFixed(2)),
    dist: +cam.dist.toFixed(2), yaw: +cam.yaw.toFixed(2), pitch: +cam.pitch.toFixed(2),
    charBox: mn.map(v => +v.toFixed(2)).join(',') + ' -> ' + mx.map(v => +v.toFixed(2)).join(',')
  };
};
window.__v8look = function (d) {
  if (d) { CHARCAM.dist = d; CHARCAM.curDist = d; }
  if (!walkMode) enterWalk('third'); else snapCharCamera();
  cam.yaw = CHAR.yaw + Math.PI + 0.35;
};
window.__v8 = function () {
  return {
    walkMode: walkMode, cam: CHARCAM.mode, charPos: [+CHAR.pos[0].toFixed(2), +CHAR.pos[2].toFixed(2)],
    speed: +CHAR.speed.toFixed(2), parts: charParts.length, occCells: occCount, grass: groundDetailStats,
    bounds: sceneBounds.lo.map(v => +v.toFixed(1)).join(',') + ' -> ' + sceneBounds.hi.map(v => +v.toFixed(1)).join(','),
    repair: repairStats,
    keysW: !!keys.KeyW, freeSpawn: posFree(0, -9), freeNorth: posFree(0, -8),
    vel: [+CHAR.vx.toFixed(2), +CHAR.vz.toFixed(2)], yaw: +CHARCAM.yaw.toFixed(2)
  };
};

/* ---------------- debug hook ---------------- */
window.__v7 = function () {
  return { quality: qualityMode, sceneW: rtW, sceneH: rtH, canvasW: canvas.width, canvasH: canvas.height, msaa: useMSAA, samples, shadowMap: SH2, bloom: bw + 'x' + bh, ao: useAO, aoRes: aoW + 'x' + aoH, tod: +tod.toFixed(3), weather: weatherKey };
};

} catch (err) {
  console.error('[V0.7 layer] failed:', err);
}
})();
