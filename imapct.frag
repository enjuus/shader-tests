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
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

// Noise function
float noise(vec2 p){
    return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453123);
}

float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
}


void main(){
    vec2 st=gl_FragCoord.xy/u_resolution*2.-1.;// Normalized coordinates
    
    vec3 finalColor=vec3(random(st),random(st),random(st));
    
    st.x*=u_resolution.x/u_resolution.y;// Correct the aspect ratio
    
    st-=vec2(-.5,-.5);
    
    // circle SDF
    float circle=length(st)-.7;
    float angle=atan(st.y,st.x);
    
    // calculate normals for 3D
    vec3 normal=normalize(vec3(st,sqrt(1.-dot(st,st))));
    vec3 lightDir=normalize(vec3(.3,.3,1.));

    
    // lambertian shading
    float diff=max(dot(normal,lightDir),0.);
    
    vec3 circleColor=vec3(random(st),random(st),random(st)-.15);
    
    vec3 shadedCircleColor=circleColor*diff-(1.*smoothstep(0.,.6,circle));
    
    finalColor=mix(finalColor,shadedCircleColor,1.-smoothstep(0.,.55,circle));


    float line = sdSegment(st,vec2(0.0,0.0),vec2(0.5,0.5));
    
    gl_FragColor=vec4(finalColor,1.);
}