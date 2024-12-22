#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define numSpikes 6.

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float t;
float pulse;
float move;

// HG_SDF

#define saturate(x) clamp(x, 0., 1.)

float vmax(vec3 v) {
	return max(max(v.x, v.y), v.z);
}

// Box: correct distance to corners
float fBox(vec3 p, vec3 b) {
	vec3 d = abs(p) - b;
	return length(max(d, vec3(0))) + vmax(min(d, vec3(0)));
}

// Distance to line segment between <a> and <b>, used for fCapsule() version 2below
float fLineSegment(vec3 p, vec3 a, vec3 b) {
	vec3 ab = b - a;
	float t = saturate(dot(p - a, ab) / dot(ab, ab));
	return length((ab*t + a) - p);
}

// Capsule version 2: between two end points <a> and <b> with radius r 
float fCapsule(vec3 p, vec3 a, vec3 b, float r) {
	return fLineSegment(p, a, b) - r;
}

float fPlane(vec3 p, vec3 n, float distanceFromOrigin) {
    return dot(p, n) + distanceFromOrigin;
}

Plane(vec3 p, vec3 a, vec3 b, vec3 c, vec3 inside, float distanceFromOrigin) {
    vec3 n = normalize(cross(c - b, a - b));
    float d = -dot(a, n);
    
    if (dot(n, inside) + d > 0.) {
        n = -n;
        d = -d;
    }

    return fPlane(p, n, d + distanceFromOrigin);
}

float fOpIntersectionRound(float a, float b, float r) {
	float m = max(a, b);
	if ((-a < r) && (-b < r)) {
		return max(m, -(r - sqrt((r+a)*(r+a) + (r+b)*(r+b))));
	} else {
		return m;
	}
}

// Cone with correct distances to tip and base circle. Y is up, 0 is in the middle of the base.
float fCone(vec3 p, float radius, float height) {
	vec2 q = vec2(length(p.xz), p.y);
	vec2 tip = q - vec2(0, height);
	vec2 mantleDir = normalize(vec2(height, radius));
	float mantle = dot(tip, mantleDir);
	float d = max(mantle, -q.y);
	float projected = dot(tip, vec2(mantleDir.y, -mantleDir.x));
	
	// distance to tip
	if ((q.y > height) && (projected < 0.)) {
		d = max(d, length(tip));
	}
	
	// distance to base ring
	if ((q.x > radius) && (projected > length(vec2(height, radius)))) {
		d = max(d, length(q - vec2(radius, 0)));
	}
	return d;
}

