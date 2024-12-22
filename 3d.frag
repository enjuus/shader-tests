#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define numLines 6.

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float random(vec2 st){
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123+(.3));
}

// Noise function
float noise(vec2 p){
    return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453123);
}

float sdSegment(in vec2 p,in vec2 a,in vec2 b)
{
    vec2 pa=p-a,ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
    return length(pa-ba*h);
}

void main(){
    vec2 st=gl_FragCoord.xy/u_resolution*2.-1.;// Normalized coordinates
    
    vec3 finalColor=vec3(random(st)-.7,random(st)-.7,random(st)-.7);
    
    st.x*=u_resolution.x/u_resolution.y;// Correct the aspect ratio
    
    st-=vec2(-.0,+.0);
    
    // circle SDF
    float circle=length(st)-.3+.1*sin(1.);
    float circle2=length(st)-.6+.3;
    float circle3=length(st)-.7;
    
    // calculate normals for 3D
    vec3 normal=normalize(vec3(st,sqrt(1.-dot(st,st))));
    vec3 lightDir=normalize(vec3(.7,.5,.3));
    
    // lambertian shading
    float diff=max(dot(normal,lightDir),0.);
    
    vec3 circleColor=vec3(random(st),random(st)+.33,random(st)-.25);
    
    vec3 shadedCircleColor=circleColor*diff-(1.*smoothstep(0.,.7,circle));
    vec3 shadedCircleColor2=circleColor*diff-(1.*smoothstep(0.,.7,circle2));
    
    float flare=max(0.,5.-abs(st.x*st.y*u_resolution.x*1.));
    float flare2=max(0.,90.3-abs(st.y*st.x*u_resolution.y*1.3));
    
    finalColor=mix(finalColor,shadedCircleColor,1.-smoothstep(0.,.035,circle3));
    finalColor=mix(finalColor,shadedCircleColor2,1.-smoothstep(0.,.055,circle2));
    finalColor=mix(finalColor,vec3(random(st)-.3),flare2);
    
    finalColor=mix(finalColor,shadedCircleColor,1.-smoothstep(0.,.005,circle));
    finalColor=mix(finalColor,vec3(random(st)-.45),flare);
    
    gl_FragColor=vec4(finalColor,1.);
}