#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution; // Screen resolution
uniform vec2 u_center;     // Orb center
uniform float u_time;      // Time for animation

// Noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Function to create smooth spherical gradient
float sphere(vec2 uv, vec2 center, float radius) {
    float dist = length(uv - center);
    return smoothstep(radius, radius - 0.01, dist); // Soft edges
}

void main() {
    // Normalized coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 center = u_center / u_resolution;
    vec2 diff = uv - center;

    // Distance and angle calculations
    float dist = length(diff);
    float angle = atan(diff.y, diff.x);

    // Simulate 3D shading for the orb
    float radius = 0.25; // Orb size
    float orb = sphere(uv, center, radius);

    // Add fake lighting (shading)
    vec2 lightDir = normalize(vec2(-0.5, 1.0)); // Light source direction
    float shading = dot(normalize(diff), lightDir);
    shading = mix(0.8, 1.2, shading) * orb; // Brighten/darken based on angle

    // Radiating lines
    float lineFrequency = 40.0; // Number of lines
    float lineThickness = 0.005; // Line width
    float lines = smoothstep(lineThickness, 0.0, abs(sin(angle * lineFrequency + noise(vec2(angle, u_time)))));

    // Perspective on lines (fade with distance)
    float perspective = smoothstep(0.0, 0.8, dist);
    lines *= perspective * (1.0 - orb); // Lines shouldn't overlap the orb itself

    // Add noise to lines
    float stipple = noise(uv * 200.0 + u_time * 0.5);
    lines *= mix(0.9, 1.1, stipple);

    // Color the lines based on angle
    float normalizedAngle = (angle + 3.14159265359) / (2.0 * 3.14159265359); // Map angle to [0, 1]
    vec3 colorStart = vec3(1.0, 0.2, 0.2); // Red
    vec3 colorEnd = vec3(0.2, 0.2, 1.0);   // Blue
    vec3 lineColor = mix(colorStart, colorEnd, normalizedAngle);

    // Apply line intensity to the color
    vec3 lineFinalColor = lineColor * lines;

    // Combine effects
    vec3 color = vec3(0.0);
    color += vec3(0.8, 0.2, 0.2) * orb * shading; // Orb color with shading
    color += lineFinalColor; // Apply the colored lines

    gl_FragColor = vec4(color, 1.0);
}