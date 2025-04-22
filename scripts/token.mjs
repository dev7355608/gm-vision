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

        if (!visible && settings.active || visible && this.document.hidden) {
            this.detectionFilter = detectionFilter ??= DetectionFilter.create();

            return true;
        }

        return visible;
    }
};
