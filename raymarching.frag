#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define numCylinders 63

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// Noise function
float noise(vec2 p){
    return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453123);
}

float sphere(vec3 p,float r){
    return length(p)-r;
}

float distance_from_sphere(vec3 p,vec3 c,float r){
    return length(p-c)-r;
}

float unionSDF(float distA,float distB){
    return min(distA,distB);
}

float intersectSDF(float distA,float distB){
    return max(distA,distB);
}

float differenceSDF(float distA,float distB){
    return max(distA,-distB);
}

float random(vec3 st){
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

// Hash function for generating pseudo-random numbers
float hash(float n){
    return fract(sin(n)*43758.5453123);
}

// Generate a random unit vector on the sphere
vec3 randomDirection(float seed){
    float phi=hash(seed)*6.28318;// Random azimuth angle [0, 2*pi]
    float cosTheta=hash(seed+1.)*2.-1.;// Random elevation angle [-1, 1]
    float sinTheta=sqrt(1.-cosTheta*cosTheta);
    return vec3(cos(phi)*sinTheta,sin(phi)*sinTheta,cosTheta);
}

vec3 biasedRandomDirection(float seed, vec3 biasDir, float biasStrength) {
    // Generate a random unit vector
    vec3 randomDir = randomDirection(seed);

    // Interpolate between the random direction and the bias direction
    vec3 direction = normalize(mix(randomDir, biasDir, biasStrength));
    return direction;
}

float cylinderSDF(vec3 p,vec3 axis,float radius){
    vec3 d=p-dot(p,axis)*axis;// Project `p` onto the plane perpendicular to the axis
    return length(d)-radius;
}

float radialCylindersSDF(vec3 p,float sphereRadius,float cylinderRadius,float cylinderLength){
    float s=sphere(p,sphereRadius);
    vec3 biasDir=vec3(0.,0.,1.);// Bias direction (e.g., up)
    float biasStrength=7.5;// Bias strength
    
    // Initialize minimum distance (for blending)
    float d=s;
    
    // Loop through cylinders arranged radially
    for(int i=0;i<numCylinders;i++){
        float angle=float(i)*6.28318/float(numCylinders);// Divide evenly in 360 degrees
        
        // Generate a random direction for the cylinder
        vec3 randomDir = biasedRandomDirection(float(i)+(.3), biasDir-angle, biasStrength*1.15);
        
        vec3 cylinderOrigin=randomDir*(sphereRadius+cylinderLength);
        
        // Define the cylinder's orientation (e.g., rotate around Y-axis)
        //vec3 axis=normalize(vec3(cos(angle),sin(angle),0.));
        
        // Move the cylinder origin outward from the sphere surface
        //vec3 cylinderOrigin=axis*(sphereRadius+cylinderLength*.5);
        
        // Transform point `p` into the cylinder's local space
        vec3 localP=p-cylinderOrigin;
        
        // Create a cylinder oriented along the axis
        d=min(d,cylinderSDF(localP,randomDir,cylinderRadius));
    }
    return d;
}

float map_the_world(vec3 p)
{
    float radialCylinders=radialCylindersSDF(p,1.,.005,.001);
    
    return radialCylinders;
}

vec3 calculate_normal(in vec3 p)
{
    const vec3 small_step=vec3(.001,0.,0.);
    
    float gradient_x=map_the_world(p+small_step.xyy)-map_the_world(p-small_step.xyy);
    float gradient_y=map_the_world(p+small_step.yxy)-map_the_world(p-small_step.yxy);
    float gradient_z=map_the_world(p+small_step.yyx)-map_the_world(p-small_step.yyx);
    
    vec3 normal=vec3(gradient_x,gradient_y,gradient_z);
    
    return normalize(normal);
}

vec3 raymarch(vec3 ro,vec3 rd){
    float total_distance_travelled=0.;
    const int NUMBER_OF_STEPS=32;
    const float MINIMUM_HIT_DISTANCE=.001;
    const float MAXIMUM_TRACE_DISTANCE=1000.;
    
    for(int i=0;i<NUMBER_OF_STEPS;i++){
        // calculate our current position along the ray
        vec3 current_position=ro+total_distance_travelled*rd;
        // calculate the distance to the scene
        float distance_to_closest=map_the_world(current_position);
        
        if(distance_to_closest<MINIMUM_HIT_DISTANCE){
            // For now, hard-code the light's position in our scene
            vec3 light_position=vec3(4.,-5.,3.);
            
            // Calculate the unit direction vector that points from
            // the point of intersection to the light source
            vec3 direction_to_light=normalize(current_position-light_position);
            
            vec3 normal=calculate_normal(current_position);
            
            float diffuse_intensity=max(0.,dot(normal,direction_to_light));
            
            // Remember, each component of the normal will be in
            // the range -1..1, so for the purposes of visualizing
            // it as an RGB color, let's remap it to the range
            // 0..1
            float normalColor=random(current_position);
            return vec3(normalColor+.55, normalColor-.1, normalColor+.0)*diffuse_intensity;
            
        }
        
        // miss
        if(total_distance_travelled>MAXIMUM_TRACE_DISTANCE)
        {
            break;
        }
        
        // accumulate the distance travelled
        total_distance_travelled+=distance_to_closest;
    }
    
    return vec3(random(rd)-.75);
}

void main(){
    // Normalized coordinates
    vec2 st=gl_FragCoord.xy/u_resolution*2.-1.;
    // Correct the aspect ratio
    st.x*=u_resolution.x/u_resolution.y;
    
    // camera
    vec3 camera_position=vec3(0.,0.,-4.);
    vec3 ro=camera_position;
    vec3 rd=vec3(st,1.);
    
    // background
    vec3 finalColor=vec3(.1);
    
    vec3 color=raymarch(ro,rd);
    
    finalColor=color;
    
    gl_FragColor=vec4(finalColor,1.);
}