// Rotate around a coordinate axis (i.e. in a plane perpendicular to that axis) by angle <a>.
// Read like this: R(p.xz, a) rotates "x towards z".
// This is fast if <a> is a compile-time constant and slower (but still practical) if not.
void pR(inout vec2 p, float a) {
    p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

// Reflect space at a plane
float pReflect(inout vec3 p, vec3 planeNormal, float offset) {
    float t = dot(p, planeNormal)+offset;
    if (t < 0.) {
        p = p - (2.*t)*planeNormal;
    }
    return sign(t);
}

// The "Round" variant uses a quarter-circle to join the two objects smoothly:
float fOpUnionRound(float a, float b, float r) {
	float m = min(a, b);
	if ((a < r) && (b < r) ) {
		return min(m, r - sqrt((r-a)*(r-a) + (r-b)*(r-b)));
	} else {
	 return m;
	}
}



// Knighty https://www.shadertoy.com/view/XlX3zB


// Barycentric to Cartesian 
vec3 bToC(vec3 A, vec3 B, vec3 C, vec3 barycentric) {
	return barycentric.x * A + barycentric.y * B + barycentric.z * C;
}

int Type=5;

vec3 nc,pab,pbc,pca;
vec3 icoF0;
vec3 icoF1a;
vec3 icoA0;
vec3 icoB0;
vec3 icoC0;
vec3 icoA1;
vec3 icoB1;
vec3 icoC1;
vec3 fold1;
vec3 fold2;
vec3 fold3;
void initIcosahedron() {//setup folding planes and vertex
    float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);//3rd folding plane. The two others are xz and yz planes
	pab=vec3(0.,0.,1.);
	pbc=vec3(scospin,0.,0.5);//No normalization in order to have 'barycentric' coordinates work evenly
	pca=vec3(0.,scospin,cospin);
	pbc=normalize(pbc);	pca=normalize(pca);//for slightly better DE. In reality it's not necesary to apply normalization :) 

    vec3 A = pbc;
    vec3 C = reflect(A, normalize(cross(pab, pca)));
    vec3 B = reflect(C, normalize(cross(pbc, pca)));
    
    icoF0 = pca;
    
	icoA0 = A;
	icoC0 = B;
	icoB0 = C;

    vec3 p1 = bToC(A, B, C, vec3(.5, .0, .5));
    vec3 p2 = bToC(A, B, C, vec3(.5, .5, .0));
    fold1 = normalize(cross(p1, p2));
    
    // Get corners of triangle created by fold
    vec3 A2 = reflect(A, fold1);
    vec3 B2 = p1;
    vec3 C2 = p2;
    
    icoF1a = pca;
    
    icoA1 = A2;
    icoB1 = normalize(B2);
    icoC1 = normalize(C2);
    
    p1 = bToC(A2, B2, C2, vec3(.5, .0, .5));
    p2 = bToC(A2, B2, C2, vec3(.5, .5, .0));
    fold2 = normalize(cross(p1, p2));
    
	p1 = bToC(A2, B2, C2, vec3(.0, .5, .5));
    fold3 = normalize(cross(p2, p1));
}



float pModIcosahedron(inout vec3 p, int subdivisions) {
    p = abs(p);
	pReflect(p, nc, 0.);
    p.xy = abs(p.xy);
	pReflect(p, nc, 0.);
    p.xy = abs(p.xy);
	pReflect(p, nc, 0.);
    
    float i = 0.;
    
    if (subdivisions > 0) {

        // Fold in corner A 
        i += pReflect(p, fold1, 0.) / 2. + .5;
        
        if (subdivisions > 1) {
            
            // Fold in corner A
            pReflect(p, fold2, 0.);
            
            // Fold in corner B
            pReflect(p, fold3, 0.);
        }
    }

    return i;
}

// http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat3 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );       
}

vec3 pRoll(inout vec3 p) {
    pR(p.yx, PI/3.);
    pR(p.yz, PI/-5.);
    mat3 m = rotationMatrix(normalize(icoF1a), t * ((PI*2.)/3.));
    p *= m;
    return p;
}

float fCone(vec3 p, float radius, float height, vec3 direction) {
    p = reflect(p, normalize(mix(vec3(0,1,0), -direction, .5)));
    //p -= vec3(0,height,0);
    return fCone(p, radius, height);
}


float fHolePart(
    vec3 p,
    vec3 a,
    vec3 b,
    vec3 c,
    vec3 d,
    float round,
    float thick
) {
    vec3 center = (a + b + c + d) / 4.;
    float f0 = fPlane(p, a, b, c, center, thick);
    float f1 = fPlane(p, a, c, d, center, thick);
   	float f = f0;
   	f = fOpIntersectionRound(f, f1, round);
   	return f;
}

    
float fHole(
    vec3 p,
    vec3 a,
    vec3 b,
    vec3 c
) {
    float w = 1.;
    float h = 1.;
    float round = .08;
    float thick = .02;

	float d = 1000.;

    vec3 AB = mix(a, b, 0.5);
    vec3 AAB = mix(a, b, w);
    vec3 ABB = mix(a, b, 1. - w);
    vec3 n = normalize(cross(a, b));
    vec3 cn = dot(c, n) * n;
    vec3 AF = c - cn * (1. - h);
    vec3 AF2 = reflect(AF, n);

    float part1 = fHolePart(p, vec3(0), AF2, AAB, AF, round, thick);
	float part2 = fHolePart(p, vec3(0), AF2, ABB, AF, round, thick);
	float hole = fOpIntersectionRound(part1, part2, round);
    return hole;
}

