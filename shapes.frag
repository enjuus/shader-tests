// Author:
// Title:
#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
float y;

float plot(vec2 st,float pct){
    return smoothstep(pct-.02,pct,st.y)-
    smoothstep(pct,pct+.02,st.y);
}

void main(){
    vec2 st=gl_FragCoord.xy/u_resolution;

    float x = (st.x);
    
    float y=sin(st.x*PI);// return x
     
    vec3 color=vec3(y,1.,.2);
    
    float pct=plot(st,y);
    color=(1.1)*color+pct*vec3(1.0, 1.0, 1.0);
    
    gl_FragColor=vec4(color,1.0);
}