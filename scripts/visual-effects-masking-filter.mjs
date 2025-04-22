/**
 * @type {(VisualEffectsMaskingFilter: typeof foundry.canvas.rendering.filters.VisualEffectsMaskingFilter) => typeof foundry.canvas.rendering.filters.VisualEffectsMaskingFilter}
 */
export default (VisualEffectsMaskingFilter) => class extends VisualEffectsMaskingFilter {
    /** @override */
    static defaultUniforms = {
        ...super.defaultUniforms,
        gmVision: false,
    };

    /** @override */
    static fragmentHeader = `
        ${super.fragmentHeader}

        uniform bool gmVision;
    `;

    /** @override */
    static fragmentPostProcess(postProcessModes) {
        return `
            ${super.fragmentPostProcess(postProcessModes)}

            if (mode == ${this.FILTER_MODES.ILLUMINATION} && gmVision) {
                finalColor.rgb = sqrt(finalColor.rgb) * 0.5 + 0.5;
            }
        `;
    }
};
