import DetectionFilter from "./detection-filter.mjs";
import settings from "./settings.mjs";

/** @type {DetectionFilter|undefined} */
let detectionFilter;

/**
 * @type {(Token: typeof foundry.canvas.placeables.Token) => typeof foundry.canvas.placeables.Token}
 */
export default (Token) => class extends Token {
    /** @override */
    get isVisible() {
        const visible = super.isVisible;

        if (!visible || this.document.hidden) {
            this.detectionFilter = detectionFilter ??= DetectionFilter.create();
        }

        if (!visible && settings.active && this._preview?.previewType !== "config"
            && canvas.effects.visionSources.some((s) => s.active) && !this.isFilteredOut && !this._testCulled?.()) {
            return true;
        }

        return visible;
    }
};