float holes(vec3 p, float i) {
    float d = 1000.;

    if (i > 0.) {  
        return min(d, fHole(p, icoC1, icoB1, icoF1a));
    }
    
    d = min(d, fHole(p, icoC1, icoB1, icoF1a));
    d = min(d, fHole(p, icoA1, icoB1, icoF1a));
    return d;
}


float spikes(vec3 p) {
    float d = 1000.;
    d = min(d, fCone(p, .05, 1.3, icoF1a));
    d = min(d, fCone(p, .05, 1.7, icoA1));
    d = min(d, fCone(p, .05, 1.8, icoB1));
    return d;
}

float shell(vec3 p, float i) {

    float thick = .03;
    float round = .015;

    float d = length(p) - 1.;
    d = fOpUnionRound(d, spikes(p), .12);
    d = max(d, -(length(p) - (1. - thick)));
	float h = holes(p, i);
    h = max(h, (length(p) - 1.1)); // Stop holes clipping spikes
    d = fOpIntersectionRound(d, -h, round);
    return d;
}

float model(vec3 p) {
    pRoll(p);

    float d = 1000.;
    float i = 0.;
 
    i = pModIcosahedron(p, 1);
    d = min(d, shell(p, i)); 
    return d;
}

vec3 doBackground(vec3 rayVec) {
    return vec3(.13);
}


// The MINIMIZED version of https://www.shadertoy.com/view/Xl2XWt


const float MAX_TRACE_DISTANCE = 10.0;           // max trace distance
const float INTERSECTION_PRECISION = 0.001;        // precision of the intersection
const int NUM_OF_TRACE_STEPS = 100;
//const float MAX_STEP_DISTANCE = 0.05;


// checks to see which intersection is closer
// and makes the y of the vec2 be the proper id
vec2 opU( vec2 d1, vec2 d2 ){
    
    return (d1.x<d2.x) ? d1 : d2;
    
}


//--------------------------------
// Modelling 
//--------------------------------
vec2 map( vec3 p ){  
    
    vec2 res = vec2(model(p) ,1.); 
    
    return res;
}



// LIGHTING

float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax )
{
    float res = 1.0;
    float t = mint;
    for( int i=0; i<16; i++ )
    {
        float h = map( ro + rd*t ).x;
        res = min( res, 8.0*h/t );
        t += clamp( h, 0.02, 0.10 );
        if( h<0.001 || t>tmax ) break;
    }
    return clamp( res, 0.0, 1.0 );

}


float calcAO( in vec3 pos, in vec3 nor )
{
    float occ = 0.0;
    float sca = 1.0;
    for( int i=0; i<5; i++ )
    {
        float hr = 0.01 + 0.12*float(i)/4.0;
        vec3 aopos =  nor * hr + pos;
        float dd = map( aopos ).x;
        occ += -(dd-hr)*sca;
        sca *= 0.95;
    }
    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    
}

const float GAMMA = 2.2;

vec3 gamma(vec3 color, float g)
{
    return pow(color, vec3(g));
}

vec3 linearToScreen(vec3 linearRGB)
{
    return gamma(linearRGB, 1.0 / GAMMA);
}

