#ifdef GL_ES
precision mediump float;
#endif

#define TWO_PI 6.28318530718

uniform vec2 u_resolution;
uniform float u_time;

vec3 palette(in float t,in vec3 a,in vec3 b,in vec3 c,in vec3 d){
    return a+b*cos(TWO_PI*(c*t+d));// cosine function to create a smooth transition between colors
}

void main(){
    
    // Define the colors
    vec3 a=vec3(.5,.5,.5);
    vec3 b=vec3(.5,.5,.5);
    vec3 c=vec3(2.,1.,0.);
    vec3 d=vec3(.5,.2,.25);
    
    vec2 st=gl_FragCoord.xy/u_resolution*2.-1.;// Normalized coordinates
    
    vec3 finalColor=vec3(0.);
    
    st.x*=u_resolution.x/u_resolution.y;// Correct the aspect ratio
    
    // original coordinates
    vec2 uv=st;
    
    for(float i=0.;i<4.;i++){
        
        // spacial repetition of the pattern
        st=fract(st*1.7)-.5;
        
        // alternatively, you can use this line:
        //    st = (2.0*gl_FragCoord.xy-u_resolution)/min(u_resolution.x,u_resolution.y);
        
        float ln=(length(st) * exp(-length(uv)));// Distance from the center
        
        // Use the palette function to create a smooth transition between colors
        vec3 color=palette(length(uv)+u_time*.3 + i*.4,a,b,c,d);
        
        // SDF of a circle
        float circle=sin(ln*8.-u_time)/8.;
        circle=abs(circle);// Absolute value of the distance
        //circle = step(0.025, circle); // step is a function that returns 0.0 if the first argument is greater than the second, and 1.0 otherwise
        //circle = smoothstep(0.0, 0.025, circle); // smoothstep is a function that returns 0.0 if the value is less than the first argument, 1.0 if the value is greater than the second argument, and a value between 0.0 and 1.0 if the value is between the two arguments
        
        circle=pow(.001/circle, 0.75);// make it glow by increasing the power
        
        color*=circle;
        
        finalColor+=color*d;
    }
    
    gl_FragColor=vec4(finalColor,1.);
}