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

        if (!visible && settings.active && (this._preview?.previewType !== "config") && !(this.layer.active
            && this.document.visible && (ui.placeables?.isEntryVisible(this) === false)) || visible && this.document.hidden) {
            this.detectionFilter = detectionFilter ??= DetectionFilter.create();

            return true;
        }

        return visible;
    }
};