vec3 doLighting(vec3 col, vec3 pos, vec3 nor, vec3 ref, vec3 rd) {

    // lighitng        
    float occ = calcAO( pos, nor );
    vec3  lig = normalize( vec3(-0.6, 0.7, 0.5) );
    float amb = clamp( 0.5+0.5*nor.y, 0.0, 1.0 );
    float dif = clamp( dot( nor, lig ), 0.0, 1.0 );
    float bac = clamp( dot( nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0 )*clamp( 1.0-pos.y,0.0,1.0);
    //float dom = smoothstep( -0.1, 0.1, ref.y );
    float fre = pow( clamp(1.0+dot(nor,rd),0.0,1.0), 2.0 );
    //float spe = pow(clamp( dot( ref, lig ), 0.0, 1.0 ),16.0);
    
    dif *= softshadow( pos, lig, 0.02, 2.5 );
    //dom *= softshadow( pos, ref, 0.02, 2.5 );

    vec3 lin = vec3(0.0);
    lin += 1.20*dif*vec3(.95,0.80,0.60);
    //lin += 1.20*spe*vec3(1.00,0.85,0.55)*dif;
    lin += 0.80*amb*vec3(0.50,0.70,.80)*occ;
    //lin += 0.30*dom*vec3(0.50,0.70,1.00)*occ;
    lin += 0.30*bac*vec3(0.25,0.25,0.25)*occ;
    lin += 0.20*fre*vec3(1.00,1.00,1.00)*occ;
    col = col*lin;

    return col;
}



vec2 calcIntersection( in vec3 ro, in vec3 rd ){

    
    float h =  INTERSECTION_PRECISION*2.0;
    float t = 0.0;
    float res = -1.0;
    float id = -1.;
    
    for( int i=0; i< NUM_OF_TRACE_STEPS ; i++ ){
        
        if( h < INTERSECTION_PRECISION || t > MAX_TRACE_DISTANCE ) break;
        vec2 m = map( ro+rd*t );
        h = m.x;
        //t += min(h, MAX_STEP_DISTANCE);
        t += h;
        id = m.y;
        
    }

    if( t < MAX_TRACE_DISTANCE ) res = t;
    if( t > MAX_TRACE_DISTANCE ) id =-1.0;
    
    return vec2( res , id );
    
}


//----
// Camera Stuffs
//----
mat3 calcLookAtMatrix( in vec3 ro, in vec3 ta, in float roll )
{
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(sin(roll),cos(roll),0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
    return mat3( uu, vv, ww );
}

void doCamera(out vec3 camPos, out vec3 camTar, in float time, in vec2 mouse) {
    vec3 orient = normalize(vec3(.1, 1, 0.));
    float zoom = 4.;
    zoom -= mouse.y * 3.5;
    camPos = zoom * orient;
    camTar = vec3(0);
}


// Calculates the normal by taking a very small distance,
// remapping the function, and getting normal for that
vec3 calcNormal( in vec3 pos ){
    
    vec3 eps = vec3( 0.001, 0.0, 0.0 );
    vec3 nor = vec3(
        map(pos+eps.xyy).x - map(pos-eps.xyy).x,
        map(pos+eps.yxy).x - map(pos-eps.yxy).x,
        map(pos+eps.yyx).x - map(pos-eps.yyx).x );
    return normalize(nor);
}


vec3 render( vec2 res , vec3 ro , vec3 rd ){

  vec3 color = vec3(.04,.045,.05);
    
  if( res.y > -.5 ){
      
    vec3 pos = ro + rd * res.x;
    vec3 norm = calcNormal( pos );
    vec3 ref = reflect(rd, norm);
	//return norm * 0.5 + 0.5;
      
	color = vec3(.5);  
	color = doLighting(color, pos, norm, ref, rd);
  }
   
  return color;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    t = u_time;
    t = mod(t/4., 1.);    

    initIcosahedron();
    
    vec2 p = (-iResolution.xy + 2.0*fragCoord.xy)/iResolution.y;
    vec2 m = iMouse.xy / iResolution.xy;

    vec3 ro = vec3( 0., 0., 2.);
    vec3 ta = vec3( 0. , 0. , 0. );
    
    // camera movement
    doCamera(ro, ta, u_time, m);
    
    // camera matrix
    mat3 camMat = calcLookAtMatrix( ro, ta, 0.0 );  // 0.0 is the camera roll
    
    // create view ray
    vec3 rd = normalize( camMat * vec3(p.xy,2.0) ); // 2.0 is the lens length
    
    vec2 res = calcIntersection( ro , rd  );

    
    vec3 color = render( res , ro , rd );
	color = linearToScreen(color);
    
    fragColor = vec4(color,1.0);
}