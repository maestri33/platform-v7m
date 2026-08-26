Liquid Gold

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = 6.*(( fragCoord.xy-.5* iResolution.xy )/iResolution.y)-.5 ;
    vec2 i = p;
	float c = 0.0;
	float r = length(p+vec2(sin(iTime),sin(iTime*.300+5.))*0.5);
	float d = length(p);
	float rot = d+iTime+p.x*.700; 
	for (float n = 0.0; n < 4.0; n++) {
		p *= mat2(cos(rot-sin(iTime/5.0)), sin(rot), -sin(cos(rot)-iTime), cos(rot))*-0.2;
		float t = r-iTime/(n+3.0);
		i -= p + vec2(cos(t - i.x-r) + sin(t + i.y),sin(t - i.y) + cos(t + i.x)+r);
		c += 1.2/length(vec2((sin(i.x+t)/.15), (cos(i.y+t)/.15)));
	}
	c /= 6.0;
	fragColor = vec4(vec3(c)*vec3(3.0, 2.0, 1.1)-0.35, .1);
}

_____________________

Gradient Waves

#define RM_FACTOR   0.9
#define RM_ITERS     90

float plasma(vec3 r) {
	float mx = r.x + iTime / 0.130;
	mx += 20.0 * sin((r.y + mx) / 20.0 + iTime / 0.810);
	float my = r.y - iTime / 0.200;
	my += 30.0 * cos(r.x / 23.0 + iTime / 0.710);
	return r.z - (sin(mx / 7.0) * 2.25 + sin(my / 3.0) * 2.25 + 5.5);
}

float scene(vec3 r) {
	return plasma(r);
}

float raymarch(vec3 pos, vec3 dir) {
	float dist = 0.0;
	float dscene;

	for (int i = 0; i < RM_ITERS; i++) {
		dscene = scene(pos + dist * dir);
		if (abs(dscene) < 0.1)
			break;
		dist += RM_FACTOR * dscene;
	}

	return dist;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
	float c, s;
	float vfov = 3.14159 / 2.3;

	vec3 cam = vec3(0.0, 0.0, 30.0);

	vec2 uv = (fragCoord.xy / iResolution.xy) - 0.5;
	uv.x *= iResolution.x / iResolution.y;
	uv.y *= -1.0;

	vec3 dir = vec3(0.0, 0.0, -1.0);

	float xrot = vfov * length(uv);

	c = cos(xrot);
	s = sin(xrot);
	dir = mat3(1.0, 0.0, 0.0,
	           0.0,   c,  -s,
	           0.0,   s,   c) * dir;

	c = normalize(uv).x;
	s = normalize(uv).y;
	dir = mat3(  c,  -s, 0.0,
	             s,   c, 0.0,
	           0.0, 0.0, 1.0) * dir;

	c = cos(0.7);
	s = sin(0.7);
	dir = mat3(  c, 0.0,   s,
	           0.0, 1.0, 0.0,
	            -s, 0.0,   c) * dir;

	float dist = raymarch(cam, dir);
	vec3 pos = cam + dist * dir;

	fragColor.rgb = mix(
		vec3(0.4, 0.8, 1.0),
		mix(
			vec3(0.0, 0.0, 1.0),
			vec3(1.0, 1.0, 1.0),
			pos.z / 10.0
		),
		1.0 / (dist / 20.0)
	);
}

_____________________

Web Threads

#define pi 3.14159

// GLOW & SDF FROM https://www.shadertoy.com/view/ldKyW1

float glow(float x, float str, float dist){
    return dist / pow(x, str);
}

// Sinus Signed Distance Function (distance field)
float sinSDF(vec2 st, float A, float offset, float freq, float phi){
    return abs((st.y - offset) + sin(st.x * freq + phi) * A);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    float speed = .4;

    vec3 color = vec3(0.722,0.855,1.000);

    vec2 uv = fragCoord.xy / iResolution.xy;

    float time = iTime/2.0;

    float glowStrength = .6;
    float glowDistance = .02;
    float numWaves = 4.0;

    float col = 0.0;

    for(float i = 0.0; i< numWaves ; i++){
    
        float phase = (iTime * speed + i * 2.0 * pi / numWaves) * abs(.5 - uv.x)/(.5 - uv.x); // Equally spaced waves moving out from middle
        float frequency = 5.0;
        float amplitude = .15 * abs(uv.x - .5) * (1.0 + i); // Middle = 0, increase outward
        float offset = .5;
        
        col += glow(sinSDF(uv, amplitude, offset, frequency, phase), glowStrength, glowDistance);
    }
    
    //col = clamp(abs(.5 - uv.x)/(.5 - uv.x), 0.0, 1.0) + (col * -abs(.5 - uv.x)/(.5 - uv.x));
    
    //EVIL MODE
    //col = 1.0-col;

    // Output to screen
    fragColor = vec4(vec3(col) * color,1.0);
}

