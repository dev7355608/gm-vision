export default class DetectionFilter extends foundry.canvas.rendering.filters.AbstractBaseFilter {
    /** @override */
    static vertexShader = `\
        attribute vec2 aVertexPosition;

        uniform vec4 inputSize;
        uniform vec4 outputFrame;
        uniform mat3 projectionMatrix;
        uniform vec2 origin;
        uniform mediump float thickness;

        varying vec2 vTextureCoord;
        varying float vOffset;

        void main() {
            vTextureCoord = (aVertexPosition * outputFrame.zw) * inputSize.zw;
            vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.0)) + outputFrame.xy;
            vec2 offset = position - origin;
            vOffset = (offset.x + offset.y) / (1.414213562373095 * 2.0 * thickness);
            gl_Position = vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
        }
    `;

    /** @override */
    static fragmentShader = `\
        varying vec2 vTextureCoord;
        varying float vOffset;

        uniform sampler2D uSampler;
        uniform mediump float thickness;

        void main() {
            float x = abs(vOffset - floor(vOffset + 0.5)) * 2.0;
            float y0 = clamp((x + 0.5) * thickness + 0.5, 0.0, 1.0);
            float y1 = clamp((x - 0.5) * thickness + 0.5, 0.0, 1.0);
            float y = y0 - y1;
            float alpha = texture2D(uSampler, vTextureCoord).a * 0.25;
            gl_FragColor = vec4(y, y, y, 1.0) * alpha;
        }
    `;

    /** @override */
    static defaultUniforms = {
        origin: { x: 0.0, y: 0.0 },
        thickness: 1.0,
    };

    /** @override */
    apply(filterManager, input, output, clearMode, currentState) {
        const uniforms = this.uniforms;
        const worldTransform = currentState.target.worldTransform;

        uniforms.origin.x = worldTransform.tx;
        uniforms.origin.y = worldTransform.ty;
        uniforms.thickness = 4 * canvas.dimensions.uiScale * canvas.stage.scale.x;

        super.apply(filterManager, input, output, clearMode, currentState);
    }
}