_____________________

Topography

// Idea from http://truetex.com/bezint.htm

float n(float i) {
  return 3.*sin(iTime*(sin(i*.03))+i);
}
float bezier(float t, float a, float b, float c, float d) {
  float q = 1.0-t;
  return q*q*q*n(a) + 
        3.*q*q*t*n(b) + 
          3.*q*t*t*n(c) + 
               t*t*t*n(d);
}
float color(vec2 uv) {
  vec2 a = vec2(
    bezier(uv.x, 1., -2., 3., -4.),
    bezier(uv.x, 9., -8., 7., -6.)
  );
  vec2 b = vec2(
    bezier(uv.y, 5., 2., 5., -5.),
    bezier(uv.y, -1., -3., 8., 9.)
  );
  return distance(a, b);
}
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord/res;
    vec2 px = res / 2.0;
    uv = floor(uv * px) / px;
    vec3 col = vec3(1.,1.,.8) - step(fract(color(uv)*4.0), 0.08);
    fragColor = vec4(col, 1.0);
}

____________________


Light Tunnel

float ZGESize = 0.5; // Global settings @separator
float ZGEPositionX = 0.5;
float ZGEPositionY = 0.5;
float ZGEHue = 0.6; // Color settings @separator
float ZGESaturation = 0.8;
float ZGELightness = 0.5;
float ZGEAlpha = 0.0;
bool ZGEWarpTexture = false; // Background settings @separator
bool ZGEUseBGFeedback = true;
float ZGEBGHue = 0.0; 
float ZGEBGSaturation = 0.0;
float ZGEBGLightness = 0.0;
float ZGESpeed = 0.5; // Effect settings @separator
float ZGEWireDensity = 0.5;
float ZGEWireThickness = 0.4;
float ZGEOutlineThickness = 0.3;
float ZGEWaviness = 0.3; 
float ZGERotation = 0.5; 
bool ZGEFlowDirection = true;

vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Derive local variables
    float size = ZGESize * 2.0;
    float posX = ZGEPositionX - 0.5;
    float posY = ZGEPositionY - 0.5;
    float alphaInner = 1.0 - ZGEAlpha;
    float flowDir = ZGEFlowDirection ? 1.0 : -1.0;
    float speedBase = ZGESpeed * 4.0 * flowDir;
    float warpTex = ZGEWarpTexture ? 1.0 : 0.0;
    float useBGFeedback = ZGEUseBGFeedback ? 1.0 : 0.0;
    
    // Scale waviness and rotation
    float waviness = ZGEWaviness * 0.15;
    float rotationOsc = (ZGERotation - 0.5) * 0.5;
    float baseThick = ZGEWireThickness * 0.35 + 0.05;
    float borderWeight = ZGEOutlineThickness * 0.15 + 0.01;
    float cablesCount = floor(ZGEWireDensity * 70.0 + 10.0);
    
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / min(res.y, res.x);
    
    // Global transform
    uv -= vec2(posX, posY);
    uv /= (size + 0.0001);

    float r = length(uv);
    float angle = atan(uv.y, uv.x); 
    float depth = -log(r + 0.0001); 
    
    // Global transform oscillation
    float swing = sin(iTime * (ZGESpeed * 0.5 + 0.1)) * rotationOsc;
    float waveOffset = sin(depth * 1.2 + iTime * speedBase * 0.25) * waviness;
    
    // Coordinate Mapping for fibers
    float angleNormalized = (angle / 6.2831853) + 0.5;
    float finalAngle = fract(angleNormalized + waveOffset + swing);
    
    // Grid Logic
    float cableID = floor(finalAngle * cablesCount);
    float gvX = (fract(finalAngle * cablesCount) - 0.5);
    
    // Per-cable Randoms
    float rand = fract(sin(cableID * 12.9898) * 43758.5453);
    float randSpeed = (0.4 + rand * 0.6) * speedBase;
    float cableHue = mod(ZGEHue + (rand - 0.5) * 0.1, 1.0);
    float cableThick = baseThick * (0.6 + rand * 0.4);
    
    // Animation/Pulse logic
    float scroll = depth + (iTime * randSpeed);
    float pulseFact = fract(scroll);
    
    // Geometry Distances
    float distToCore = abs(gvX);
    
    // Masks
    float wireMask = smoothstep(cableThick, cableThick - 0.05, distToCore);
    float rimGlow = smoothstep(borderWeight, 0.0, abs(distToCore - cableThick));
    
    // Background Color or Texture Selection
    vec3 backCol;
    if (useBGFeedback > 0.0) {
        vec2 texUV;
        if (warpTex > 0.0) {
            texUV = vec2(angle/6.2831853 + 0.5 + waveOffset + swing, depth * 0.2);
        } else {
            texUV = fragCoord / iResolution.xy;
        }
        backCol = texture(iChannel0, texUV).rgb;
    } else {
        backCol = hsl2rgb(vec3(ZGEBGHue, ZGEBGSaturation, ZGEBGLightness));
    }
    
    // Fiber Color Assembly
    float dataPulse = smoothstep(0.2, 0.0, abs(pulseFact - 0.5));
    float hotSpot = smoothstep(0.04, 0.0, abs(pulseFact - 0.52));
    vec3 baseCol = hsl2rgb(vec3(cableHue, ZGESaturation, ZGELightness));
    vec3 fiberCol = (baseCol * rimGlow * 1.3) + ((baseCol * dataPulse * 3.0 + vec3(1.0) * hotSpot * 2.5) * wireMask);
    
    // Depth Fading for the tunnel effect
    float distFade = smoothstep(0.0, 0.2, r) * smoothstep(1.6, 0.7, r);
    
    // Mix Logic: 
    // fiberLayer represents the cables themselves
    float fiberMask = clamp(wireMask + rimGlow, 0.0, 1.0) * distFade;
    
    // Final color: Background is always visible, fibers fade in based on Alpha
    // We mix from the raw background to the "fiber tunnel" using our alpha and mask
    vec3 finalCol = mix(backCol, fiberCol, fiberMask * alphaInner);

    fragColor = vec4(finalCol, 1.0);
}


______________________


Sliced Waves

#define SIZE 12.
#define STROKE_WEIGHT .2
#define t iTime
#define s smoothstep

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    vec3 col = vec3(0);

    vec2 gv = fract(uv * SIZE);
    vec2 id = floor(uv * SIZE);

    float startPos = .5 - STROKE_WEIGHT / 2.;
    float endPos = -.5 + STROKE_WEIGHT / 2.;

    float mv = sin(t + id.x * SIZE + cos(id.y)) * .5 + .5;
    float pos = mix(startPos, endPos, mv);
    col += abs(gv.y - .5 + pos) - STROKE_WEIGHT * .5;

    float sf = .01;
    col = s(sf, -sf, col);

    fragColor = vec4(col,1.0);
}

------------------------

Acid Squares

void mainImage(out vec4 o, vec2 u) {
    float i, s;
    vec3 p,r = iResolution;
    for(o *=i; i++<32.;s = .002 + abs(s)*.3, o += 1. / s)
        p += vec3((u+u-r.xy)/r.y/2. * s, s),
        s +=1e1-length(p.xz)+length(ceil(p).xy);
   o = tanh( abs(vec4(2,5,1,0) / dot(cos(iTime+p),vec3(.2)))*o/6e4);
}

------------------------

Scanner

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord*2.-iResolution.xy)/iResolution.y;
    uv *= sin(uv.y+iTime*2.)/sin(uv*67.);
    
    float d = length(cos(atan(uv*50.)));
    
    float r = d; r *= abs(sin(iTime)+2.);
    float g = d; g *= abs(cos(iTime)+2.);
    float b = d; b *= abs(atan(iTime)+2.);
    
    fragColor = vec4(r,g,b,1.0);
}

------------------------

